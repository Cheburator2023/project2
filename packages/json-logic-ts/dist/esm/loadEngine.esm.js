import "./logic.js";
function unwrapEngine(mod) {
    if (mod &&
        typeof mod === "object" &&
        typeof mod.apply === "function") {
        return mod;
    }
    const nested = mod?.default;
    if (nested &&
        typeof nested === "object" &&
        typeof nested.apply === "function") {
        return nested;
    }
    throw new Error("@smart-anketa/json-logic-ts: failed to load logic.js");
}
/** Bundler/browser-safe loader (no node:module). */
export const jsonLogic = unwrapEngine(globalThis.jsonLogic);
