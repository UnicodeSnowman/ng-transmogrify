import something from "something";
import dependencyAModule from "something_a";
import dependencyBModule from "something_b";

export default angular.module("myFactory", [dependencyAModule, dependencyBModule]).factory("myFactory", (dependencyA, dependencyB) => {
  return {};
}).name;
