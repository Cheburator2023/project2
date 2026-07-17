import { Injectable, NotFoundException } from "@nestjs/common";
import type {
	V2CalculationItemDto,
	V2CalculationResultDto,
	V2CalculationRole,
	V2JsonLogicValue,
	V2LogicGraphDto,
	V2LogicRuleDto,
	V2LegacyStageEvaluationDto,
	V2TaskTriggerItemDto,
	V2TemplateVersionDto,
} from "@smart-anketa/api-contract";
import {
	clearStaleGeneratedTypicalWorkPaths,
	isCalculationPathActive,
	mergeTypicalCoefficientContext,
	parseParamDependencyGraphFromLogic,
	filterCoefficientLogicForHiddenFields,
	resolveAnketaCalculationLogic,
	hasTypicalWorkStreamTriggerContext,
	isFilledTypicalWorkSourceRow,
	readTypicalWorksStreamTriggerContext,
	resolveHiddenParamCodesForSource,
	resolveHiddenSourceFieldKeys,
	readStreamLocalParamsForTypicalOutput,
	resolveStreamFromSourceType,
	resolveStreamsFromSourceSystems,
	resolveSourceTypicalWorksOutputPath,
	shouldSkipLegacyModelStreamStageSummary,
	V2_SOURCE_SYSTEMS_ARRAY_PATH,
	type V2ParamDependencyGraph,
	type V2ParamDefLike,
} from "@smart-anketa/api-contract";
import { V2TemplateService } from "./v2-template.service";
import { V2TemplateVersionService } from "./v2-template-version.service";
import { parseFormNumber } from "../utils/v2-form-number.util";
import {
	applyJsonLogic,
	isJsonLogicTruthy,
	toFiniteNumberOrNull,
} from "./v2-json-logic";
import { applyLegacySummaryToFormData } from "./v2-legacy-stage-evaluation";
import { evaluateLogicValidationRules } from "./v2-logic-validation";
import { V2TypicalWorkRuntimeService } from "./v2-typical-work-runtime.service";
import { migrateV2AnketaFormData } from "../utils/v2-form-data-migration.util";
import { listCatalogParamDefs } from "../utils/v2-catalog-param-defs.util";

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
	worksCatalog?: boolean;
	/** Тип арх. компонента в справочнике типовых работ. */
	worksCatalogArchComponent?: string;
	/**
	 * Стрим-исполнитель для норм/триггеров:
	 * - `fromSourceType` — из поля `type` строки (Система-источник)
	 * - `fromSourceSystems` — все стримы из sourceSystems (объекты витрины/процесса)
	 * - иначе — фиксированное имя стрима
	 */
	worksCatalogStream?: string;
	/** Источник — массив (по умолчанию). */
	sourceArrayPath?: string;
	/** Источник — один объект (витрина, процесс). */
	sourceObjectPath?: string;
	/** Доп. контекст для коэффициентов (напр. modelService при controlTypes). */
	sourceContextPaths?: string[];
	/** `append` — дописать к output; `replace` — заменить (по умолчанию). */
	outputMode?: "append" | "replace";
	taskCode?: string;
	label?: string;
	hint?: string;
	outputArrayPath?: string;
	/** Id типовых работ, привязанных к блоку typicalWork в uiSchema. */
	allowedWorkIds?: string[];
	/**
	 * ФТ-024: единый коэффициент группы для всех работ компонента — произведение
	 * весов параметров. JsonLogic — по merge(localParams стрима, строка компонента);
	 * поля источника перекрывают localParams. Редактируется через админку.
	 * Имеет приоритет над per-task coefficient*, кроме coefficientByField.
	 */
	coefficientLogic?: V2JsonLogicValue;
	tasks?: Array<{
		taskCode?: string;
		label?: string;
		name?: string;
		reason?: string;
		workType?: string;
		estimateHoursPerDay?: number;
		coefficient?: number;
		coefficientBySourceCount?: Record<string, number>;
		coefficientByField?: {
			field: string;
			values: Record<string, number>;
			default?: number;
		};
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
	if (
		expected &&
		typeof expected === "object" &&
		!Array.isArray(expected)
	) {
		const spec = expected as Record<string, unknown>;
		if (Array.isArray(spec.anyOf)) return spec.anyOf.some((v) => valueMatches(actual, v));
		if (Array.isArray(spec.includesAny)) {
			return Array.isArray(actual)
				? spec.includesAny.some((v) => actual.includes(v))
				: spec.includesAny.includes(actual);
		}
		if (typeof spec.gte === "number") {
			return typeof actual === "number" && actual >= spec.gte;
		}
		if (typeof spec.lte === "number") {
			return typeof actual === "number" && actual <= spec.lte;
		}
		if (spec.truthy === true) return Boolean(actual);
	}
	if (Array.isArray(expected)) {
		return Array.isArray(actual)
			? expected.some((v) => actual.includes(v))
			: expected.includes(actual);
	}
	return actual === expected;
}

