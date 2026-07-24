/**
 * Каталог стрим-исполнителей (DB-owned): payload items словаря
 * `v2.generalInfo.implementationStream` + resolved DTO для клиента/Nest.
 */
import { V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE, type V2ImplementationStreamCode } from "./v2-implementation-streams.util";
export { V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE };
/** Payload элемента справочника implementationStream. */
export type V2ImplementationStreamPayload = {
    storeCode: true;
    fieldPointer?: string;
    /** Имена стрима в БД типовых работ (нормы / assignments). */
    dbNames: string[];
    /** Legacy UI-подписи executor-стримов. */
    legacyLabels: string[];
    /** Keycloak group / dept aliases → allow-list фильтра. */
    keycloakAliases: string[];
    /** Участвует в umbrella «Модельный стрим». */
    isModelStream: boolean;
    /** v1 streamExecutor aliases для фильтра реестра. */
    v1Labels: string[];
};
export type V2ImplementationStreamCatalogEntry = {
    code: string;
    label: string;
    order: number;
    isActive: boolean;
    payload: V2ImplementationStreamPayload;
};
export declare function buildFactoryImplementationStreamPayload(code: V2ImplementationStreamCode): V2ImplementationStreamPayload;
/** Factory entries для seed / soft-sync / fallback до загрузки БД. */
export declare function buildFactoryImplementationStreamCatalog(): V2ImplementationStreamCatalogEntry[];
export declare function parseImplementationStreamPayload(raw: unknown, options?: {
    label?: string;
    code?: string;
}): V2ImplementationStreamPayload;
export declare function normalizeImplementationStreamCatalogEntry(input: {
    code: string;
    label: string;
    order?: number;
    isActive?: boolean;
    payload?: unknown;
}): V2ImplementationStreamCatalogEntry | null;
/** Валидация кода стрима (formData / streamExecutor): 1–6 символов, [a-z0-9]. */
export declare function isValidImplementationStreamCodeFormat(code: string): boolean;
export declare function findImplementationStreamCatalogEntry(value: string, catalog: readonly V2ImplementationStreamCatalogEntry[]): V2ImplementationStreamCatalogEntry | null;
/** Scope DB-имён для фильтра типовых работ по коду/подписи стрима. */
export declare function resolveCatalogEntryScopeStreams(entry: V2ImplementationStreamCatalogEntry): string[];
export declare function resolveModelStreamCatalogScopeFromEntries(catalog: readonly V2ImplementationStreamCatalogEntry[]): string[];
/** Каноническое DB-имя для назначения типовой работы. */
export declare function resolveCatalogDbExecutorName(entry: V2ImplementationStreamCatalogEntry): string;
/** Alias-map для stream filter: keycloak/dept → [code, label, v1…]. */
export declare function buildStreamFilterAliasMap(catalog: readonly V2ImplementationStreamCatalogEntry[]): Record<string, readonly string[]>;
export declare function catalogCodes(catalog: readonly V2ImplementationStreamCatalogEntry[], options?: {
    activeOnly?: boolean;
}): string[];
export declare function catalogEnumPair(catalog: readonly V2ImplementationStreamCatalogEntry[]): {
    enums: string[];
    enumNames: string[];
};
