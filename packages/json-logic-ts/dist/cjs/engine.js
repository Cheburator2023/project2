"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyLogic = void 0;
exports.bindEngine = bindEngine;
exports.apply = apply;
exports.addOperation = addOperation;
exports.removeOperation = removeOperation;
exports.usesOperations = usesOperations;
exports.isLogic = isLogic;
exports.getEngine = getEngine;
let jsonLogic;
function bindEngine(engine) {
    jsonLogic = engine;
}
function apply(rule, data = {}) {
    return jsonLogic.apply(rule, data);
}
/** Alias used by the JsonLogic builder UI. */
exports.applyLogic = apply;
function addOperation(name, fn) {
    jsonLogic.add_operation(name, fn);
}
function removeOperation(name) {
    jsonLogic.rm_operation(name);
}
function usesOperations(rule) {
    return jsonLogic.uses(rule);
}
function isLogic(rule) {
    return jsonLogic.is_logic(rule);
}
function getEngine() {
    return jsonLogic;
}
