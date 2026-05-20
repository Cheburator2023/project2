import { applyLogic as applyLogicEngine } from "@smart-anketa/json-logic-ts";
import type { JsonLogicValue } from "./operators";
import type { JsonLogicData } from "./components/json-logic-builder";

export { default } from "./components/json-logic-builder";
export type { JsonLogicData, JsonLogicBuilderProps } from "./components/json-logic-builder";
export { JsonLogicShell } from "./styles/JsonLogicShell";
export { OPERATORS, FIELD_TYPES } from "./operators";
export type { FieldType, Operator, JsonLogicValue } from "./operators";
export { rule } from "./builder";
export { validate } from "./validator";
export type { ValidationError, ValidationResult } from "./validator";

export const applyLogic = applyLogicEngine as (
	rule: JsonLogicValue,
	data?: JsonLogicValue | JsonLogicData,
) => unknown;
