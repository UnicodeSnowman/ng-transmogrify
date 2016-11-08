import recast from "recast";
import path from "path";
import fs from "fs";
import { filesInDirectory, isAngularModule } from "./utils";

function isPotentialDependency(obj) {
  return ["ExpressionStatement", "ExportDefaultDeclaration"].includes(obj.type);
}

function getInjectableTypeSuffix(node) {
  if (node.callee.property.name === "filter") {
    return "Filter"
  } else {
    return "";
  }
}

// TODO this is hideous... fixme
function getInjectableNames(statements = []) {
  return statements.map((statement) => {
    switch (statement.type) {
      case "ExpressionStatement":
        if (isAngularModule(statement.expression)) {
          return `${statement.expression.arguments[0].value}${getInjectableTypeSuffix(statement.expression)}`;
        } else {
          return undefined;
        }
      case "ExportDefaultDeclaration":
        let callExpression;
        if (statement.declaration.type === "MemberExpression") {
          callExpression = statement.declaration.object;
        } else {
          callExpression = statement.declaration;
        }
        return `${callExpression.arguments[0].value}${getInjectableTypeSuffix(callExpression)}`;
      default:
        return undefined;
    }
  });
}

function buildDependencyMap(directory) {
  const result = filesInDirectory(directory).reduce((acc, file) => {
    try {
      const ast = recast.parse(fs.readFileSync(file));
      const potentialDependencies = ast.program.body.filter(isPotentialDependency);

      if (!potentialDependencies.length) {
        return acc;
      }

      const moduleNames = getInjectableNames(potentialDependencies).filter((val) => val);

      if (moduleNames.length) {
        moduleNames.forEach((moduleName) => {
          acc[moduleName] = file;
        })
      } else {
        acc[`ERROR: ${file}`] = file;
      }

      return acc;
    } catch(err) {
      acc[`ERROR: ${JSON.stringify(err)}`] = file;
      return acc;
    }
  }, {});
  return result;
}

export default buildDependencyMap;
