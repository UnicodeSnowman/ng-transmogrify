import recast from "recast";

export default function(fileString) {
  const ast = recast.parse(fileString);
  return recast.prettyPrent(ast).code;
}
