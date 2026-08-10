import type { V2JsonLogicValue, V2LogicGraphDto, V2LogicRuleDto } from "./v2-template.types";
import { resolveTypicalWorkCatalogStreamLabel } from "./v2-anketa-section-ui.util";
import {
	V2_MODEL_STREAM_EXECUTOR,
	V2_MODEL_STREAM_FACTORY_WORK_IDS,
} from "./v2-model-stream-typical-works.constants";
import {
	collectTypicalWorkBlockBindings,
	collectGeneratedTypicalWorkArrayPaths,
	resolveSourceTypicalWorksOutputPath,
	LEGACY_CONTROL_TYPICAL_TASKS_OUTPUT_PATHS,
	V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH,
	V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
} from "./v2-typical-work-output-paths.util";
import {
	V2_CATALOG_SOURCE_ARCH_BY_STREAM,
	resolveCatalogSourceArrayPath,
} from "./v2-schema-field-index.util";

/** Источник триггеров модельного стрима — arch object list «Модельный сервис» (fallback path). */
export const V2_MODEL_STREAM_SOURCE_ARRAY_PATH = "generalInfo.modelService";
export const V2_MODEL_STREAM_SOURCE_ARCH_COMPONENT =
	V2_CATALOG_SOURCE_ARCH_BY_STREAM.modelStream;
/** Заменяет dot-путь в JsonLogic (`{"var": "a.b.c"}` и вложенные узлы). */
export function replaceDotPathInJsonLogic(
	value: unknown,
	oldPath: string,
	newPath: string,
): unknown {
	if (oldPath === newPath) return value;
	if (value === null || value === undefined) return value;
	if (typeof value === "string") {
		return value === oldPath ? newPath : value;
	}
	if (Array.isArray(value)) {
		return value.map((item) => replaceDotPathInJsonLogic(item, oldPath, newPath));
	}
	if (typeof value === "object") {
		const next: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value)) {
			if (key === "var") {
				if (typeof child === "string" && child === oldPath) {
					next[key] = newPath;
					continue;
				}
				if (Array.isArray(child) && child[0] === oldPath) {
					next[key] = [newPath, ...child.slice(1)];
					continue;
				}
			}
			next[key] = replaceDotPathInJsonLogic(child, oldPath, newPath);
		}
		return next;
	}
	return value;
}

function patchUnifiedTypicalTotalRule(
	rule: V2LogicRuleDto,
	sourceOutputPath: string | null,
): V2LogicRuleDto {
	if (rule.id !== "unified-typical-total") return rule;
	if (
		!sourceOutputPath ||
		sourceOutputPath === V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH
	) {
		return rule;
	}

	const oldSlash = `/${V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH.replace(/\./g, "/")}`;
	const newSlash = `/${sourceOutputPath.replace(/\./g, "/")}`;

	return {
		...rule,
		condition: replaceDotPathInJsonLogic(
			rule.condition,
			V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
			sourceOutputPath,
		) as V2JsonLogicValue,
		dependencies: (rule.dependencies ?? []).map((dep) =>
			dep === oldSlash ? newSlash : dep,
		),
	};
}

export type PatchV2TypicalWorksLogicOptions = {
	jsonSchema?: unknown;
	uiSchema?: unknown;
};

/** Канонические пути v5: источники в detailInfo, вывод — в stream-блоки. */
export const V2_SOURCE_SYSTEMS_ARRAY_PATH = "detailInfo.sourceSystems";
export const V2_SOURCE_SYSTEMS_ARCH_COMPONENT =
	V2_CATALOG_SOURCE_ARCH_BY_STREAM.sourceSystems;
export { V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH };
export { V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH };

function resolveCatalogSourcePathForRule(options?: {
	jsonSchema?: unknown;
	uiSchema?: unknown;
	sourceArchComponent: string;
	fallbackPath: string;
}): string {
	return (
		resolveCatalogSourceArrayPath({
			jsonSchema: options?.jsonSchema,
			uiSchema: options?.uiSchema,
			sourceArchComponent: options?.sourceArchComponent,
			fallbackPath: options?.fallbackPath,
		}) ?? options?.fallbackPath ??
		""
	);
}

