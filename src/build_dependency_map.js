import recast from "recast";
import path from "path";
import fs from "fs";
import { filesInDirectory } from "./utils";

function getInjectableNames(ast) {
  const angularModules = [];
  recast.visit(ast, {
    visitCallExpression: function(path) {
      const { object, property } = path.node.callee;
      if (property && ["controller", "factory", "directive", "service", "filter"].includes(property.name)) {
        const memberExpression = object.callee;
        if (memberExpression && memberExpression.object.name === "angular" && memberExpression.property.name === "module") {
          const dependencyName = path.node.arguments[0].value
          const suffix = property.name === "filter" ? "Filter" : "";
          angularModules.push(`${dependencyName}${suffix}`);
        }
      }
      this.traverse(path);
    }
  });

  return angularModules;
}

function buildDependencyMap(directory) {
  const result = filesInDirectory(directory).reduce((acc, file) => {
    try {
      const ast = recast.parse(fs.readFileSync(file));
      const moduleNames = getInjectableNames(ast);

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
