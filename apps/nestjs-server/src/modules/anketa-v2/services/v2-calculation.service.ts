import { Injectable, NotFoundException } from "@nestjs/common";
import type {
	V2CalculationItemDto,
	V2CalculationResultDto,
	V2CalculationRole,
	V2JsonLogicValue,
	V2LogicGraphDto,
	V2LogicRuleDto,
	V2TaskTriggerItemDto,
	V2TemplateVersionDto,
} from "@smart-anketa/api-contract";
import { V2TemplateService } from "./v2-template.service";
import { V2TemplateVersionService } from "./v2-template-version.service";
import {
	applyJsonLogic,
	isJsonLogicTruthy,
	toFiniteNumberOrNull,
} from "./v2-json-logic";
import { applyLegacySummaryToFormData } from "./v2-legacy-stage-evaluation";
import { evaluateLogicValidationRules } from "./v2-logic-validation";

type ComputedPayload = {
	role?: V2CalculationRole;
	label?: string;
	formulaHint?: string;
	mode?: "preset" | "expert";
	kind?: "multiply" | "sum" | "priority_first" | "max" | "min";
	operands?: string[];
	weightSourceLabel?: string;
};

type RowComputedPayload = {
	arrayPath: string;
	fieldVar: string;
	label?: string;
	formulaHint?: string;
};

