import type { V2JsonLogicValue, V2LogicGraphDto, V2LogicRuleDto } from "./v2-template.types";
import {
	collectTypicalWorkBlockBindings,
	resolveSourceTypicalWorksOutputPath,
	V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH,
	V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
} from "./v2-typical-work-output-paths.util";

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
export { V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH };
export { V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH };

export function typicalWorksCatalogRuleId(outputArrayPath: string): string {
	return `typical-works-catalog-${outputArrayPath.replace(/\./g, "-")}`;
}

export function buildSourceTypicalWorksCatalogRule(
	outputArrayPath: string = V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
	options?: { boundWorkIds?: string[] | undefined },
): V2LogicRuleDto {
	const boundWorkIds = options?.boundWorkIds;
	const hasExplicitBinding = boundWorkIds !== undefined;
	const enabled =
		!hasExplicitBinding || (boundWorkIds?.length ?? 0) > 0;

	const payload: Record<string, unknown> = {
		hint:
			"При заполнении систем-источников подтягиваются типовые работы из справочника (стрим «Источники данных»). Появление работ управляется их триггерами. Настройка — в конструкторе → Логика.",
		mode: "generated_rows",
		label: "Типовые работы (стрим «Источники данных»)",
		worksCatalog: true,
		worksCatalogArchComponent: "Система-источник",
		worksCatalogStream: "fromSourceType",
		taskCode: "CATALOG_SOURCE_TASKS",
		calcModel: "unified",
		outputArrayPath,
		sourceArrayPath: V2_SOURCE_SYSTEMS_ARRAY_PATH,
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
		dependencies: [`/${V2_SOURCE_SYSTEMS_ARRAY_PATH.replace(/\./g, "/")}`],
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

const LEGACY_CONTROL_TYPICAL_TASKS_PATH =
	"streamModelControl.control.controlTypicalTasks";
const LEGACY_CONTROL_TYPICAL_TASKS_SLASH_PATH =
	"/streamModelControl/control/controlTypicalTasks";
const LEGACY_CONTROL_TYPICAL_TASKS_SLASH_REPLACEMENT = `/${V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH.replace(/\./g, "/")}`;

function patchTypicalWorksPathsDeep(value: unknown): unknown {
	if (typeof value === "string") {
		let next = value;
		if (next.includes(LEGACY_CONTROL_TYPICAL_TASKS_PATH)) {
			next = next.replaceAll(
				LEGACY_CONTROL_TYPICAL_TASKS_PATH,
				V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH,
			);
		}
		if (next.includes(LEGACY_CONTROL_TYPICAL_TASKS_SLASH_PATH)) {
			next = next.replaceAll(
				LEGACY_CONTROL_TYPICAL_TASKS_SLASH_PATH,
				LEGACY_CONTROL_TYPICAL_TASKS_SLASH_REPLACEMENT,
			);
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
				patched.push(
					buildSourceTypicalWorksCatalogRule(binding.outputPath, {
						boundWorkIds: binding.boundWorkIds,
					}),
				);
			}
		} else {
			patched.push(
				buildSourceTypicalWorksCatalogRule(
					sourceOutputPath ?? V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
				),
			);
		}
	}
	if (hasControlRule) patched.push(buildControlTypicalWorksCatalogRule());
	const rest = rules
		.filter((rule) => !isPatchedTypicalWorksCatalogRule(rule))
		.map((rule) =>
			patchUnifiedTypicalTotalRule(
				patchLegacyRowTotalRule(
					patchTypicalWorksPathsDeep(rule) as V2LogicRuleDto,
				),
				sourceOutputPath,
			),
		);
	return { ...logic, rules: [...rest, ...patched] };
}
