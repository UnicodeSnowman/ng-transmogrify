import { expect } from "chai";
import fs from "fs";
import path from "path";
import transmogrify from "../src/transmogrify";

function getFileString(filename) {
  return fs.readFileSync(path.resolve(__dirname, "../assets/", filename)).toString();
}

describe("transmogrify", () => {
  let dependencyMap;
  beforeEach (() => {
    dependencyMap = {
      something: "something",
      dependencyA: "something_a",
      dependencyB: "something_b"
    };
  });

  it("should translate a normal angular module", () => {
    const fileString = getFileString("angular_module.js");
    const transformedFileString = getFileString("angular_module_transformed.js");
    expect(transmogrify(fileString, dependencyMap)).to.equal(transformedFileString.trim());
  });

  it("should not modify an already transformed module", () => {
    const fileString = getFileString("exported_angular_module.js");
    const transformedFileString = getFileString("exported_angular_module_transformed.js");
    expect(transmogrify(fileString, dependencyMap)).to.equal(transformedFileString.trim());
  });
});
