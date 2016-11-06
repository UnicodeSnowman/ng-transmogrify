import { execSync } from "child_process";

export function isAngularModule(expression) {
  const callee =
    expression &&
    expression.callee &&
    expression.callee &&
    expression.callee.object &&
    expression.callee.object.callee;
  return !!(callee && callee.object.name === "angular" && callee.property.name === "module");
}

export function filesInDirectory(directory) {
  return execSync(`find ${directory} -name "*.js"`)
    .toString()
    .split("\n")
    .map((filename) => filename.trim())
    .filter((filename) => filename.length);
}
