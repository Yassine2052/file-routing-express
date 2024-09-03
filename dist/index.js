var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// index.ts
var file_routing_express_exports = {};
__export(file_routing_express_exports, {
  add: () => add
});
module.exports = __toCommonJS(file_routing_express_exports);
function add(...nums) {
  return nums.reduce((acc, num) => acc + num, 0);
}
console.log(add(1, -1, 2, 18, -20));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  add
});