export function typicalWorksCatalogRuleId(outputArrayPath: string): string {
	return `typical-works-catalog-${outputArrayPath.replace(/\./g, "-")}`;
}

export function buildModelStreamTypicalWorksCatalogRule(
	outputArrayPath: string,
	options?: {
		boundWorkIds?: string[] | undefined;
		jsonSchema?: unknown;
		uiSchema?: unknown;
	},
): V2LogicRuleDto {
	const boundWorkIds = options?.boundWorkIds;
	const hasExplicitBinding = boundWorkIds !== undefined;
	const enabled =
		!hasExplicitBinding || (boundWorkIds?.length ?? 0) > 0;
	const allowedWorkIds = hasExplicitBinding
		? (boundWorkIds ?? [])
		: [...V2_MODEL_STREAM_FACTORY_WORK_IDS];
	const sourceArrayPath = resolveCatalogSourcePathForRule({
		jsonSchema: options?.jsonSchema,
		uiSchema: options?.uiSchema,
		sourceArchComponent: V2_MODEL_STREAM_SOURCE_ARCH_COMPONENT,
		fallbackPath: V2_MODEL_STREAM_SOURCE_ARRAY_PATH,
	});

	return {
		id: typicalWorksCatalogRuleId(outputArrayPath),
		kind: "task_trigger",
		targetPath: `/${outputArrayPath.replace(/\./g, "/")}`,
		condition: enabled,
		description:
			"ФТ-024: типовые работы модельного стрима из справочника (10 этапов factory snapshot).",
		dependencies: [],
		payload: {
			hint:
				"Типовые работы модельного стрима: этапы по триггерам из generalInfo (модельный сервис), detailInfo и неопределённости.",
			mode: "generated_rows",
			label: "Типовые работы (Модельный стрим)",
			worksCatalog: true,
			worksCatalogStream: V2_MODEL_STREAM_EXECUTOR,
			worksCatalogAllArchComponents: true,
			outputArrayPath,
			sourceArchComponent: V2_MODEL_STREAM_SOURCE_ARCH_COMPONENT,
			sourceArrayPath,
			allowedWorkIds,
			sourceContextPaths: ["detailInfo", "generalInfo", "uncertaintyCalculation"],
			taskCode: "CATALOG_MODEL_STREAM_TASKS",
			calcModel: "unified",
		},
	};
}

export function buildSourceTypicalWorksCatalogRule(
	outputArrayPath: string = V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
	options?: {
		boundWorkIds?: string[] | undefined;
		jsonSchema?: unknown;
		uiSchema?: unknown;
	},
): V2LogicRuleDto {
	const boundWorkIds = options?.boundWorkIds;
	const hasExplicitBinding = boundWorkIds !== undefined;
	const enabled =
		!hasExplicitBinding || (boundWorkIds?.length ?? 0) > 0;
	const sourceArrayPath = resolveCatalogSourcePathForRule({
		jsonSchema: options?.jsonSchema,
		uiSchema: options?.uiSchema,
		sourceArchComponent: V2_SOURCE_SYSTEMS_ARCH_COMPONENT,
		fallbackPath: V2_SOURCE_SYSTEMS_ARRAY_PATH,
	});

	const payload: Record<string, unknown> = {
		hint:
			"При заполнении систем-источников подтягиваются типовые работы из справочника (стрим «Источники данных»). Появление работ управляется их триггерами. Настройка — в конструкторе → Логика.",
		mode: "generated_rows",
		label: "Типовые работы (стрим «Источники данных»)",
		worksCatalog: true,
		worksCatalogArchComponent: "Система-источник",
		worksCatalogStream: "fromSourceType",
		sourceContextPaths: [
			"detailInfo.dataMart",
			"detailInfo.dataProcess",
		],
		taskCode: "CATALOG_SOURCE_TASKS",
		calcModel: "unified",
		outputArrayPath,
		sourceArchComponent: V2_SOURCE_SYSTEMS_ARCH_COMPONENT,
		sourceArrayPath,
	};
	if (hasExplicitBinding) {
		payload.allowedWorkIds = boundWorkIds ?? [];
	}

	return {
		id: typicalWorksCatalogRuleId(outputArrayPath),
		kind: "task_trigger",
		targetPath: `/${outputArrayPath.replace(/\./g, "/")}`,
		condition: enabled,
		description:
			"ФТ-024: типовые работы «Система-источник» из справочника работ (назначения + триггеры).",
		dependencies: [`/${sourceArrayPath.replace(/\./g, "/")}`],
		payload,
	};
}

