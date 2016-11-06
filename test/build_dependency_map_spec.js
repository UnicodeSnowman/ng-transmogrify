import { expect } from "chai";
import path from "path";
import buildDependencyMap from "../src/build_dependency_map";

describe("buildDependencyMap", () => {
  it("should construct a map of dependency name to path", () => {
    expect(buildDependencyMap(`${path.resolve(__dirname, "../", "assets/dependencies")}`)).to.equal({
      dependencyA: `${path.resolve(__dirname, "../", "assets/dependencies/dependency_a.js")}`,
      dependencyB: `${path.resolve(__dirname, "../", "assets/dependencies/dependency_b.js")}`,
      dependencyC: `${path.resolve(__dirname, "../", "assets/dependencies/dependency_c.js")}`
    });
  });
});
