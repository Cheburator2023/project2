import type {
	V2JsonLogicValue,
	V2LogicRuleDto,
	V2ValidationIssueDto,
	V2ValidationIssueLevel,
} from "@smart-anketa/api-contract";
import { applyJsonLogic, isJsonLogicTruthy } from "./v2-json-logic";

function normalizePointer(pointer: string): string {
	if (!pointer) return "/";
	const trimmed = pointer.trim();
	if (!trimmed || trimmed === "/") return "/";
	return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function pointerSegments(pointer: string): string[] {
	return normalizePointer(pointer).split("/").filter(Boolean);
}

function evaluateCondition(
	condition: V2JsonLogicValue,
	formData: Record<string, unknown>,
): boolean {
	try {
		return isJsonLogicTruthy(applyJsonLogic(condition, formData));
	} catch {
		return false;
	}
}

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

export function resolveHiddenFieldPointers(
	rules: V2LogicRuleDto[],
	formData: Record<string, unknown>,
): Set<string> {
	const hidden = new Set<string>();
	for (const rule of rules) {
		if (rule.kind !== "visibility") continue;
		const rawTarget = rule.targetPath?.trim();
		if (!rawTarget || rawTarget === "/") continue;
		const pointer = normalizePointer(rawTarget);
		if (!evaluateCondition(rule.condition as V2JsonLogicValue, formData)) {
			hidden.add(pointer);
		}
	}
	return hidden;
}

function isPointerHidden(pointer: string, hidden: Set<string>): boolean {
	for (const h of hidden) {
		if (pointer === h || pointer.startsWith(`${h}/`)) return true;
	}
	return false;
}

export function evaluateLogicValidationRules(
	rules: V2LogicRuleDto[],
	formData: Record<string, unknown>,
): V2ValidationIssueDto[] {
	const hidden = resolveHiddenFieldPointers(rules, formData);
	const issues: V2ValidationIssueDto[] = [];

	for (const rule of rules) {
		if (rule.kind !== "validation") continue;

		const rawTarget = rule.targetPath?.trim();
		if (!rawTarget || rawTarget === "/") continue;

		const pointer = normalizePointer(rawTarget);
		if (isPointerHidden(pointer, hidden)) continue;

		if (!evaluateCondition(rule.condition as V2JsonLogicValue, formData)) {
			issues.push({
				level: readValidationLevel(rule),
				code: `logic.validation.${rule.id}`,
				message: readValidationMessage(rule),
				path: pointer,
			});
		}
	}

	return issues;
}