/** Каталог типовых работ стрима-исполнителя (ПиРМ и др.) — все типы арх. компонентов. */
export function buildExecutorStreamTypicalWorksCatalogRule(
	outputArrayPath: string,
	options: {
		streamExecutor: string;
		boundWorkIds?: string[] | undefined;
	},
): V2LogicRuleDto {
	const streamExecutor = options.streamExecutor.trim();
	const boundWorkIds = options.boundWorkIds;
	const hasExplicitBinding = boundWorkIds !== undefined;
	const enabled =
		!hasExplicitBinding || (boundWorkIds?.length ?? 0) > 0;
	const streamRoot = outputArrayPath.split(".")[0] ?? outputArrayPath;

	const payload: Record<string, unknown> = {
		hint: `Типовые работы стрима «${streamExecutor}» из справочника. Появление работ управляется их условиями появления.`,
		mode: "generated_rows",
		label: `Типовые работы (стрим «${streamExecutor}»)`,
		worksCatalog: true,
		worksCatalogStream: streamExecutor,
		worksCatalogAllArchComponents: true,
		outputArrayPath,
		sourceContextPaths: [
			"detailInfo",
			"generalInfo",
			"uncertaintyCalculation",
			streamRoot,
		],
		taskCode: "CATALOG_EXECUTOR_STREAM_TASKS",
		calcModel: "unified",
	};
	if (hasExplicitBinding) {
		payload.allowedWorkIds = boundWorkIds ?? [];
	}

	return {
		id: typicalWorksCatalogRuleId(outputArrayPath),
		kind: "task_trigger",
		targetPath: `/${outputArrayPath.replace(/\./g, "/")}`,
		condition: enabled,
		description: `ФТ-024: типовые работы стрима «${streamExecutor}» из справочника (все типы арх. компонентов).`,
		dependencies: [],
		payload,
	};
}

export function buildControlTypicalWorksCatalogRule(): V2LogicRuleDto {
	return {
		id: "unified-control-typical-works",
		kind: "task_trigger",
		targetPath: `/${V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH.replace(/\./g, "/")}`,
		condition: false,
		description:
			"Контроль моделей: генерация отключена до появления поля выбора видов контроля в схеме v5.",
		dependencies: [],
		payload: {
			mode: "generated_rows",
			label: "Типовые работы (стрим «Контроль моделей»)",
			worksCatalog: true,
			worksCatalogArchComponent: "Контроль модели",
			worksCatalogStream: "Контроль моделей",
			outputArrayPath: V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH,
			sourceArrayPath: V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH,
			tasks: [],
		},
	};
}

const PATCHED_RULE_IDS = new Set([
	"unified-source-typical-works",
	"unified-control-typical-works",
]);

export function isTypicalWorksCatalogLogicRule(rule: V2LogicRuleDto): boolean {
	return (
		PATCHED_RULE_IDS.has(rule.id) || rule.id.startsWith("typical-works-catalog-")
	);
}

function isPatchedTypicalWorksCatalogRule(rule: V2LogicRuleDto): boolean {
	return isTypicalWorksCatalogLogicRule(rule);
}

function typicalRowTotalRuleId(arrayPath: string): string {
	return `unified-typical-row-total:${arrayPath.replace(/\./g, "_")}`;
}

function isTypicalRowTotalPatchedRuleId(id: string): boolean {
	return id.startsWith("unified-typical-row-total:");
}

