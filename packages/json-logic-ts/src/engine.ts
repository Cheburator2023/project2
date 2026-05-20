import type { JsonLogicData, JsonLogicEngine, JsonLogicRule } from "./types";

let jsonLogic!: JsonLogicEngine;

export function bindEngine(engine: JsonLogicEngine): void {
	jsonLogic = engine;
}

export function apply(rule: JsonLogicRule, data: JsonLogicData = {}): unknown {
	return jsonLogic.apply(rule, data);
}

/** Alias used by the JsonLogic builder UI. */
export const applyLogic = apply;

export function addOperation(
	name: string,
	fn: (...args: unknown[]) => unknown,
): void {
	jsonLogic.add_operation(name, fn);
}

export function removeOperation(name: string): void {
	jsonLogic.rm_operation(name);
}

export function usesOperations(rule: JsonLogicRule): string[] {
	return jsonLogic.uses(rule);
}

export function isLogic(rule: unknown): boolean {
	return jsonLogic.is_logic(rule);
}

export function getEngine(): JsonLogicEngine {
	return jsonLogic;
}
