import logicModule from "./logic.js";
import type { JsonLogicEngine } from "./types";

function unwrapEngine(mod: unknown): JsonLogicEngine {
	if (
		mod &&
		typeof mod === "object" &&
		typeof (mod as JsonLogicEngine).apply === "function"
	) {
		return mod as JsonLogicEngine;
	}
	const nested = (mod as { default?: unknown })?.default;
	if (
		nested &&
		typeof nested === "object" &&
		typeof (nested as JsonLogicEngine).apply === "function"
	) {
		return nested as JsonLogicEngine;
	}
	throw new Error("@smart-anketa/json-logic-ts: failed to load logic.js");
}

/** Bundler/browser-safe loader (no node:module). */
export const jsonLogic = unwrapEngine(logicModule);