/** Id catalog-правил, которые должны быть в зафиксированном logic snapshot шаблона. */
export function requiredTypicalWorksCatalogRuleIds(
	uiSchema?: unknown,
): Set<string> {
	const bindings = uiSchema ? collectTypicalWorkBlockBindings(uiSchema) : [];
	const ids = new Set<string>();
	for (const binding of bindings) {
		if (binding.boundWorkIds !== undefined && binding.boundWorkIds.length === 0) {
			continue;
		}
		ids.add(typicalWorksCatalogRuleId(binding.outputPath));
	}
	if (
		ids.size === 0 &&
		schemaSupportsSourceTypicalWorksCatalog(undefined, uiSchema)
	) {
		ids.add(
			typicalWorksCatalogRuleId(
				resolveSourceTypicalWorksOutputPath(undefined, uiSchema) ??
					V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
			),
		);
	}
	return ids;
}

/** Logic snapshot уже содержит catalog/row-total правила — не пересобирать в рантайме. */
export function isTypicalWorksCatalogLogicComplete(
	logic: V2LogicGraphDto,
	options?: PatchV2TypicalWorksLogicOptions,
): boolean {
	const ruleIds = new Set((logic?.rules ?? []).map((rule) => rule.id));
	for (const id of requiredTypicalWorksCatalogRuleIds(options?.uiSchema)) {
		if (!ruleIds.has(id)) return false;
	}

	const typicalPaths = options?.uiSchema
		? collectGeneratedTypicalWorkArrayPaths(options.uiSchema)
		: [];
	for (const path of typicalPaths) {
		if (!ruleIds.has(typicalRowTotalRuleId(path))) return false;
	}
	if (typicalPaths.length > 0 && !ruleIds.has("unified-typical-total")) {
		return false;
	}
	return true;
}

/** Модельный стрим: не подмешивать legacy E2E-таблицу из hardcode. */
export function shouldSkipLegacyModelStreamStageSummary(
	uiSchema?: unknown,
): boolean {
	if (!uiSchema) return false;
	return collectTypicalWorkBlockBindings(uiSchema).some((binding) => {
		if (binding.boundWorkIds !== undefined && binding.boundWorkIds.length === 0) {
			return false;
		}
		return (
			resolveTypicalWorkCatalogStreamLabel(uiSchema, binding.outputPath) ===
			V2_MODEL_STREAM_EXECUTOR
		);
	});
}

function buildTypicalArrayReduceTerm(arrayPath: string): V2JsonLogicValue {
	return {
		reduce: [
			{ var: arrayPath },
			{
				"+": [
					{ var: "accumulator" },
					{
						max: [0, { var: "current.total" }],
					},
				],
			},
			0,
		],
	};
}

/**
 * Итог строки типовой работы: для строк каталога (workId) сохраняем уже
 * округлённый total; иначе estimate × coefficient (ручные/legacy строки).
 */
export function buildTypicalWorkRowTotalCondition(): V2JsonLogicValue {
	return {
		if: [
			{
				and: [
					{ "!!": [{ var: "workId" }] },
					{ "!=": [{ var: "total" }, null] },
				],
			},
			{ var: "total" },
			{ "*": [{ var: "estimateHoursPerDay" }, { var: "coefficient" }] },
		],
	};
}

export function buildTypicalWorkRowTotalRule(arrayPath: string): V2LogicRuleDto {
	return {
		id: typicalRowTotalRuleId(arrayPath),
		kind: "row_computed",
		payload: {
			label: "Per-row итог типовой работы",
			fieldVar: "total",
			arrayPath,
			formulaHint:
				"row.total = каталог (округл.) или норматив (ч/д) × коэффициент",
		},
		condition: buildTypicalWorkRowTotalCondition(),
		targetPath: `/${arrayPath.replace(/\./g, "/")}`,
		description: "ФТ-024: итог строки типовой работы.",
		dependencies: [],
	};
}

