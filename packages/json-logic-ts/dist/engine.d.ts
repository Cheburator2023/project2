import type { JsonLogicData, JsonLogicEngine, JsonLogicRule } from "./types";
export declare function bindEngine(engine: JsonLogicEngine): void;
export declare function apply(rule: JsonLogicRule, data?: JsonLogicData): unknown;
/** Alias used by the JsonLogic builder UI. */
export declare const applyLogic: typeof apply;
export declare function addOperation(name: string, fn: (...args: unknown[]) => unknown): void;
export declare function removeOperation(name: string): void;
export declare function usesOperations(rule: JsonLogicRule): string[];
export declare function isLogic(rule: unknown): boolean;
export declare function getEngine(): JsonLogicEngine;
