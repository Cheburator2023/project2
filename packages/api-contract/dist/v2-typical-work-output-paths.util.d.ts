/** Dot-пути read-only массивов «Типовые работы» из uiSchema (archComponent: typicalWork). */
export declare function collectGeneratedTypicalWorkArrayPaths(uiSchema: unknown, prefix?: string): string[];
/** Есть ли в jsonSchema узел по dot-пути (только `properties`, без $ref). */
export declare function jsonSchemaHasResolvablePath(jsonSchema: unknown, dotPath: string): boolean;