export function buildUnifiedTypicalTotalRule(
	arrayPaths: string[],
): V2LogicRuleDto | null {
	if (arrayPaths.length === 0) return null;

	const condition: V2JsonLogicValue =
		arrayPaths.length === 1
			? buildTypicalArrayReduceTerm(arrayPaths[0]!)
			: {
					"+": arrayPaths.map((path) => buildTypicalArrayReduceTerm(path)),
				};

	return {
		id: "unified-typical-total",
		kind: "computed",
		payload: {
			mode: "expert",
			role: "typical_total",
			label: "Сумма по типовым работам",
			calcModel: "unified",
			formulaHint: `Σ типовые работы (${arrayPaths.join(" + ")})`,
		},
		condition,
		targetPath: "/summary/typicalTotal",
		description: "ФТ-026: сумма итоговых оценок типовых работ.",
		dependencies: arrayPaths.map((path) => `/${path.replace(/\./g, "/")}`),
	};
}

const LEGACY_CONTROL_ROW_TOTAL_RULE_IDS = new Set([
	"unified-control-row-total",
]);

function isLegacyControlRowTotalRuleId(id: string): boolean {
	return LEGACY_CONTROL_ROW_TOTAL_RULE_IDS.has(id);
}

function patchTypicalWorksPathsDeep(value: unknown): unknown {
	if (typeof value === "string") {
		let next = value;
		for (const legacyPath of LEGACY_CONTROL_TYPICAL_TASKS_OUTPUT_PATHS) {
			if (next.includes(legacyPath)) {
				next = next.replaceAll(legacyPath, V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH);
			}
			const legacySlash = `/${legacyPath.replace(/\./g, "/")}`;
			const canonicalSlash = `/${V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH.replace(/\./g, "/")}`;
			if (next.includes(legacySlash)) {
				next = next.replaceAll(legacySlash, canonicalSlash);
			}
		}
		if (next === "streamDataSources.sourceSystems") {
			return V2_SOURCE_SYSTEMS_ARRAY_PATH;
		}
		if (next === "/streamDataSources/sourceSystems") {
			return `/${V2_SOURCE_SYSTEMS_ARRAY_PATH.replace(/\./g, "/")}`;
		}
		return next;
	}
	if (Array.isArray(value)) {
		return value.map((item) => patchTypicalWorksPathsDeep(item));
	}
	if (value && typeof value === "object") {
		const next: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value)) {
			next[key] = patchTypicalWorksPathsDeep(child);
		}
		return next;
	}
	return value;
}

/** Legacy: правило per-row total ошибочно сохранено как visibility. */
function patchLegacyRowTotalRule(rule: V2LogicRuleDto): V2LogicRuleDto {
	if (rule.kind !== "visibility") return rule;
	const payload = rule.payload as Record<string, unknown> | undefined;
	if (payload?.fieldVar !== "total") return rule;
	if (typeof payload.arrayPath !== "string" || !payload.arrayPath.trim()) {
		return rule;
	}
	return { ...rule, kind: "row_computed" };
}

/** Схема содержит блок типовых работ (archComponent: typicalWork) — достаточно для каталога. */
export function schemaSupportsSourceTypicalWorksCatalog(
	jsonSchema?: unknown,
	uiSchema?: unknown,
): boolean {
	return Boolean(resolveSourceTypicalWorksOutputPath(jsonSchema, uiSchema));
}

