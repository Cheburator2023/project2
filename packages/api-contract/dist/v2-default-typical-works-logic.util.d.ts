import type { V2LogicGraphDto, V2LogicRuleDto } from "./v2-template.types";
import { V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH } from "./v2-typical-work-output-paths.util";
export type PatchV2TypicalWorksLogicOptions = {
    jsonSchema?: unknown;
    uiSchema?: unknown;
};
/** Канонические пути v5: источники в detailInfo, вывод — в stream-блоки. */
export declare const V2_SOURCE_SYSTEMS_ARRAY_PATH = "detailInfo.sourceSystems";
export { V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH };
export declare const V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH = "streamModelControl.field_Khn6-HAW";
export declare function buildSourceTypicalWorksCatalogRule(outputArrayPath?: string): V2LogicRuleDto;
export declare function buildControlTypicalWorksCatalogRule(): V2LogicRuleDto;
/** Схема содержит блок типовых работ (archComponent: typicalWork) — достаточно для каталога. */
export declare function schemaSupportsSourceTypicalWorksCatalog(jsonSchema?: unknown, uiSchema?: unknown): boolean;
/** Заменяет устаревшие static-tasks правила на каталог работ с путями схемы v5. */
export declare function patchV2TypicalWorksLogicRules(logic: V2LogicGraphDto, options?: PatchV2TypicalWorksLogicOptions): V2LogicGraphDto;
