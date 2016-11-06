import blah from "blah";

const value = {};
value.thing = () => {};
value.thing();

angular.module("application").factory("dependencyC", (thingA, thingB) => {
  return {};
});
