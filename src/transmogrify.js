import recast from "recast";

export default function(fileString, dependencyMap) {
  const ast = recast.parse(fileString);
  return recast.prettyPrint(ast, { tabWidth: 2 }).code.trim();
}
