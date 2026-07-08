import type { V2LogicGraphDto, V2LogicRuleDto } from "./v2-template.types";
import {
	jsonSchemaHasResolvablePath,
	resolveSourceTypicalWorksOutputPath,
	V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
} from "./v2-typical-work-output-paths.util";

export type PatchV2TypicalWorksLogicOptions = {
	jsonSchema?: unknown;
	uiSchema?: unknown;
};

/** Канонические пути v5: источники в detailInfo, вывод — в stream-блоки. */
export const V2_SOURCE_SYSTEMS_ARRAY_PATH = "detailInfo.sourceSystems";
export { V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH };
export const V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH =
	"streamModelControl.field_Khn6-HAW";

export function buildSourceTypicalWorksCatalogRule(
	outputArrayPath: string = V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
): V2LogicRuleDto {
	return {
		id: "unified-source-typical-works",
		kind: "task_trigger",
		targetPath: `/${outputArrayPath.replace(/\./g, "/")}`,
		condition: true,
		description:
			"ФТ-024: типовые работы «Система-источник» из справочника работ (назначения + триггеры).",
		dependencies: [`/${V2_SOURCE_SYSTEMS_ARRAY_PATH.replace(/\./g, "/")}`],
		payload: {
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
		},
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

const LEGACY_CONTROL_TYPICAL_TASKS_PATH =
	"streamModelControl.control.controlTypicalTasks";

function patchTypicalWorksPathsDeep(value: unknown): unknown {
	if (typeof value === "string") {
		let next = value;
		if (next.includes(LEGACY_CONTROL_TYPICAL_TASKS_PATH)) {
			next = next.replaceAll(
				LEGACY_CONTROL_TYPICAL_TASKS_PATH,
				V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH,
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

/** Схема содержит блок типовых работ источников и массив систем-источников. */
export function schemaSupportsSourceTypicalWorksCatalog(
	jsonSchema?: unknown,
	uiSchema?: unknown,
): boolean {
	if (!resolveSourceTypicalWorksOutputPath(jsonSchema, uiSchema)) return false;

	return (
		jsonSchemaHasResolvablePath(jsonSchema, V2_SOURCE_SYSTEMS_ARRAY_PATH) ||
		jsonSchemaHasResolvablePath(jsonSchema, "streamDataSources.sourceSystems")
	);
}

/** Заменяет устаревшие static-tasks правила на каталог работ с путями схемы v5. */
export function patchV2TypicalWorksLogicRules(
	logic: V2LogicGraphDto,
	options?: PatchV2TypicalWorksLogicOptions,
): V2LogicGraphDto {
	const rules = logic?.rules ?? [];
	const hasSourceRule =
		rules.some((rule) => rule.id === "unified-source-typical-works") ||
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
		patched.push(
			buildSourceTypicalWorksCatalogRule(
				sourceOutputPath ?? V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
			),
		);
	}
	if (hasControlRule) patched.push(buildControlTypicalWorksCatalogRule());
	const rest = rules
		.filter((rule) => !PATCHED_RULE_IDS.has(rule.id))
		.map((rule) => patchTypicalWorksPathsDeep(rule) as V2LogicRuleDto);
	return { ...logic, rules: [...rest, ...patched] };
}