/** Заменяет устаревшие static-tasks правила на каталог работ с путями схемы v5. */
export function patchV2TypicalWorksLogicRules(
	logic: V2LogicGraphDto,
	options?: PatchV2TypicalWorksLogicOptions,
): V2LogicGraphDto {
	const rules = logic?.rules ?? [];
	const bindings = options?.uiSchema
		? collectTypicalWorkBlockBindings(options.uiSchema)
		: [];
	const hasSourceRule =
		rules.some((rule) => isPatchedTypicalWorksCatalogRule(rule)) ||
		bindings.length > 0 ||
		schemaSupportsSourceTypicalWorksCatalog(
			options?.jsonSchema,
			options?.uiSchema,
		);
	const hasControlRule = rules.some(
		(rule) => rule.id === "unified-control-typical-works",
	);
	const patched: V2LogicRuleDto[] = [];
	const sourceOutputPath = resolveSourceTypicalWorksOutputPath(
		options?.jsonSchema,
		options?.uiSchema,
	);

	if (hasSourceRule) {
		if (bindings.length > 0) {
			for (const binding of bindings) {
				const streamExecutor = options?.uiSchema
					? resolveTypicalWorkCatalogStreamLabel(
							options.uiSchema,
							binding.outputPath,
						)
					: null;
				patched.push(
					buildCatalogRuleForTypicalWorkBinding(
						binding.outputPath,
						binding.boundWorkIds,
						streamExecutor,
						options,
					),
				);
			}
		} else {
			patched.push(
				buildSourceTypicalWorksCatalogRule(
					sourceOutputPath ?? V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
					{
						jsonSchema: options?.jsonSchema,
						uiSchema: options?.uiSchema,
					},
				),
			);
		}
	}
	if (hasControlRule) patched.push(buildControlTypicalWorksCatalogRule());

	const typicalPaths = options?.uiSchema
		? collectGeneratedTypicalWorkArrayPaths(options.uiSchema)
		: [];

	const rest = rules
		.filter(
			(rule) =>
				!isPatchedTypicalWorksCatalogRule(rule) &&
				!isTypicalRowTotalPatchedRuleId(rule.id) &&
				!isLegacyControlRowTotalRuleId(rule.id) &&
				(typicalPaths.length === 0 || rule.id !== "unified-typical-total"),
		)
		.map((rule) =>
			patchUnifiedTypicalTotalRule(
				patchLegacyRowTotalRule(
					patchTypicalWorksPathsDeep(rule) as V2LogicRuleDto,
				),
				sourceOutputPath,
			),
		);

	const injectedTypicalRows = typicalPaths.map((path) =>
		buildTypicalWorkRowTotalRule(path),
	);
	const unifiedTypical = buildUnifiedTypicalTotalRule(typicalPaths);

	return {
		...logic,
		rules: [
			...rest,
			...patched,
			...injectedTypicalRows,
			...(unifiedTypical ? [unifiedTypical] : []),
		],
	};
}

function buildCatalogRuleForTypicalWorkBinding(
	outputPath: string,
	boundWorkIds: string[] | undefined,
	streamExecutor: string | null,
	options?: PatchV2TypicalWorksLogicOptions,
): V2LogicRuleDto {
	if (streamExecutor === V2_MODEL_STREAM_EXECUTOR) {
		return buildModelStreamTypicalWorksCatalogRule(outputPath, {
			boundWorkIds,
			jsonSchema: options?.jsonSchema,
			uiSchema: options?.uiSchema,
		});
	}
	if (
		streamExecutor &&
		streamExecutor !== "Источники данных" &&
		streamExecutor !== "fromSourceType"
	) {
		return buildExecutorStreamTypicalWorksCatalogRule(outputPath, {
			streamExecutor,
			boundWorkIds,
		});
	}
	return buildSourceTypicalWorksCatalogRule(outputPath, {
		boundWorkIds,
		jsonSchema: options?.jsonSchema,
		uiSchema: options?.uiSchema,
	});
}

function buildCanonicalTypicalWorksCatalogRules(
	options?: PatchV2TypicalWorksLogicOptions,
): Map<string, V2LogicRuleDto> {
	const bindings = options?.uiSchema
		? collectTypicalWorkBlockBindings(options.uiSchema)
		: [];
	const rules = new Map<string, V2LogicRuleDto>();

	if (bindings.length > 0) {
		for (const binding of bindings) {
			const streamExecutor = options?.uiSchema
				? resolveTypicalWorkCatalogStreamLabel(
						options.uiSchema,
						binding.outputPath,
					)
				: null;
			const rule = buildCatalogRuleForTypicalWorkBinding(
				binding.outputPath,
				binding.boundWorkIds,
				streamExecutor,
				options,
			);
			rules.set(rule.id, rule);
		}
		return rules;
	}

	if (
		schemaSupportsSourceTypicalWorksCatalog(
			options?.jsonSchema,
			options?.uiSchema,
		)
	) {
		const sourceOutputPath = resolveSourceTypicalWorksOutputPath(
			options?.jsonSchema,
			options?.uiSchema,
		);
		const rule = buildSourceTypicalWorksCatalogRule(
			sourceOutputPath ?? V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
			{
				jsonSchema: options?.jsonSchema,
				uiSchema: options?.uiSchema,
			},
		);
		rules.set(rule.id, rule);
	}

	return rules;
}