function sourceCountBucket(count: number): string {
	return count >= 8 ? "8+" : String(count);
}

function resolveGeneratedTaskCoefficient(
	task: NonNullable<TaskTriggerPayload["tasks"]>[number],
	source: Record<string, unknown>,
	sourceCount: number,
	coefficientLogic?: V2JsonLogicValue,
): number {
	const byField = task.coefficientByField;
	if (byField?.field) {
		const value = source[byField.field];
		let lookupKey: string | undefined;
		if (typeof value === "string") {
			lookupKey = value;
		} else if (typeof value === "boolean") {
			const usesRequired = "Требуется" in byField.values;
			lookupKey = value
				? usesRequired
					? "Требуется"
					: "Да"
				: usesRequired
					? "Не требуется"
					: "Нет";
		}
		if (lookupKey !== undefined && byField.values[lookupKey] !== undefined) {
			return byField.values[lookupKey] as number;
		}
		if (byField.default !== undefined) return byField.default;
	}
	const bucket = sourceCountBucket(sourceCount);
	if (task.coefficientBySourceCount?.[bucket] !== undefined) {
		return task.coefficientBySourceCount[bucket] as number;
	}
	// ФТ-024: единый коэффициент группы (произведение весов параметров источника).
	if (coefficientLogic !== undefined) {
		try {
			const computed = toFiniteNumberOrNull(
				applyJsonLogic(coefficientLogic, source),
			);
			if (computed !== null) return computed * (task.coefficient ?? 1);
		} catch {
			// fallback ниже
		}
	}
	return task.coefficient ?? 1;
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
		private readonly workRuntime: V2TypicalWorkRuntimeService,
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
		options?: {
			templateVersionId?: string | null;
			templateId?: string | null;
			jsonSchema?: unknown;
			uiSchema?: unknown;
		},
	): Promise<V2CalculationResultDto> {
		return this.evaluateAsync(logic, formData, options);
	}

	private async evaluateAsync(
		logic: V2LogicGraphDto,
		formData: Record<string, unknown>,
		options?: {
			templateVersionId?: string | null;
			templateId?: string | null;
			jsonSchema?: unknown;
			uiSchema?: unknown;
		},
	): Promise<V2CalculationResultDto> {
		const rules =
			resolveAnketaCalculationLogic(logic, {
				jsonSchema: options?.jsonSchema,
				uiSchema: options?.uiSchema,
			})?.rules ?? [];
		const paramGraph = parseParamDependencyGraphFromLogic(rules);
		const paramDefs = listCatalogParamDefs();
		const rowComputed = rules.filter((r) => r.kind === "row_computed");
		const computed = rules.filter((r) => r.kind === "computed");
		const taskTriggers = rules.filter((r) => r.kind === "task_trigger");

		let liveData = migrateV2AnketaFormData({ ...(formData ?? {}) });

		// 1) task_trigger/generated_rows — материализуем автозадачи до расчёта строк.
		for (const rule of taskTriggers) {
			if (!isCalculationPathActive(liveData, rule.targetPath)) continue;
			liveData = await this.applyGeneratedRows(
				rule,
				liveData,
				options?.templateVersionId ?? null,
				options?.templateId ?? null,
				paramGraph,
				paramDefs,
				options?.uiSchema as Record<string, unknown> | undefined,
			);
		}

		// 2) row_computed — пишем per-row значения.
		for (const rule of rowComputed) {
			if (!isCalculationPathActive(liveData, rule.targetPath)) continue;
			liveData = this.applyRowComputed(rule, liveData);
		}

		// 3) computed — топосорт + последовательный расчёт.
		const { sorted, cycles } = topoSortComputed(computed);
		const items: V2CalculationItemDto[] = [];
		for (const rule of sorted) {
			if (!isCalculationPathActive(liveData, rule.targetPath)) continue;
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

		// Legacy E2E — только если нет catalog модельного стрима в snapshot uiSchema.
		const sourceTypicalWorksPath = resolveSourceTypicalWorksOutputPath(
			options?.jsonSchema,
			options?.uiSchema,
		);
		let legacyStageEvaluation: V2LegacyStageEvaluationDto | null = null;
		if (!shouldSkipLegacyModelStreamStageSummary(options?.uiSchema)) {
			const legacy = applyLegacySummaryToFormData(liveData, {
				sourceTypicalWorksPath,
				uiSchema: options?.uiSchema,
			});
			liveData = legacy.formData;
			legacyStageEvaluation = legacy.legacyStageEvaluation;
		}

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
			const normalizedRow = { ...rowObj };
			for (const key of ["estimateHoursPerDay", "coefficient", "total"] as const) {
				if (!(key in normalizedRow)) continue;
				const parsed = parseFormNumber(normalizedRow[key]);
				if (parsed !== null) normalizedRow[key] = parsed;
			}
			let computed: unknown;
			try {
				computed = applyJsonLogic(rule.condition as V2JsonLogicValue, {
					...data,
					...normalizedRow,
					_row: normalizedRow,
				});
			} catch {
				computed = null;
			}
			return { ...rowObj, [fieldVar]: computed };
		});
		return writeByDotPath(data, arrayPath, next);
	}

	private async applyGeneratedRows(
		rule: V2LogicRuleDto,
		data: Record<string, unknown>,
		templateVersionId: string | null,
		templateId: string | null,
		paramGraph: V2ParamDependencyGraph,
		paramDefs: V2ParamDefLike[],
		uiSchema?: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		const payload = (rule.payload ?? {}) as TaskTriggerPayload;
		if (payload.mode !== "generated_rows") return data;
		const outputArrayPath = payload.outputArrayPath?.trim();
		const usesCatalog = Boolean(payload.worksCatalog);
		const hasStaticTasks = (payload.tasks?.length ?? 0) > 0;
		if (!outputArrayPath || (!usesCatalog && !hasStaticTasks)) {
			return data;
		}
		const clearRowsGeneratedByRule = () => {
			const existing = readByDotPath(data, outputArrayPath);
			if (!Array.isArray(existing)) return data;
			return writeByDotPath(
				data,
				outputArrayPath,
				existing.filter(
					(row) =>
						!row ||
						typeof row !== "object" ||
						Array.isArray(row) ||
						(row as Record<string, unknown>).generatedByRuleId !== rule.id,
				),
			);
		};

		let passes = false;
		try {
			passes = isJsonLogicTruthy(
				applyJsonLogic(rule.condition as V2JsonLogicValue, data),
			);
		} catch {
			passes = false;
		}
		if (!passes) {
			return payload.outputMode === "append"
				? clearRowsGeneratedByRule()
				: this.writeGeneratedTypicalWorkOutput(
						data,
						outputArrayPath,
						[],
						uiSchema,
					);
		}

		const sourceRows = this.resolveGeneratedRowSources(data, payload, uiSchema);
		if (sourceRows.length === 0) {
			return payload.outputMode === "append"
				? clearRowsGeneratedByRule()
				: this.writeGeneratedTypicalWorkOutput(
						data,
						outputArrayPath,
						[],
						uiSchema,
					);
		}

		const streamTriggerContext = readTypicalWorksStreamTriggerContext(
			data,
			outputArrayPath,
			uiSchema,
		);
		const sourceCount = sourceRows.length;
		const streamLocalParams = readStreamLocalParamsForTypicalOutput(
			data,
			outputArrayPath,
			uiSchema,
		);
		const extraContext = this.readSourceContextPaths(data, payload.sourceContextPaths);
		const atDate = new Date().toISOString().slice(0, 10);
		const archComponent =
			payload.worksCatalogArchComponent?.trim() ?? "Система-источник";

		const generated = (
			await Promise.all(
				sourceRows.map(async (row, sourceIndex) => {
					const source =
						row && typeof row === "object" && !Array.isArray(row)
							? (row as Record<string, unknown>)
							: typeof row === "string"
								? { value: row, controlType: row, name: row }
								: {};
					const sourceForMatch = {
						...streamTriggerContext,
						...extraContext,
						...streamLocalParams,
						...source,
						sourceCount,
						sourceIndex,
					};
					const coefficientContext = mergeTypicalCoefficientContext(
						streamLocalParams,
						sourceForMatch,
					);
					const hiddenParamCodes = resolveHiddenParamCodesForSource(
						paramGraph,
						sourceForMatch,
						paramDefs,
					);
					const hiddenSourceFields = resolveHiddenSourceFieldKeys(
						hiddenParamCodes,
						paramDefs,
						sourceForMatch,
					);
					const coefficientLogic = payload.coefficientLogic
						? filterCoefficientLogicForHiddenFields(
								payload.coefficientLogic,
								hiddenSourceFields,
							)
						: undefined;
					const sourceName =
						typeof source.name === "string" && source.name.trim()
							? source.name.trim()
							: typeof source.value === "string" && source.value.trim()
								? source.value.trim()
								: `Компонент ${sourceIndex + 1}`;

					const streams = this.resolveWorksCatalogStreams(
						payload,
						sourceForMatch,
						data,
					);

					const taskDefs = usesCatalog
						? (
								await Promise.all(
									streams.map((streamExecutor) =>
										this.workRuntime.buildCatalogTasks({
											archComponentType: archComponent,
											streamExecutor,
											source: sourceForMatch,
											formData: data,
											templateVersionId,
											templateId,
											atDate,
											hiddenParamCodes,
											allowedWorkIds: Array.isArray(
												payload.allowedWorkIds,
											)
												? payload.allowedWorkIds
												: undefined,
										}),
									),
								)
							).flat()
						: (payload.tasks ?? [])
								.filter((task) => rowMatches(sourceForMatch, task.match))
								.map((task) => ({
									taskCode: task.taskCode ?? "",
									name: task.name ?? task.label ?? task.taskCode ?? "Типовая работа",
									workType:
										typeof task.workType === "string" && task.workType.trim()
											? task.workType.trim()
											: "—",
									reason: task.reason ?? `${sourceName}: параметр источника`,
									estimateHoursPerDay: task.estimateHoursPerDay ?? 0,
									coefficient: resolveGeneratedTaskCoefficient(
										task,
										coefficientContext,
										sourceCount,
										coefficientLogic,
									),
									match: task.match ?? {},
									workId: task.taskCode ?? "",
								}));

					return taskDefs.map((task) => {
						const catalogCoeff =
							typeof task.coefficient === "number" ? task.coefficient : 1;
						const coefficient = usesCatalog
							? resolveGeneratedTaskCoefficient(
									{ coefficient: catalogCoeff },
									coefficientContext,
									sourceCount,
									coefficientLogic,
								)
							: (typeof task.coefficient === "number" ? task.coefficient : 1);

						const catalogTotal =
							"total" in task && typeof task.total === "number"
								? usesCatalog && catalogCoeff !== 0
									? task.total * (coefficient / catalogCoeff)
									: task.total
								: task.estimateHoursPerDay * coefficient;

						return {
							taskCode: task.taskCode,
							name: task.name,
							workType: task.workType,
							reason: task.reason
								? `${sourceName}: ${task.reason}`
								: `${sourceName}: параметр источника`,
							estimateHoursPerDay: task.estimateHoursPerDay,
							coefficient,
							coefficientDisplay:
								"coefficientDisplay" in task &&
								typeof task.coefficientDisplay === "string"
									? task.coefficientDisplay
									: undefined,
							total: catalogTotal,
							sourceComponent: archComponent,
							sourceName,
							generatedByRuleId: rule.id,
							workId: "workId" in task ? task.workId : undefined,
						};
					});
				}),
			)
		).flat();

		if (payload.outputMode === "append") {
			const existing = readByDotPath(data, outputArrayPath);
			const merged = [
				...(Array.isArray(existing) ? existing : []),
				...generated,
			];
			return writeByDotPath(data, outputArrayPath, merged);
		}

		return this.writeGeneratedTypicalWorkOutput(
			data,
			outputArrayPath,
			generated,
			uiSchema,
		);
	}

	private writeGeneratedTypicalWorkOutput(
		data: Record<string, unknown>,
		outputArrayPath: string,
		rows: unknown[],
		uiSchema?: Record<string, unknown>,
	): Record<string, unknown> {
		let next = writeByDotPath(data, outputArrayPath, rows);
		next = clearStaleGeneratedTypicalWorkPaths(
			next,
			outputArrayPath,
			uiSchema,
		);
		return next;
	}

	private resolveGeneratedRowSources(
		data: Record<string, unknown>,
		payload: TaskTriggerPayload,
		uiSchema?: Record<string, unknown>,
	): unknown[] {
		const objectPath = payload.sourceObjectPath?.trim();
		if (objectPath) {
			const obj = readByDotPath(data, objectPath);
			if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
			return [obj];
		}
		const arrayPath = payload.sourceArrayPath?.trim();
		const outputPath = payload.outputArrayPath?.trim();
		const referencePath = outputPath || arrayPath || "";

		if (arrayPath) {
			const filledFromPath = this.readFilledSourceSystemRows(
				readByDotPath(data, arrayPath),
			);
			if (filledFromPath.length > 0) return filledFromPath;

			if (
				arrayPath === "streamDataSources.sourceSystems" ||
				arrayPath === V2_SOURCE_SYSTEMS_ARRAY_PATH ||
				payload.worksCatalog
			) {
				const canonical = this.readFilledSourceSystemRows(
					readByDotPath(data, V2_SOURCE_SYSTEMS_ARRAY_PATH),
				);
				if (canonical.length > 0) return canonical;
				const legacy = this.readFilledSourceSystemRows(
					readByDotPath(data, "streamDataSources.sourceSystems"),
				);
				if (legacy.length > 0) return legacy;
			}
		}

		if (payload.worksCatalog && referencePath) {
			const streamContext = readTypicalWorksStreamTriggerContext(
				data,
				referencePath,
				uiSchema,
			);
			if (hasTypicalWorkStreamTriggerContext(streamContext)) {
				return [streamContext];
			}
		}

		return Array.isArray(readByDotPath(data, arrayPath ?? "")) ? [] : [];
	}

	private readFilledSourceSystemRows(rows: unknown): Record<string, unknown>[] {
		if (!Array.isArray(rows)) return [];
		return rows.filter(
			(row): row is Record<string, unknown> =>
				row != null &&
				typeof row === "object" &&
				!Array.isArray(row) &&
				isFilledTypicalWorkSourceRow(row as Record<string, unknown>),
		);
	}

	private readSourceContextPaths(
		data: Record<string, unknown>,
		paths: string[] | undefined,
	): Record<string, unknown> {
		if (!paths?.length) return {};
		const merged: Record<string, unknown> = {};
		for (const path of paths) {
			const value = readByDotPath(data, path.trim());
			if (value && typeof value === "object" && !Array.isArray(value)) {
				Object.assign(merged, value as Record<string, unknown>);
			}
		}
		return merged;
	}

	private resolveWorksCatalogStreams(
		payload: TaskTriggerPayload,
		source: Record<string, unknown>,
		data: Record<string, unknown>,
	): string[] {
		const mode = payload.worksCatalogStream?.trim() ?? "fromSourceType";
		if (mode === "fromSourceType") {
			const stream = resolveStreamFromSourceType(source);
			return stream ? [stream] : [];
		}
		if (mode === "fromSourceSystems") {
			return resolveStreamsFromSourceSystems(data);
		}
		return [mode];
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
