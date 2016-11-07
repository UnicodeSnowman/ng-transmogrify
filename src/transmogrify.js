import recast from "recast";
import { isAngularModule } from "./utils";
import path from "path";
import { flow, filter, map, forEach, camelCase, invert, mapValues, groupBy } from "lodash/fp";
const mapValuesWithKey = mapValues.convert({ cap: false });
const forEachWithKey = forEach.convert({ cap: false });

const {
  callExpression,
  expressionStatement,
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

function buildES6Import(dependencyName, path) {
  return importDeclaration(
    [importDefaultSpecifier(identifier(`${dependencyName}Module`))],
    literal(path)
  );
}

function resolvePath(pathToDependency, currentFilePath) {
  let resolvedPath;

  if (pathToDependency.indexOf("~") === 0) {
    // is a node_modules import
    resolvedPath = pathToDependency.slice(1);
  } else {
    resolvedPath = path.relative(path.dirname(currentFilePath), pathToDependency)
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

function dedupeDependencies(identifiers, dependencyMap) {
  return flow(
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
  )(identifiers);
}


function transformModule({ ast, bodyIndex, dependencyMap, filepath }) {
  const { expression } = ast.program.body[bodyIndex];

  // de-dupe dependencies
  const dependencies = dedupeDependencies(getInjectionIdentifiers(expression.arguments), dependencyMap)

  // import dependencies
  forEachWithKey((pathToDependency, dependencyName) => {
    const resolvedPath = resolvePath(pathToDependency, filepath)
    ast.program.body.unshift(buildES6Import(dependencyName, resolvedPath));
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

function transformSpec({ ast, dependencyMap, filepath }) {
  let dependencyIdentifiers;
  let injectParentBody = [];
  recast.visit(ast, {
    visitIdentifier: function(path) {
      if (path.value.name === "inject") {
        dependencyIdentifiers = path.parentPath.node.arguments[0].params;
        // here at path.value.name === "inject", we are at
        // inject((a, b) => {
        //   ...
        // });
        //
        // i.e.
        //
        // BlockStatement > ExpressionStatement > CallExpression > Identifier
        // so to get us to the body of the surrounding block statement, we need:
        // path.parentPath.parentPath.parentPath.node.body
        injectParentBody = path.parentPath.parentPath.parentPath.node.body;
        this.abort();
      } else {
        this.traverse(path);
      }
    }
  });

  const dependencies = dedupeDependencies(dependencyIdentifiers, dependencyMap);

  const angularMockModule = callExpression(
    identifier("angular.mock.module"),
    Object.keys(dependencies).map((name) => identifier(`${name}Module`))
  );

  injectParentBody.unshift(expressionStatement(angularMockModule));

  forEachWithKey((pathToDependency, dependencyName) => {
    const resolvedPath = resolvePath(pathToDependency, filepath)
    ast.program.body.unshift(buildES6Import(dependencyName, resolvedPath));
  })(dependencies);

  return ast;
}

export default function(fileString, filepath, dependencyMap) {
  let ast = recast.parse(fileString);

  if (filepath.indexOf("_spec.js") >= 0) {
    ast = transformSpec({
      ast,
      dependencyMap,
      filepath
    })
  } else {
    // TODO will take first index of an angular module found... likely need to handle
    // case where we have multiple angular modules in the file
    let angularModuleIndex = ast.program.body.findIndex((statement) => isAngularModule(statement.expression));

    if (angularModuleIndex >= 0) {
      ast = transformModule({
        ast,
        bodyIndex: angularModuleIndex,
        dependencyMap,
        filepath
      });
    } else {
      console.log(`Unable to transform file: ${filepath}`)
    }
  }

  return recast.prettyPrint(ast, {
    tabWidth: 2,
    reuseWhitespace: true
  }).code.trim();
}
