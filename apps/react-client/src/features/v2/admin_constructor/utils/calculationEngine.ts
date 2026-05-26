import type { V2LogicRuleDto } from "@smart-anketa/api-contract";
import {
	applyLogic,
	type JsonLogicValue,
} from "@react-client/features/v2/jsonLogicBuilder";
import {
	jsonPointerToFormDataVarPath,
	normalizeJsonPointer,
	pointerSegments,
} from "./schemaPaths";

export type ComputedFormulaKind =
	| "multiply"
	| "sum"
	| "priority_first"
	| "max"
	| "min";

export type ComputedRuleRole =
	| "typical_total"
	| "atypical_total"
	| "grand_total"
	| "coefficient"
	| "stage_value"
	| "other";

export type ComputedRulePayload = {
	role?: ComputedRuleRole;
	label?: string;
	formulaHint?: string;
	mode?: "preset" | "expert";
	kind?: ComputedFormulaKind;
	operands?: string[];
	weightSourceLabel?: string;
};

export type TaskTriggerPayload = {
	mode?: "generated_rows";
	taskCode?: string;
	label?: string;
	hint?: string;
	sourceArrayPath?: string;
	outputArrayPath?: string;
	tasks?: Array<{
		taskCode?: string;
		label?: string;
		name?: string;
		reason?: string;
		estimateHoursPerDay?: number;
		coefficient?: number;
		match?: Record<string, unknown>;
	}>;
};

export type CalculationItem = {
	ruleId: string;
	targetPointer: string;
	targetVarPath: string;
	label: string;
	role: ComputedRuleRole;
	value: number | null;
	formulaHint: string;
	mode: "preset" | "expert";
	kind?: ComputedFormulaKind;
	operands: Array<{ varPath: string; value: number | null }>;
	weightSourceLabel?: string;
	error?: string;
};

export type TaskTriggerItem = {
	ruleId: string;
	taskCode: string;
	label: string;
	hint: string;
	passes: boolean;
};

export function readByDotPath(
	data: Record<string, unknown> | undefined | null,
	dotPath: string,
): unknown {
	if (!dotPath) return undefined;
	const parts = dotPath.split(".").filter(Boolean);
	let cur: unknown = data;
	for (const p of parts) {
		if (cur === null || cur === undefined) return undefined;
		if (Array.isArray(cur)) {
			const idx = Number(p);
			if (!Number.isInteger(idx)) return undefined;
			cur = cur[idx];
			continue;
		}
		if (typeof cur !== "object") return undefined;
		cur = (cur as Record<string, unknown>)[p];
	}
	return cur;
}

export function writeByDotPath(
	data: Record<string, unknown>,
	dotPath: string,
	value: unknown,
): Record<string, unknown> {
	const parts = dotPath.split(".").filter(Boolean);
	if (parts.length === 0) return data;
	const next = { ...data };
	let cur: Record<string, unknown> = next;
	for (let i = 0; i < parts.length - 1; i++) {
		const k = parts[i]!;
		const child = cur[k];
		const cloned =
			child && typeof child === "object" && !Array.isArray(child)
				? { ...(child as Record<string, unknown>) }
				: {};
		cur[k] = cloned;
		cur = cloned;
	}
	cur[parts[parts.length - 1]!] = value;
	return next;
}

function valueMatches(actual: unknown, expected: unknown): boolean {
	if (Array.isArray(expected)) return expected.includes(actual);
	return actual === expected;
}

function rowMatches(
	row: Record<string, unknown>,
	match: Record<string, unknown> | undefined,
): boolean {
	if (!match) return true;
	return Object.entries(match).every(([field, expected]) =>
		valueMatches(row[field], expected),
	);
}

