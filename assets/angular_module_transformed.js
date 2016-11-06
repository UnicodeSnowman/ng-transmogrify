import dependencyBModule from "something_b";
import dependencyAModule from "something_a";
import something from "something";
const blah = {};
blah.test = () => {};
blah.test();

export default angular.module("myFactory", [dependencyAModule, dependencyBModule]).factory("myFactory", (dependencyA, dependencyB) => {
  return {};
}).name;

class Test {}
