export type JsonLogicPrimitive = string | number | boolean | null;

export type JsonLogicRule =
	| JsonLogicPrimitive
	| JsonLogicRule[]
	| { [operator: string]: JsonLogicRule | JsonLogicRule[] };

export type JsonLogicData = Record<string, unknown> | unknown[];

export interface JsonLogicEngine {
	apply(rule: JsonLogicRule, data?: JsonLogicData): unknown;
	add_operation(name: string, fn: (...args: unknown[]) => unknown): void;
	rm_operation(name: string): void;
	uses(data: JsonLogicRule): string[];
	rule_like(rule: JsonLogicRule, pattern: unknown): boolean;
	is_logic(rule: unknown): boolean;
}
