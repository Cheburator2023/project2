import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { V2LogicRuleDto } from "@smart-anketa/api-contract";
import type { JsonLogicValue } from "react-json-logic";
import { applyLogic } from "react-json-logic";
import { pointerSegments } from "./schemaPaths";
import { resolveSchemaNode, toggleRequiredAtPointer } from "./schemaMutators";
import {
	evaluateComputedRules,
	evaluateTaskTriggers,
	type CalculationItem,
	type TaskTriggerItem,
} from "./calculationEngine";

type UiBranch = Record<string, unknown>;

/** JsonLogic результат → «истина» для правил интерфейса. */
export function jsonLogicTruthy(value: unknown): boolean {
	if (value === true) return true;
	if (value === false || value === null || value === undefined) return false;

	if (typeof value === "number") {
		return Number.isFinite(value) && value !== 0;
	}

	if (typeof value === "string") {
		return value.length > 0;
	}

	return true;
}

export function evaluateRuleCondition(
	condition: V2LogicRuleDto["condition"],
	formData: unknown,
): boolean {
	try {
		return jsonLogicTruthy(
			applyLogic(condition as JsonLogicValue, formData as never),
		);
	} catch {
		return false;
	}
}

function mergeUiLeaf(
	ui: UiBranch,
	fieldPointer: string,
	patch: UiBranch,
): UiBranch {
	let pointer = fieldPointer.trim();

	if (!pointer || pointer === "/") return ui;

	if (!pointer.startsWith("/")) pointer = `/${pointer}`;

	const segs = pointerSegments(pointer);

	if (segs.length === 0) return ui;

	const next = structuredClone(ui);

	let cur: UiBranch = next;

	for (let i = 0; i < segs.length; i++) {
		const s = segs[i]!;

		if (i === segs.length - 1) {
			const prev = (cur[s] as UiBranch) ?? {};
			cur[s] = { ...prev, ...patch };

			const leaf = cur[s] as UiBranch;

			if (Object.keys(leaf).length === 0) delete cur[s];
		} else {
			cur[s] = (cur[s] as UiBranch) ?? {};
			cur = cur[s] as UiBranch;
		}
	}

	return next;
}

function deleteUiLeafKey(
	ui: UiBranch,
	fieldPointer: string,
	key: string,
): UiBranch {
	let pointer = fieldPointer.trim();

	if (!pointer || pointer === "/") return ui;

	if (!pointer.startsWith("/")) pointer = `/${pointer}`;

	const segs = pointerSegments(pointer);

	if (segs.length === 0) return ui;

	const next = structuredClone(ui);

	let cur: UiBranch = next;

	for (let i = 0; i < segs.length - 1; i++) {
		const s = segs[i]!;
		const child = cur[s];

		if (!child || typeof child !== "object" || Array.isArray(child)) return ui;

		cur = child as UiBranch;
	}

	const leafKey = segs[segs.length - 1]!;
	const leafRaw = cur[leafKey];

	if (!leafRaw || typeof leafRaw !== "object" || Array.isArray(leafRaw))
		return next;

	const leaf = { ...(leafRaw as UiBranch) };

	delete leaf[key];

	if (Object.keys(leaf).length === 0) delete cur[leafKey];
	else cur[leafKey] = leaf;

	return next;
}

/**
 * Превью для RJSF: статические схемы + результат правил **visibility**, **required** и **hint**
 * над текущим `formData`.
 */
export type DerivePreviewResult = {
	previewSchema: RJSFSchema;
	previewUiSchema: UiSchema;
	calculationItems: CalculationItem[];
	taskTriggerItems: TaskTriggerItem[];
	liveFormData: Record<string, unknown>;
};

export type DerivePreviewOptions = {
	/** После POST /calculate — visibility/hint используют обогащённые данные. */
	computedLiveData?: Record<string, unknown>;
	calculationItems?: CalculationItem[];
	taskTriggerItems?: TaskTriggerItem[];
};

export function derivePreviewSchemas(
	jsonSchema: RJSFSchema,
	uiSchema: UiSchema,
	rules: V2LogicRuleDto[],
	formData: Record<string, unknown>,
	options?: DerivePreviewOptions,
): DerivePreviewResult {
	let previewSchema = structuredClone(jsonSchema) as RJSFSchema;

	let previewUiRaw = structuredClone(uiSchema) as UiBranch;

	const useBackendCalc = options?.computedLiveData !== undefined;

	const { liveData, items: localCalculationItems } = useBackendCalc
		? {
				liveData: { ...options.computedLiveData },
				items: options.calculationItems ?? [],
			}
		: evaluateComputedRules(rules, formData);

	const calculationItems = useBackendCalc
		? (options.calculationItems ?? [])
		: localCalculationItems;

	const taskTriggerItems = useBackendCalc
		? (options.taskTriggerItems ?? [])
		: evaluateTaskTriggers(rules, liveData);

	for (const rule of rules) {
		if (
			rule.kind === "computed" ||
			rule.kind === "row_computed" ||
			rule.kind === "task_trigger"
		)
			continue;
		const passes = evaluateRuleCondition(rule.condition, liveData);

		const rawTarget = rule.targetPath?.trim();

		if (!rawTarget || rawTarget === "/") continue;

		const pointer = rawTarget.startsWith("/") ? rawTarget : `/${rawTarget}`;
		const segs = pointerSegments(pointer);

		if (
			segs.length === 0 ||
			resolveSchemaNode(jsonSchema, segs) === undefined
		) {
			continue;
		}

		if (rule.kind === "visibility") {
			if (!passes) {
				previewUiRaw = mergeUiLeaf(previewUiRaw, pointer, {
					"ui:hidden": true,
				});
			} else {
				previewUiRaw = deleteUiLeafKey(previewUiRaw, pointer, "ui:hidden");
			}
		} else if (rule.kind === "required" && passes) {
			const nextSchema = toggleRequiredAtPointer(previewSchema, pointer, true);

			if (nextSchema) previewSchema = nextSchema;
		} else if (
			rule.kind === "hint" &&
			passes &&
			rule.payload &&
			typeof rule.payload === "object"
		) {
			const p = rule.payload as { text?: unknown; hint?: unknown };
			const text =
				typeof p.text === "string"
					? p.text
					: typeof p.hint === "string"
						? p.hint
						: "";

			if (text.trim()) {
				previewUiRaw = mergeUiLeaf(previewUiRaw, pointer, {
					"ui:help": text,
				});
			}
		}
	}

	return {
		previewSchema,
		previewUiSchema: previewUiRaw as UiSchema,
		calculationItems,
		taskTriggerItems,
		liveFormData: liveData,
	};
}