type TaskTriggerPayload = {
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

function normalizePointer(pointer: string): string {
	if (!pointer) return "/";
	const trimmed = pointer.trim();
	if (!trimmed || trimmed === "/") return "/";
	return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function pointerToVarPath(pointer: string): string {
	return normalizePointer(pointer).split("/").filter(Boolean).join(".");
}

function readByDotPath(
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
		if (typeof cur === "object") {
			cur = (cur as Record<string, unknown>)[p];
			continue;
		}
		return undefined;
	}
	return cur;
}

function writeByDotPath(
	data: Record<string, unknown>,
	dotPath: string,
	value: unknown,
): Record<string, unknown> {
	const parts = dotPath.split(".").filter(Boolean);
	if (parts.length === 0) return data;
	const next = { ...data };
	let cur: Record<string, unknown> = next;
	for (let i = 0; i < parts.length - 1; i++) {
		const k = parts[i] as string;
		const child = cur[k];
		const cloned =
			child && typeof child === "object" && !Array.isArray(child)
				? { ...(child as Record<string, unknown>) }
				: {};
		cur[k] = cloned;
		cur = cloned;
	}
	cur[parts[parts.length - 1] as string] = value;
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

function computePreset(
	kind: ComputedPayload["kind"],
	operandValues: Array<number | null>,
): number | null {
	const filtered = operandValues.filter((v): v is number => v !== null);

	if (kind === "priority_first") {
		const first = operandValues.find((v) => v !== null);
		return first ?? null;
	}
	if (filtered.length === 0) return null;
	if (kind === "sum") return filtered.reduce((a, b) => a + b, 0);
	if (kind === "multiply") return filtered.reduce((a, b) => a * b, 1);
	if (kind === "max") return Math.max(...filtered);
	if (kind === "min") return Math.min(...filtered);
	return null;
}

function topoSortComputed(rules: V2LogicRuleDto[]): {
	sorted: V2LogicRuleDto[];
	cycles: string[];
} {
	const byTarget = new Map<string, V2LogicRuleDto>();
	for (const r of rules) {
		byTarget.set(pointerToVarPath(r.targetPath), r);
	}
	const visited = new Set<string>();
	const inStack = new Set<string>();
	const sorted: V2LogicRuleDto[] = [];
	const cycles: string[] = [];

	const visit = (rule: V2LogicRuleDto, trail: string[]) => {
		const key = pointerToVarPath(rule.targetPath);
		if (visited.has(key)) return;
		if (inStack.has(key)) {
			cycles.push([...trail, key].join(" → "));
			return;
		}
		inStack.add(key);
		for (const dep of rule.dependencies) {
			const depKey = pointerToVarPath(dep);
			const depRule = byTarget.get(depKey);
			if (depRule) visit(depRule, [...trail, key]);
		}
		inStack.delete(key);
		visited.add(key);
		sorted.push(rule);
	};

	for (const r of rules) visit(r, []);
	return { sorted, cycles };
}

@Injectable()
export class V2CalculationService {
	constructor(
		private readonly versionService: V2TemplateVersionService,
		private readonly templateService: V2TemplateService,
	) {}

	/** Получить версию шаблона (по id или текущую опубликованную). */
	async getEffectiveVersion(
		templateId: string,
		versionId?: string,
	): Promise<V2TemplateVersionDto> {
		if (versionId) {
			const v = await this.versionService.findOne(versionId);
			if (!v || v.templateId !== templateId)
				throw new NotFoundException("V2 template version not found");
			return v as unknown as V2TemplateVersionDto;
		}
		const template = await this.templateService.findOne(templateId);
		if (!template.currentVersionId)
			throw new NotFoundException(
				"V2 template has no current published version",
			);
		const current = await this.versionService.findOne(
			template.currentVersionId,
		);
		return current as unknown as V2TemplateVersionDto;
	}

	evaluate(
		logic: V2LogicGraphDto,
		formData: Record<string, unknown>,
	): V2CalculationResultDto {
		const rules = logic?.rules ?? [];
		const rowComputed = rules.filter((r) => r.kind === "row_computed");
		const computed = rules.filter((r) => r.kind === "computed");
		const taskTriggers = rules.filter((r) => r.kind === "task_trigger");

		let liveData: Record<string, unknown> = { ...(formData ?? {}) };

		// 1) task_trigger/generated_rows — материализуем автозадачи до расчёта строк.
		for (const rule of taskTriggers) {
			liveData = this.applyGeneratedRows(rule, liveData);
		}

		// 2) row_computed — пишем per-row значения.
		for (const rule of rowComputed) {
			liveData = this.applyRowComputed(rule, liveData);
		}

		// 3) computed — топосорт + последовательный расчёт.
		const { sorted, cycles } = topoSortComputed(computed);
		const items: V2CalculationItemDto[] = [];
		for (const rule of sorted) {
			const { item, nextData } = this.applyComputed(rule, liveData);
			liveData = nextData;
			items.push(item);
		}

		// 4) task_trigger.
		const triggerResults: V2TaskTriggerItemDto[] = taskTriggers.map((rule) => {
			const payload = (rule.payload ?? {}) as TaskTriggerPayload;
			let passes = false;
			try {
				passes = isJsonLogicTruthy(
					applyJsonLogic(rule.condition as V2JsonLogicValue, liveData),
				);
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

		const { formData: afterLegacy, legacyStageEvaluation } =
			applyLegacySummaryToFormData(liveData);
		liveData = afterLegacy;

		const validationIssues = evaluateLogicValidationRules(rules, liveData);

		return {
			formData: liveData,
			items,
			taskTriggers: triggerResults,
			cycles,
			validationIssues,
			legacyStageEvaluation,
		};
	}

	private applyRowComputed(
		rule: V2LogicRuleDto,
		data: Record<string, unknown>,
	): Record<string, unknown> {
		const payload = (rule.payload ?? {}) as Partial<RowComputedPayload>;
		const arrayPath = payload.arrayPath?.trim();
		const fieldVar = payload.fieldVar?.trim();
		if (!arrayPath || !fieldVar) return data;
		const arr = readByDotPath(data, arrayPath);
		if (!Array.isArray(arr)) return data;
		const next = arr.map((row) => {
			const rowObj =
				row && typeof row === "object" && !Array.isArray(row)
					? (row as Record<string, unknown>)
					: {};
			let computed: unknown;
			try {
				computed = applyJsonLogic(rule.condition as V2JsonLogicValue, {
					...data,
					...rowObj,
					_row: rowObj,
				});
			} catch {
				computed = null;
			}
			return { ...rowObj, [fieldVar]: computed };
		});
		return writeByDotPath(data, arrayPath, next);
	}

	private applyGeneratedRows(
		rule: V2LogicRuleDto,
		data: Record<string, unknown>,
	): Record<string, unknown> {
		const payload = (rule.payload ?? {}) as TaskTriggerPayload;
		if (payload.mode !== "generated_rows") return data;
		const sourceArrayPath = payload.sourceArrayPath?.trim();
		const outputArrayPath = payload.outputArrayPath?.trim();
		if (!sourceArrayPath || !outputArrayPath || !payload.tasks?.length) {
			return data;
		}

		let passes = false;
		try {
			passes = isJsonLogicTruthy(
				applyJsonLogic(rule.condition as V2JsonLogicValue, data),
			);
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

	private applyComputed(
		rule: V2LogicRuleDto,
		data: Record<string, unknown>,
	): { item: V2CalculationItemDto; nextData: Record<string, unknown> } {
		const payload = (rule.payload ?? {}) as ComputedPayload;
		const targetPointer = normalizePointer(rule.targetPath);
		const targetVarPath = pointerToVarPath(targetPointer);
		const mode: "preset" | "expert" =
			payload.mode === "preset" || payload.kind ? "preset" : "expert";

		const operands: V2CalculationItemDto["operands"] = [];
		let value: number | null = null;
		let error: string | undefined;

		try {
			if (mode === "preset") {
				const ops = (payload.operands ?? []).map((vp) => ({
					varPath: vp,
					value: toFiniteNumberOrNull(readByDotPath(data, vp)),
				}));
				operands.push(...ops);
				value = computePreset(
					payload.kind ?? "sum",
					ops.map((o) => o.value),
				);
			} else {
				const raw = applyJsonLogic(rule.condition as V2JsonLogicValue, data);
				value = toFiniteNumberOrNull(raw);
				for (const dep of rule.dependencies) {
					const v = pointerToVarPath(dep);
					operands.push({
						varPath: v,
						value: toFiniteNumberOrNull(readByDotPath(data, v)),
					});
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		}

		const nextData =
			targetVarPath && value !== null
				? writeByDotPath(data, targetVarPath, value)
				: data;

		const label =
			payload.label?.trim() ||
			rule.description?.trim() ||
			targetPointer ||
			rule.id;

		return {
			nextData,
			item: {
				ruleId: rule.id,
				targetPointer,
				targetVarPath,
				label,
				role: payload.role ?? "other",
				value,
				mode,
				kind: payload.kind,
				operands,
				formulaHint:
					payload.formulaHint?.trim() ||
					(mode === "preset"
						? `Пресет: ${payload.kind ?? "sum"} (${operands.length} операндов)`
						: "Эксперт: JsonLogic"),
				weightSourceLabel: payload.weightSourceLabel?.trim() || undefined,
				error,
			},
		};
	}
}
