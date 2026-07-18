import type { V2JsonLogicValue, V2LogicGraphDto, V2LogicRuleDto } from "./v2-template.types";
/** Источник триггеров модельного стрима — arch object list «Модельный сервис». */
export declare const V2_MODEL_STREAM_SOURCE_ARRAY_PATH = "generalInfo.modelService";
import { V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH, V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH } from "./v2-typical-work-output-paths.util";
/** Заменяет dot-путь в JsonLogic (`{"var": "a.b.c"}` и вложенные узлы). */
export declare function replaceDotPathInJsonLogic(value: unknown, oldPath: string, newPath: string): unknown;
export type PatchV2TypicalWorksLogicOptions = {
    jsonSchema?: unknown;
    uiSchema?: unknown;
};
/** Канонические пути v5: источники в detailInfo, вывод — в stream-блоки. */
export declare const V2_SOURCE_SYSTEMS_ARRAY_PATH = "detailInfo.sourceSystems";
export { V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH };
export { V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH };
export declare function typicalWorksCatalogRuleId(outputArrayPath: string): string;
export declare function buildModelStreamTypicalWorksCatalogRule(outputArrayPath: string, options?: {
    boundWorkIds?: string[] | undefined;
}): V2LogicRuleDto;
export declare function buildSourceTypicalWorksCatalogRule(outputArrayPath?: string, options?: {
    boundWorkIds?: string[] | undefined;
}): V2LogicRuleDto;
export declare function buildControlTypicalWorksCatalogRule(): V2LogicRuleDto;
export declare function isTypicalWorksCatalogLogicRule(rule: V2LogicRuleDto): boolean;
/** Id catalog-правил, которые должны быть в зафиксированном logic snapshot шаблона. */
export declare function requiredTypicalWorksCatalogRuleIds(uiSchema?: unknown): Set<string>;
/** Logic snapshot уже содержит catalog/row-total правила — не пересобирать в рантайме. */
export declare function isTypicalWorksCatalogLogicComplete(logic: V2LogicGraphDto, options?: PatchV2TypicalWorksLogicOptions): boolean;
/** Модельный стрим: не подмешивать legacy E2E-таблицу из hardcode. */
export declare function shouldSkipLegacyModelStreamStageSummary(uiSchema?: unknown): boolean;
/**
 * Итог строки типовой работы: для строк каталога (workId) сохраняем уже
 * округлённый total; иначе estimate × coefficient (ручные/legacy строки).
 */
export declare function buildTypicalWorkRowTotalCondition(): V2JsonLogicValue;
export declare function buildTypicalWorkRowTotalRule(arrayPath: string): V2LogicRuleDto;
export declare function buildUnifiedTypicalTotalRule(arrayPaths: string[]): V2LogicRuleDto | null;
/** Схема содержит блок типовых работ (archComponent: typicalWork) — достаточно для каталога. */
export declare function schemaSupportsSourceTypicalWorksCatalog(jsonSchema?: unknown, uiSchema?: unknown): boolean;
/** Заменяет устаревшие static-tasks правила на каталог работ с путями схемы v5. */
export declare function patchV2TypicalWorksLogicRules(logic: V2LogicGraphDto, options?: PatchV2TypicalWorksLogicOptions): V2LogicGraphDto;
/**
 * Дополняет уже сохранённые catalog-правила актуальным payload из uiSchema
 * (например sourceArrayPath для модельного стрима), не пересобирая весь logic.
 */
export declare function upgradeTypicalWorksCatalogLogicRules(logic: V2LogicGraphDto, options?: PatchV2TypicalWorksLogicOptions): V2LogicGraphDto;
/**
 * Фиксирует в logic snapshot версии шаблона актуальный payload catalog-правил
 * из uiSchema (boundWorkIds, sourceArrayPath, …). Вызывать при save/publish версии.
 */
export declare function syncTypicalWorksCatalogLogicSnapshot(logic: V2LogicGraphDto, options?: PatchV2TypicalWorksLogicOptions): V2LogicGraphDto;
