import type {
	CalculationItem,
	TaskTriggerItem,
} from "@react-client/features/v2/admin_constructor/utils/calculationEngine";
import {
	formatComputedNumber,
	pointerToVarPath,
} from "@react-client/features/v2/admin_constructor/utils/calculationEngine";
import type { V2LogicRuleDto } from "@smart-anketa/api-contract";
import { sumTypicalWorkTotals } from "./anketaModalArrayTableConfig";

export type PathCalculationInfluence = {
	asOperandIn: Array<{
		ruleId: string;
		label: string;
		role: string;
		value: number | null;
	}>;
	asDependencyOf: Array<{
		ruleId: string;
		label: string;
		kind: string;
		passes?: boolean;
	}>;
	generatedRowsAt?: { rowCount: number; sumTotal: number | null };
};

export function pathMatchesInfluence(pathKey: string, candidate: string): boolean {
	if (!pathKey || !candidate) return false;
	if (pathKey === candidate) return true;
	return (
		pathKey.startsWith(`${candidate}.`) || candidate.startsWith(`${pathKey}.`)
	);
}

export function buildCalculationInfluenceByPath(
	items: CalculationItem[] | undefined,
	taskTriggers: TaskTriggerItem[] | undefined,
	logicRules: V2LogicRuleDto[] | undefined,
): Map<string, PathCalculationInfluence> {
	const map = new Map<string, PathCalculationInfluence>();
	const safeItems = Array.isArray(items) ? items : [];
	const safeTriggers = Array.isArray(taskTriggers) ? taskTriggers : [];
	const safeRules = Array.isArray(logicRules) ? logicRules : [];

	const ensure = (path: string): PathCalculationInfluence => {
		let entry = map.get(path);
		if (!entry) {
			entry = { asOperandIn: [], asDependencyOf: [] };
			map.set(path, entry);
		}
		return entry;
	};

	for (const item of safeItems) {
		for (const operand of item.operands ?? []) {
			if (!operand.varPath) continue;
			ensure(operand.varPath).asOperandIn.push({
				ruleId: item.ruleId,
				label: item.label,
				role: item.role,
				value: operand.value,
			});
		}
		if (item.targetVarPath) {
			ensure(item.targetVarPath).asOperandIn.push({
				ruleId: item.ruleId,
				label: `→ ${item.label}`,
				role: item.role,
				value: item.value,
			});
		}
	}

	for (const trigger of safeTriggers) {
		const rule = safeRules.find((entry) => entry.id === trigger.ruleId);
		for (const dependency of rule?.dependencies ?? []) {
			const varPath = pointerToVarPath(dependency);
			if (!varPath) continue;
			ensure(varPath).asDependencyOf.push({
				ruleId: trigger.ruleId,
				label: trigger.label,
				kind: rule?.kind ?? "task_trigger",
				passes: trigger.passes,
			});
		}
	}

	return map;
}

export function lookupPathInfluence(
	map: Map<string, PathCalculationInfluence>,
	pathKey: string,
): PathCalculationInfluence | null {
	const direct = map.get(pathKey);
	if (direct) return direct;

	const merged: PathCalculationInfluence = {
		asOperandIn: [],
		asDependencyOf: [],
	};
	let found = false;

	for (const [candidate, influence] of map) {
		if (!pathMatchesInfluence(pathKey, candidate)) continue;
		found = true;
		merged.asOperandIn.push(...influence.asOperandIn);
		merged.asDependencyOf.push(...influence.asDependencyOf);
	}

	return found ? merged : null;
}

export function attachTypicalWorkRowInfluence(
	map: Map<string, PathCalculationInfluence>,
	liveFormData: Record<string, unknown> | undefined,
	paths: string[],
): void {
	if (!liveFormData) return;

	for (const path of paths) {
		const rows = readArrayAtPath(liveFormData, path) as Record<string, unknown>[];
		if (rows.length === 0) continue;
		const entry = map.get(path) ?? { asOperandIn: [], asDependencyOf: [] };
		entry.generatedRowsAt = {
			rowCount: rows.length,
			sumTotal: sumTypicalWorkTotals(rows),
		};
		map.set(path, entry);
	}
}

export function formatPathInfluenceHint(
	influence: PathCalculationInfluence,
): string {
	const parts: string[] = [];

	if (influence.asDependencyOf.length > 0) {
		const triggers = influence.asDependencyOf
			.map((entry) => {
				const mark =
					entry.passes === false ? " ✗" : entry.passes ? " ✓" : "";
				return `${entry.label}${mark}`;
			})
			.join(", ");
		parts.push(`триггеры: ${triggers}`);
	}

	if (influence.generatedRowsAt) {
		parts.push(
			`строк: ${influence.generatedRowsAt.rowCount}, Σ=${formatComputedNumber(influence.generatedRowsAt.sumTotal)} ч/д`,
		);
	}

	if (influence.asOperandIn.length > 0) {
		const calc = influence.asOperandIn
			.slice(0, 4)
			.map(
				(entry) =>
					`${entry.label}=${formatComputedNumber(entry.value)}`,
			)
			.join("; ");
		parts.push(`calc: ${calc}`);
	}

	return parts.join(" · ");
}

function readArrayAtPath(data: Record<string, unknown>, path: string): unknown[] {
	const value = path.split(".").reduce<unknown>((cur, key) => {
		if (!cur || typeof cur !== "object" || Array.isArray(cur)) return undefined;
		return (cur as Record<string, unknown>)[key];
	}, data);
	return Array.isArray(value) ? value : [];
}