export function toFiniteNumber(value: unknown): number | null {
	if (value === null || value === undefined || value === "") return null;
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value === "boolean") return value ? 1 : 0;
	if (typeof value === "string") {
		const n = Number(value);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

function computePreset(
	kind: ComputedFormulaKind,
	operandValues: Array<number | null>,
): number | null {
	const filtered = operandValues.filter((v): v is number => v !== null);

	if (kind === "priority_first") {
		const first = operandValues.find((v) => v !== null);
		return first ?? null;
	}

	if (filtered.length === 0) return null;

	if (kind === "sum") {
		return filtered.reduce((acc, v) => acc + v, 0);
	}

	if (kind === "multiply") {
		return filtered.reduce((acc, v) => acc * v, 1);
	}

	if (kind === "max") {
		return Math.max(...filtered);
	}

	if (kind === "min") {
		return Math.min(...filtered);
	}

	return null;
}

function getPayload(rule: V2LogicRuleDto): ComputedRulePayload {
	const raw = rule.payload;
	if (!raw || typeof raw !== "object") return {};
	return raw as ComputedRulePayload;
}

/**
 * Сортирует computed-правила по зависимостям (топологически).
 * Циклы — сохраняем исходный порядок для оставшихся.
 */
function topoSortComputed(rules: V2LogicRuleDto[]): V2LogicRuleDto[] {
	const byTarget = new Map<string, V2LogicRuleDto>();
	for (const r of rules) {
		byTarget.set(
			jsonPointerToFormDataVarPath(normalizeJsonPointer(r.targetPath)),
			r,
		);
	}

	const visited = new Set<string>();
	const inStack = new Set<string>();
	const order: V2LogicRuleDto[] = [];

	const visit = (rule: V2LogicRuleDto) => {
		const key = jsonPointerToFormDataVarPath(
			normalizeJsonPointer(rule.targetPath),
		);
		if (visited.has(key) || inStack.has(key)) return;
		inStack.add(key);
		for (const dep of rule.dependencies) {
			const depKey = jsonPointerToFormDataVarPath(normalizeJsonPointer(dep));
			const depRule = byTarget.get(depKey);
			if (depRule) visit(depRule);
		}
		inStack.delete(key);
		visited.add(key);
		order.push(rule);
	};

	for (const r of rules) visit(r);
	return order;
}

export type RowComputedPayload = {
	arrayPath: string;
	fieldVar: string;
	formulaHint?: string;
	label?: string;
};

function applyRowComputedRule(
	rule: V2LogicRuleDto,
	data: Record<string, unknown>,
): Record<string, unknown> {
	const payload = (rule.payload ?? {}) as Partial<RowComputedPayload>;
	const arrayPath = payload.arrayPath?.trim();
	const fieldVar = payload.fieldVar?.trim();
	if (!arrayPath || !fieldVar) return data;

	const arr = readByDotPath(data, arrayPath);
	if (!Array.isArray(arr)) return data;

	const newArr = arr.map((row) => {
		const rowObj =
			row && typeof row === "object" && !Array.isArray(row)
				? (row as Record<string, unknown>)
				: {};
		let computed: unknown;
		try {
			computed = applyLogic(rule.condition as JsonLogicValue, {
				...data,
				...rowObj,
				_row: rowObj,
			});
		} catch {
			computed = null;
		}
		return { ...rowObj, [fieldVar]: computed };
	});

	return writeByDotPath(data, arrayPath, newArr);
}

export function evaluateComputedRules(
	rules: V2LogicRuleDto[],
	initialFormData: Record<string, unknown>,
): {
	liveData: Record<string, unknown>;
	items: CalculationItem[];
} {
	const computed = rules.filter((r) => r.kind === "computed");
	const rowComputed = rules.filter((r) => r.kind === "row_computed");
	const sorted = topoSortComputed(computed);

	let liveData: Record<string, unknown> = { ...initialFormData };

	for (const rule of rules.filter((r) => r.kind === "task_trigger")) {
		liveData = applyGeneratedRows(rule, liveData);
	}

	// row_computed выполняются после генерации: они пишут per-row totals,
	// которые потом агрегируются в обычных computed-правилах.
	for (const rule of rowComputed) {
		liveData = applyRowComputedRule(rule, liveData);
	}

	const items: CalculationItem[] = [];

	for (const rule of sorted) {
		const payload = getPayload(rule);
		const targetPointer = normalizeJsonPointer(rule.targetPath);
		const targetVarPath = jsonPointerToFormDataVarPath(targetPointer);
		const mode: "preset" | "expert" =
			payload.mode === "preset" || payload.kind ? "preset" : "expert";

		const label =
			payload.label?.trim() ||
			rule.description?.trim() ||
			targetPointer ||
			rule.id;

		const role: ComputedRuleRole = payload.role ?? "other";
		const operands: CalculationItem["operands"] = [];
		let value: number | null = null;
		let error: string | undefined;

		try {
			if (mode === "preset") {
				const ops = (payload.operands ?? []).map((varPath) => {
					const raw = readByDotPath(liveData, varPath);
					return { varPath, value: toFiniteNumber(raw) };
				});
				operands.push(...ops);
				value = computePreset(
					payload.kind ?? "sum",
					ops.map((o) => o.value),
				);
			} else {
				const raw = applyLogic(rule.condition as JsonLogicValue, liveData);
				value = toFiniteNumber(raw);
				if (value === null && typeof raw === "string") {
					// строковый результат сохраняем тоже, но в number-панель не попадает
					value = null;
				}
				for (const depPointer of rule.dependencies) {
					const dv = jsonPointerToFormDataVarPath(
						normalizeJsonPointer(depPointer),
					);
					operands.push({
						varPath: dv,
						value: toFiniteNumber(readByDotPath(liveData, dv)),
					});
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		}

		if (targetVarPath && value !== null) {
			liveData = writeByDotPath(liveData, targetVarPath, value);
		}

		items.push({
			ruleId: rule.id,
			targetPointer,
			targetVarPath,
			label,
			role,
			value,
			mode,
			kind: payload.kind,
			operands,
			formulaHint:
				payload.formulaHint?.trim() || buildAutoFormulaHint(payload, operands),
			weightSourceLabel: payload.weightSourceLabel?.trim() || undefined,
			error,
		});
	}

	return { liveData, items };
}

function applyGeneratedRows(
	rule: V2LogicRuleDto,
	data: Record<string, unknown>,
): Record<string, unknown> {
	const payload = (rule.payload ?? {}) as TaskTriggerPayload;
	if (payload.mode !== "generated_rows") return data;
	const sourceArrayPath = payload.sourceArrayPath?.trim();
	const outputArrayPath = payload.outputArrayPath?.trim();
	if (!sourceArrayPath || !outputArrayPath || !payload.tasks?.length) return data;

	let passes = false;
	try {
		const raw = applyLogic(rule.condition as JsonLogicValue, data);
		passes =
			raw === true ||
			(typeof raw === "number" && Number.isFinite(raw) && raw !== 0) ||
			(typeof raw === "string" && raw.length > 0 && raw !== "0") ||
			(typeof raw === "object" && raw !== null);
	} catch {
		passes = false;
	}
	if (!passes) return writeByDotPath(data, outputArrayPath, []);

	const sourceRows = readByDotPath(data, sourceArrayPath);
	if (!Array.isArray(sourceRows)) return writeByDotPath(data, outputArrayPath, []);

	const generated = sourceRows.flatMap((row, sourceIndex) => {
		const source =
			row && typeof row === "object" && !Array.isArray(row)
				? (row as Record<string, unknown>)
				: {};
		const sourceName =
			typeof source.name === "string" && source.name.trim()
				? source.name.trim()
				: `Источник ${sourceIndex + 1}`;

		return (payload.tasks ?? [])
			.filter((task) => rowMatches(source, task.match))
			.map((task) => ({
				taskCode: task.taskCode,
				name: task.name ?? task.label ?? task.taskCode ?? "Типовая работа",
				reason: task.reason
					? `${sourceName}: ${task.reason}`
					: `${sourceName}: параметр источника`,
				estimateHoursPerDay: task.estimateHoursPerDay ?? 0,
				coefficient: task.coefficient ?? 1,
				sourceComponent: "Источник данных",
				sourceName,
				generatedByRuleId: rule.id,
			}));
	});

	return writeByDotPath(data, outputArrayPath, generated);
}

function buildAutoFormulaHint(
	payload: ComputedRulePayload,
	operands: Array<{ varPath: string; value: number | null }>,
): string {
	if (payload.mode === "expert" && !payload.kind) {
		return "Эксперт: JsonLogic (см. вкладку Логика).";
	}
	const opsLabel = operands.map((o) => o.varPath || "?").join(", ");
	switch (payload.kind) {
		case "multiply":
			return `Произведение: ${opsLabel || "—"}`;
		case "sum":
			return `Сумма: ${opsLabel || "—"}`;
		case "priority_first":
			return `Первый заданный из: ${opsLabel || "—"}`;
		case "max":
			return `Максимум из: ${opsLabel || "—"}`;
		case "min":
			return `Минимум из: ${opsLabel || "—"}`;
		default:
			return "Формула не задана.";
	}
}

export function evaluateTaskTriggers(
	rules: V2LogicRuleDto[],
	formData: Record<string, unknown>,
): TaskTriggerItem[] {
	return rules
		.filter((r) => r.kind === "task_trigger")
		.map((rule) => {
			const payload = (rule.payload ?? {}) as TaskTriggerPayload;
			let passes = false;
			try {
				const raw = applyLogic(rule.condition as JsonLogicValue, formData);
				passes =
					raw === true ||
					(typeof raw === "number" && Number.isFinite(raw) && raw !== 0) ||
					(typeof raw === "string" && raw.length > 0 && raw !== "0");
			} catch {
				passes = false;
			}
			return {
				ruleId: rule.id,
				taskCode: payload.taskCode?.trim() || "—",
				label: payload.label?.trim() || rule.description?.trim() || rule.id,
				hint: payload.hint?.trim() || "",
				passes,
			};
		});
}

export const COMPUTED_ROLE_OPTIONS: Array<{
	key: ComputedRuleRole;
	label: string;
}> = [
	{ key: "coefficient", label: "Коэффициент" },
	{ key: "stage_value", label: "Значение этапа" },
	{ key: "typical_total", label: "Итог: типовые работы" },
	{ key: "atypical_total", label: "Итог: нетиповые работы" },
	{ key: "grand_total", label: "Итог (общий)" },
	{ key: "other", label: "Прочее" },
];

export const COMPUTED_FORMULA_OPTIONS: Array<{
	key: ComputedFormulaKind;
	label: string;
	description: string;
}> = [
	{
		key: "multiply",
		label: "Произведение",
		description: "Базовая × коэффициенты (ФТ-021).",
	},
	{
		key: "sum",
		label: "Сумма",
		description: "Сумма операндов (например, типовые + нетиповые).",
	},
	{
		key: "priority_first",
		label: "Первый заданный",
		description: "Берёт первое непустое значение (ФТ-025).",
	},
	{ key: "max", label: "Максимум", description: "max(операнды)." },
	{ key: "min", label: "Минимум", description: "min(операнды)." },
];

export function isComputedRulePayloadLike(
	value: unknown,
): value is ComputedRulePayload {
	return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function formatComputedNumber(value: number | null): string {
	if (value === null || !Number.isFinite(value)) return "—";
	return Math.abs(value) >= 100
		? value.toFixed(0)
		: Number.isInteger(value)
			? String(value)
			: value.toFixed(2);
}

/** Для отображения в графе: ключ — JSON Pointer цели, значение — узлы-зависимости (var paths). */
export function listRuleDependencyEdges(rules: V2LogicRuleDto[]): Array<{
	id: string;
	sourcePointer: string;
	targetPointer: string;
	ruleId: string;
	kind: V2LogicRuleDto["kind"];
}> {
	const out: Array<{
		id: string;
		sourcePointer: string;
		targetPointer: string;
		ruleId: string;
		kind: V2LogicRuleDto["kind"];
	}> = [];

	for (const rule of rules) {
		const targetPointer = normalizeJsonPointer(rule.targetPath);
		if (!targetPointer || targetPointer === "/") continue;
		for (const dep of rule.dependencies) {
			const sourcePointer = normalizeJsonPointer(dep);
			if (!sourcePointer || sourcePointer === "/") continue;
			out.push({
				id: `${rule.id}:${sourcePointer}->${targetPointer}`,
				sourcePointer,
				targetPointer,
				ruleId: rule.id,
				kind: rule.kind,
			});
		}
	}
	return out;
}

export function varPathToPointer(varPath: string): string {
	const parts = varPath.split(".").filter(Boolean);
	if (parts.length === 0) return "/";
	return `/${parts.join("/")}`;
}

export function pointerToVarPath(pointer: string): string {
	return pointerSegments(pointer).join(".");
}
