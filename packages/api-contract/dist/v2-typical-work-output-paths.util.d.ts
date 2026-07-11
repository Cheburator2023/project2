export declare const V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH = "streamDataSources.sourceTypicalTasks";
/** Канонический вывод типовых работ «Контроль моделей». */
export declare const V2_CONTROL_TYPICAL_TASKS_OUTPUT_PATH = "streamModelControl.field_Khn6-HAW";
/** Ключ ui:options — привязанные к блоку id типовых работ (сохраняется в снепшоте). */
export declare const TYPICAL_WORK_BOUND_WORK_IDS_KEY = "boundWorkIds";
export type TypicalWorkBlockBinding = {
    outputPath: string;
    /** undefined — legacy-блок без явной привязки (все работы шаблона). */
    boundWorkIds: string[] | undefined;
};
/** Legacy/fan-out пути, куда раньше дублировались сгенерированные типовые работы. */
export declare const LEGACY_GENERATED_TYPICAL_WORK_ARRAY_PATHS: readonly ["streamDataSources.sourceTypicalTasks", "streamModelControl.field_Khn6-HAW", "detailInfo.detailTypicalTasks", "detailInfo.sourceTypicalTasks", "generalInfo.modelService.controlTypicalTasks"];
/** Dot-пути read-only массивов «Типовые работы» из uiSchema (archComponent: typicalWork). */
export declare function collectGeneratedTypicalWorkArrayPaths(uiSchema: unknown, prefix?: string): string[];
/** Привязанные work id для блока typicalWork по dot-пути в uiSchema. */
export declare function readTypicalWorkBoundWorkIdsAtOutputPath(uiSchema: unknown, outputPath: string): string[] | undefined;
/** Все блоки typicalWork с путями вывода и привязками работ. */
export declare function collectTypicalWorkBlockBindings(uiSchema: unknown): TypicalWorkBlockBinding[];
/** Путь вывода типовых работ «Система-источник» по схеме (канонический или пользовательский). */
export declare function resolveSourceTypicalWorksOutputPath(jsonSchema?: unknown, uiSchema?: unknown): string | null;
/** Есть ли в jsonSchema узел по dot-пути (только `properties`, без $ref). */
export declare function jsonSchemaHasResolvablePath(jsonSchema: unknown, dotPath: string): boolean;
/** Все известные пути read-only массивов типовых работ (uiSchema + legacy). */
export declare function listAllGeneratedTypicalWorkArrayPaths(uiSchema?: unknown): string[];
/**
 * Сбрасывает устаревшие fan-out массивы типовых работ, оставляя только
 * актуальный `outputArrayPath` (после replace/clear в калькуляторе).
 */
export declare function clearStaleGeneratedTypicalWorkPaths(data: Record<string, unknown>, outputArrayPath: string, uiSchema?: unknown): Record<string, unknown>;
