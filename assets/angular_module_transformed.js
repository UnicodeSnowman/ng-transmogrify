import angularUiRouterModule from "angular-ui-router";
import dependencyBModule from "./something_b";
import dependencyAModule from "./assets/something_a_directory/something_a";
import something from "something";
const blah = {};
blah.test = () => {};
blah.test();

export default angular.module("myFactory", [dependencyAModule, dependencyBModule, angularUiRouterModule]).factory("myFactory", (dependencyA, dependencyB, $state, $stateParams) => {
  return {};
}).name;

class Test {}
