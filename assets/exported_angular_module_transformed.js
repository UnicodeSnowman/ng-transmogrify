import something from "something";
import dependencyAModule from "something";
import dependencyBModule from "something";

export default angular.module("myFactory", [
  dependencyAModule,
  dependencyBModule
]).factory("myFactory", (dependencyA, dependencyB) => {
  return {};
}).name;
