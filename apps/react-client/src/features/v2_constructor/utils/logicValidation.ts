import type { ErrorSchema } from "@rjsf/utils";
import type { RJSFSchema } from "@rjsf/utils";
import type {
	V2LogicRuleDto,
	V2ValidationIssueDto,
	V2ValidationIssueLevel,
} from "@smart-anketa/api-contract";
import { normalizeJsonPointer, pointerSegments } from "./schemaPaths";
import { resolveSchemaNode } from "./schemaMutators";
import { evaluateRuleCondition } from "./logicPreview";

export type LogicValidationIssue = V2ValidationIssueDto & {
	ruleId?: string;
};

function readValidationMessage(rule: V2LogicRuleDto): string {
	const payload = (rule.payload ?? {}) as Record<string, unknown>;
	for (const key of ["message", "text", "error"] as const) {
		const v = payload[key];
		if (typeof v === "string" && v.trim()) return v.trim();
	}
	return rule.description?.trim() || "Проверка не пройдена";
}

function readValidationLevel(rule: V2LogicRuleDto): V2ValidationIssueLevel {
	const payload = (rule.payload ?? {}) as Record<string, unknown>;
	const raw = payload.level;
	if (raw === "warning" || raw === "info" || raw === "error") return raw;
	return "error";
}

/** Поля, скрытые правилами visibility (и их потомки). */
export function resolveHiddenFieldPointers(
	rules: V2LogicRuleDto[],
	formData: Record<string, unknown>,
): Set<string> {
	const hidden = new Set<string>();
	for (const rule of rules) {
		if (rule.kind !== "visibility") continue;
		const rawTarget = rule.targetPath?.trim();
		if (!rawTarget || rawTarget === "/") continue;
		const pointer = normalizeJsonPointer(
			rawTarget.startsWith("/") ? rawTarget : `/${rawTarget}`,
		);
		if (!evaluateRuleCondition(rule.condition, formData)) {
			hidden.add(pointer);
		}
	}
	return hidden;
}

/** Дополняет множество путями с `ui:hidden: true` в preview uiSchema. */
export function mergeStaticHiddenFromPreviewUi(
	hidden: Set<string>,
	ui: Record<string, unknown>,
): Set<string> {
	const next = new Set(hidden);
	const walk = (branch: Record<string, unknown>, prefix: string) => {
		for (const [key, value] of Object.entries(branch)) {
			if (key.startsWith("ui:")) continue;
			const path = prefix ? `${prefix}/${key}` : `/${key}`;
			if (value && typeof value === "object" && !Array.isArray(value)) {
				const leaf = value as Record<string, unknown>;
				if (leaf["ui:hidden"] === true) next.add(path);
				walk(leaf, path);
			}
		}
	};
	walk(ui, "");
	return next;
}

function isPointerHidden(pointer: string, hidden: Set<string>): boolean {
	for (const h of hidden) {
		if (pointer === h || pointer.startsWith(`${h}/`)) return true;
	}
	return false;
}

/**
 * Правила `validation`: ошибка, если условие **ложно**.
 * Скрытые поля (visibility) не проверяются.
 */
export function evaluateLogicValidationRules(
	rules: V2LogicRuleDto[],
	formData: Record<string, unknown>,
	options?: {
		jsonSchema?: RJSFSchema;
		hiddenPointers?: Set<string>;
	},
): LogicValidationIssue[] {
	const hidden =
		options?.hiddenPointers ?? resolveHiddenFieldPointers(rules, formData);
	const issues: LogicValidationIssue[] = [];

	for (const rule of rules) {
		if (rule.kind !== "validation") continue;

		const rawTarget = rule.targetPath?.trim();
		if (!rawTarget || rawTarget === "/") continue;

		const pointer = normalizeJsonPointer(
			rawTarget.startsWith("/") ? rawTarget : `/${rawTarget}`,
		);

		if (options?.jsonSchema) {
			const segs = pointerSegments(pointer);
			if (
				segs.length === 0 ||
				resolveSchemaNode(options.jsonSchema, segs) === undefined
			) {
				continue;
			}
		}

		if (isPointerHidden(pointer, hidden)) continue;

		const passes = evaluateRuleCondition(rule.condition, formData);
		if (passes) continue;

		issues.push({
			ruleId: rule.id,
			level: readValidationLevel(rule),
			code: `logic.validation.${rule.id}`,
			message: readValidationMessage(rule),
			path: pointer,
		});
	}

	return issues;
}

/** RJSF `extraErrors` из JSON Pointer. */
export function logicValidationIssuesToExtraErrors(
	issues: LogicValidationIssue[],
): ErrorSchema {
	const root: Record<string, unknown> = {};

	for (const issue of issues) {
		const pointer = issue.path?.trim();
		if (!pointer || pointer === "/") continue;

		const segs = pointerSegments(pointer);
		if (segs.length === 0) continue;

		let cur = root;
		for (let i = 0; i < segs.length; i++) {
			const key = segs[i]!;
			if (i === segs.length - 1) {
				const prev =
					cur[key] && typeof cur[key] === "object" && !Array.isArray(cur[key])
						? (cur[key] as Record<string, unknown>)
						: {};
				const prevErrors = Array.isArray(prev.__errors)
					? (prev.__errors as string[])
					: [];
				cur[key] = { ...prev, __errors: [...prevErrors, issue.message] };
			} else {
				const next =
					cur[key] && typeof cur[key] === "object" && !Array.isArray(cur[key])
						? (cur[key] as Record<string, unknown>)
						: {};
				cur[key] = next;
				cur = next;
			}
		}
	}

	return root as ErrorSchema;
}
