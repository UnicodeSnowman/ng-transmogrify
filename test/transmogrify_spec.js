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
      dependencyA: `${path.resolve(__dirname, "../assets/something_a_directory/something_a.js")}`,
      dependencyB: `${path.resolve(__dirname, "../something_b.js")}`,
      $state: "~angular-ui-router",
      $stateParams: "~angular-ui-router",
      htInputFormatArea: `${path.resolve(__dirname, "../app/common/ht_input_format_area.js")}`,
      Lookup: `${path.resolve(__dirname, "../app/common/lookup.js")}`
    };
  });

  it("should translate a normal angular module", () => {
    const fileString = getFileString("angular_module.js");
    const transformedFileString = getFileString("angular_module_transformed.js");
    expect(transmogrify(fileString, path.resolve(__dirname, "../assets"), dependencyMap)).to.equal(transformedFileString.trim());
  });

  it("should not modify an already transformed module", () => {
    const fileString = getFileString("exported_angular_module.js");
    const transformedFileString = getFileString("exported_angular_module_transformed.js");
    expect(transmogrify(fileString, path.resolve(__dirname, "../assets"), dependencyMap)).to.equal(transformedFileString.trim());
  });

  it("should transform a spec", () => {
    const fileString = getFileString("some_spec.js");
    const transformedFileString = getFileString("some_spec_transformed.js");
    expect(transmogrify(fileString, path.resolve(__dirname, "../assets/some_spec.js"), dependencyMap)).to.equal(transformedFileString.trim());
  });
});
