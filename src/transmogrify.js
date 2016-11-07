import recast from "recast";
import { isAngularModule } from "./utils";
import path from "path";
import { flow, filter, map, forEach, camelCase, invert, mapValues, groupBy } from "lodash/fp";
const mapValuesWithKey = mapValues.convert({ cap: false });
const forEachWithKey = forEach.convert({ cap: false });

const {
  importDeclaration,
  importDefaultSpecifier,
  exportDefaultDeclaration,
  literal,
  memberExpression,
  identifier,
  arrayExpression
} = recast.types.builders;

function getInjectionIdentifiers(args = []) {
  return args[args.length - 1].params
}

function buildES6Import(identifier, path) {
  return importDeclaration(
    [importDefaultSpecifier(identifier)],
    literal(path)
  );
}

function resolvePath(pathToDependency, currentFilePath) {
  let resolvedPath;

  if (pathToDependency.indexOf("~") === 0) {
    // is a node_modules import
    resolvedPath = pathToDependency.slice(1);
  } else {
    resolvedPath = path.relative(currentFilePath, pathToDependency)
    if (resolvedPath.indexOf(".") !== 0) {
      // a relative import. path.relative does not add `./` for files
      // in the same directory, which we need here
      resolvedPath = `./${resolvedPath}`;
    }
  }

  if (resolvedPath.indexOf(".js") >= 0) {
    resolvedPath = resolvedPath.slice(0, -3);
  }

  return resolvedPath;
}

function transformModule({ ast, bodyIndex, dependencyMap, filepath }) {
  const { expression } = ast.program.body[bodyIndex];

  // de-dupe dependencies
  const dependencies = flow(
    getInjectionIdentifiers,
    filter(({ name }) => dependencyMap[name]),
    map("name"),
    groupBy((key) => dependencyMap[key]),
    mapValuesWithKey((dependencyIdentifiers, importPath) => {
      if (dependencyIdentifiers.length > 1) {
        // assume this is an import from node_modules, slice off the `~`
        return camelCase(importPath.slice(1));
      } else {
        return dependencyIdentifiers[0]
      }
    }),
    invert
  )(expression.arguments)

  // import dependencies
  forEachWithKey((pathToDependency, dependencyName) => {
    const resolvedPath = resolvePath(pathToDependency, filepath)
    ast.program.body.unshift(buildES6Import(identifier(`${dependencyName}Module`), resolvedPath));
    bodyIndex++;
  })(dependencies);

  // add dependencies to module
  const dependencyIdentifiers = Object.keys(dependencies)
    .map((name) => identifier(`${name}Module`));

  expression.callee.object.arguments[0] = expression.arguments[0];
  expression.callee.object.arguments.push(arrayExpression(dependencyIdentifiers));

  ast.program.body[bodyIndex] =
    exportDefaultDeclaration(memberExpression(expression, identifier("name")));

  return ast;
}

function transformSpec({ ast, bodyIndex, dependencyMap, filepath }) {
  return ast;
}

export default function(fileString, filepath, dependencyMap) {
  let ast = recast.parse(fileString);
  const transform = filepath.indexOf("_spec.js") >= 0 ? transformSpec : transformModule;

  // TODO will take first index of an angular module found... likely need to handle
  // case where we have multiple angular modules in the file
  let angularModuleIndex = ast.program.body.findIndex((statement) => isAngularModule(statement.expression));

  if (angularModuleIndex >= 0) {
    ast = transform({
      ast,
      bodyIndex: angularModuleIndex,
      dependencyMap,
      filepath
    });
  } else {
    console.log(`Unable to transform file: ${filepath}`)
  }

  return recast.prettyPrint(ast, {
    tabWidth: 2,
    reuseWhitespace: true
  }).code.trim();
}