const CATALOG_PAYLOAD_UPGRADE_KEYS = [
	"hint",
	"mode",
	"label",
	"worksCatalog",
	"worksCatalogStream",
	"worksCatalogAllArchComponents",
	"worksCatalogArchComponent",
	"outputArrayPath",
	"sourceArrayPath",
	"sourceArchComponent",
	"sourceBlockUid",
	"sourceContextPaths",
	"taskCode",
	"calcModel",
	"allowedWorkIds",
] as const;

function mergeTypicalWorksCatalogRulePayload(
	existing: Record<string, unknown>,
	canonical: Record<string, unknown>,
): Record<string, unknown> {
	const merged = { ...existing };
	for (const key of CATALOG_PAYLOAD_UPGRADE_KEYS) {
		const next = canonical[key];
		if (next === undefined || next === null || next === "") continue;
		const cur = merged[key];
		if (key === "allowedWorkIds") {
			if (
				Array.isArray(next) &&
				next.length > 0 &&
				(!Array.isArray(cur) ||
					cur.length === 0 ||
					JSON.stringify(cur) !== JSON.stringify(next))
			) {
				merged[key] = next;
			}
			continue;
		}
		if (
			key === "sourceArrayPath" ||
			key === "sourceArchComponent" ||
			key === "sourceBlockUid" ||
			key === "worksCatalogStream" ||
			key === "outputArrayPath"
		) {
			if (cur !== next) merged[key] = next;
			continue;
		}
		if (cur === undefined || cur === null || cur === "") {
			merged[key] = next;
		}
	}
	return merged;
}

/**
 * Дополняет уже сохранённые catalog-правила актуальным payload из uiSchema
 * (например sourceArrayPath для модельного стрима), не пересобирая весь logic.
 */
export function upgradeTypicalWorksCatalogLogicRules(
	logic: V2LogicGraphDto,
	options?: PatchV2TypicalWorksLogicOptions,
): V2LogicGraphDto {
	const canonicalById = buildCanonicalTypicalWorksCatalogRules(options);
	if (canonicalById.size === 0) return logic;

	let changed = false;
	const rules = (logic?.rules ?? []).map((rule) => {
		if (!isTypicalWorksCatalogLogicRule(rule)) return rule;
		const canonical = canonicalById.get(rule.id);
		if (!canonical) return rule;

		const existingPayload = (rule.payload ?? {}) as Record<string, unknown>;
		const canonicalPayload = (canonical.payload ?? {}) as Record<string, unknown>;
		const mergedPayload = mergeTypicalWorksCatalogRulePayload(
			existingPayload,
			canonicalPayload,
		);
		if (JSON.stringify(mergedPayload) === JSON.stringify(existingPayload)) {
			return rule;
		}
		changed = true;
		return { ...rule, payload: mergedPayload };
	});

	return changed ? { ...logic, rules } : logic;
}

/**
 * Фиксирует в logic snapshot версии шаблона актуальный payload catalog-правил
 * из uiSchema (boundWorkIds, sourceArrayPath, …). Вызывать при save/publish версии.
 */
export function syncTypicalWorksCatalogLogicSnapshot(
	logic: V2LogicGraphDto,
	options?: PatchV2TypicalWorksLogicOptions,
): V2LogicGraphDto {
	const upgraded = upgradeTypicalWorksCatalogLogicRules(logic, options);
	return isTypicalWorksCatalogLogicComplete(upgraded, options)
		? upgraded
		: patchV2TypicalWorksLogicRules(upgraded, options);
}
