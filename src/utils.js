import { execSync } from "child_process";

export function filesInDirectory(directory) {
  return execSync(`find ${directory} -name "*.js"`)
    .toString()
    .split("\n")
    .map((filename) => filename.trim())
    .filter((filename) => filename.length);
}
