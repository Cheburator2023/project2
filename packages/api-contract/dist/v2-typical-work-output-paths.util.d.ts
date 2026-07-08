export declare const V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH = "streamDataSources.sourceTypicalTasks";
/** Dot-пути read-only массивов «Типовые работы» из uiSchema (archComponent: typicalWork). */
export declare function collectGeneratedTypicalWorkArrayPaths(uiSchema: unknown, prefix?: string): string[];
/** Путь вывода типовых работ «Система-источник» по схеме (канонический или пользовательский). */
export declare function resolveSourceTypicalWorksOutputPath(jsonSchema?: unknown, uiSchema?: unknown): string | null;
/** Есть ли в jsonSchema узел по dot-пути (только `properties`, без $ref). */
export declare function jsonSchemaHasResolvablePath(jsonSchema: unknown, dotPath: string): boolean;
