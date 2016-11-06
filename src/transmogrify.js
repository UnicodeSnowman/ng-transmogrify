import recast from "recast";
import { isAngularModule } from "./utils";
import path from "path";

const {
  importDeclaration,
  importDefaultSpecifier,
  exportDefaultDeclaration,
  literal,
  memberExpression,
  identifier,
  arrayExpression
} = recast.types.builders;

function getInjectionIdentifiers(args) {
  return args[args.length - 1].params
}

function buildES6Import(identifier, path) {
  return importDeclaration(
    [importDefaultSpecifier(identifier)],
    literal(path)
  );
}

function transformModule(ast, angularModuleIndex, dependencyMap) {
  const expression = ast.program.body[angularModuleIndex].expression;
  const dependencyIdentifiers = getInjectionIdentifiers(expression.arguments)
    .filter(({ name }) => dependencyMap[name])
    .map(({ name }) => identifier(`${name}Module`));

  // import dependencies
  getInjectionIdentifiers(expression.arguments)
    .filter(({ name }) => dependencyMap[name])
    .map(({ name }) => name)
    .forEach((dependencyName) => {
      // TODO BUILD RELATIVE path
      // const relativePath = path.relative(moduleNameMap[moduleName], moduleNameMap[expression.name])
      ast.program.body.unshift(buildES6Import(identifier(`${dependencyName}Module`), dependencyMap[dependencyName]));
      angularModuleIndex++;
    });

  // add dependencies to module
  expression.callee.object.arguments[0] = expression.arguments[0];
  expression.callee.object.arguments.push(arrayExpression([].concat(dependencyIdentifiers)));

  ast.program.body[angularModuleIndex] =
    exportDefaultDeclaration(memberExpression(expression, identifier("name")));

  return ast;
}

export default function(fileString, dependencyMap) {
  let ast = recast.parse(fileString);
  let angularModuleIndex = ast.program.body.findIndex((statement) => isAngularModule(statement.expression));

  if (angularModuleIndex >= 0) {
    ast = transformModule(ast, angularModuleIndex, dependencyMap);
  }

  return recast.prettyPrint(ast, {
    tabWidth: 2,
    reuseWhitespace: true
  }).code.trim();
}
