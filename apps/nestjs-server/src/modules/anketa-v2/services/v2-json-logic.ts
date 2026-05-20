import type { V2JsonLogicValue } from "@smart-anketa/api-contract";
import {
	apply,
	isJsonLogicTruthy,
	toFiniteNumberOrNull,
	type JsonLogicData,
} from "@smart-anketa/json-logic-ts";

export type { JsonLogicData };
export { isJsonLogicTruthy, toFiniteNumberOrNull };

export function applyJsonLogic(
	rule: V2JsonLogicValue,
	data: JsonLogicData = {},
): unknown {
	return apply(rule, data);
}
