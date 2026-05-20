let jsonLogic;
export function bindEngine(engine) {
    jsonLogic = engine;
}
export function apply(rule, data = {}) {
    return jsonLogic.apply(rule, data);
}
/** Alias used by the JsonLogic builder UI. */
export const applyLogic = apply;
export function addOperation(name, fn) {
    jsonLogic.add_operation(name, fn);
}
export function removeOperation(name) {
    jsonLogic.rm_operation(name);
}
export function usesOperations(rule) {
    return jsonLogic.uses(rule);
}
export function isLogic(rule) {
    return jsonLogic.is_logic(rule);
}
export function getEngine() {
    return jsonLogic;
}
