import thingAModule from "thing_a_module";
import thingBModule from "thing_b_module";

export default angular.module("dependencyB", [
  thingAModule,
  thingBModule
]).factory("dependencyB", (thingA, thingB) => {
  return {};
}).name;
