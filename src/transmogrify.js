import recast from "recast";
import path from "path";
import {
  flatten,
  flow,
  filter,
  map,
  forEach,
  camelCase,
  reduce,
  invert,
  mapValues,
  groupBy
} from "lodash/fp";
import readlineSync from "readline-sync";
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

export function isAngularModule(expression) {
  const callee =
    expression &&
    expression.callee &&
    expression.callee &&
    expression.callee.object &&
    expression.callee.object.callee;
  return !!(callee && callee.object.name === "angular" && callee.property.name === "module");
}

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
    map(({ name }) => {
      if (name[0] === "_" && name[name.length - 1] === "_") {
        return name.slice(1, name.length - 1);
      } else {
        return name;
      }
    }),
    filter((name) => dependencyMap[name]),
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

function transformModule({ ast, dependencyMap, filepath }) {
  let angularModuleIndices = ast.program.body.reduce((acc, statement, index) => {
    if (isAngularModule(statement && statement.expression)) {
      return acc.concat(index);
    }
    return acc;
  }, []);

  if (!angularModuleIndices.length) {
    console.log(`No angular modules found, unable to convert ${filepath}`);
    return ast;
  }

  if (angularModuleIndices.length > 1) {
    readlineSync.question(`Multiple Angular module declarations found in ${filepath} at indices: ${angularModuleIndices}, please be sure to manually intervene here...`)
  }

  // de-dupe dependencies
  const moduleDependencies = angularModuleIndices.map((index) => {
    const { expression } = ast.program.body[index];
    return {
      index,
      dependencies: dedupeDependencies(getInjectionIdentifiers(expression.arguments), dependencyMap)
    }
  });

  // add dependencies to each module
  forEach(({ index, dependencies }) => {
    const { expression } = ast.program.body[index];
    const dependencyIdentifiers = Object.keys(dependencies)
      .map((name) => identifier(`${name}Module`));

    expression.callee.object.arguments[0] = expression.arguments[0];
    expression.callee.object.arguments.push(arrayExpression(dependencyIdentifiers));

    ast.program.body[index] =
      exportDefaultDeclaration(memberExpression(expression, identifier("name")));
  })(moduleDependencies);

  // import dependencies
  flow(
    reduce((acc, { dependencies }) => Object.assign({}, acc, dependencies), {}),
    forEachWithKey((pathToDependency, dependencyName) => {
      const resolvedPath = resolvePath(pathToDependency, filepath)
      ast.program.body.unshift(buildES6Import(dependencyName, resolvedPath));
    })
  )(moduleDependencies);

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
        if (injectParentBody == null) {
          console.log("FAIL", filepath);
        }
        this.abort();
      } else {
        this.traverse(path);
      }
    }
  });

  const dependencies = dedupeDependencies(dependencyIdentifiers, dependencyMap);

  if (Object.keys(dependencies).length) {
    const angularMockModule = callExpression(
      identifier("angular.mock.module"),
      Object.keys(dependencies).map((name) => identifier(`${name}Module`))
    );

    injectParentBody.unshift(expressionStatement(angularMockModule));
  }

  forEachWithKey((pathToDependency, dependencyName) => {
    const resolvedPath = resolvePath(pathToDependency, filepath)
    ast.program.body.unshift(buildES6Import(dependencyName, resolvedPath));
  })(dependencies);

  return ast;
}

export default function(fileString, filepath, dependencyMap) {
  const ast = recast.parse(fileString);
  const transform = filepath.indexOf("_spec.js") >= 0 ? transformSpec : transformModule;
  return recast.prettyPrint(transform({ ast, dependencyMap, filepath }), { tabWidth: 2 }).code.trim();
}
