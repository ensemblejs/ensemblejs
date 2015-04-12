var deferDep = function (dep) {
  return function () {
    return dep;
  };
};

var plugins = {}
var definePlugin = function (name, func) {
  plugins[name] = func;
};

var getDefinedPlugin = function (name) {
  return plugins[name]();
};

module.exports = {
  deferDep: deferDep,
  definePlugin: definePlugin,
  getDefinedPlugin: getDefinedPlugin
};