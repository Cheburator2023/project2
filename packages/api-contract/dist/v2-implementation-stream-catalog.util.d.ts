/**
 * Каталог стрим-исполнителей (таблица `v2_stream` / factory fallback).
 * Справочник формы `v2.generalInfo.implementationStream` — отдельно (только enum анкеты).
 */
import { V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE, type V2ImplementationStreamCode } from "./v2-implementation-streams.util";
export { V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE };
/** Payload элемента реестра стримов (`v2_stream`). */
export type V2ImplementationStreamPayload = {
    storeCode: true;
    fieldPointer?: string;
    /** Имена стрима в БД типовых работ (нормы / assignments). */
    dbNames: string[];
    /** Legacy UI-подписи executor-стримов. */
    legacyLabels: string[];
    /** Keycloak group / dept aliases → allow-list фильтра. */
    keycloakAliases: string[];
    /**
     * Дочерний стрим зонтичной группы (общий каталог типовых работ).
     * Для заводской модели — входит в umbrella «Модельный стрим».
     */
    isModelStream: boolean;
    /**
     * Зонтичный / общий стрим: каталог типовых работ на несколько дочерних.
     */
    isUmbrellaStream: boolean;
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
/** Заводской зонтичный стрим «Модельный стрим» (реестр / конструктор типовых работ). */
export declare function buildFactoryModelUmbrellaStreamCatalogEntry(): V2ImplementationStreamCatalogEntry;
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
/** Зонтичный стрим (payload или заводской код mdls). */
export declare function isUmbrellaStreamCatalogEntry(entry: V2ImplementationStreamCatalogEntry): boolean;
/** Заводские коды, которые нельзя удалить из реестра. */
export declare function isFactoryProtectedStreamCode(code: string): boolean;
/** Каноническое DB-имя для назначения типовой работы. */
export declare function resolveCatalogDbExecutorName(entry: V2ImplementationStreamCatalogEntry): string;
/** Alias-map для stream filter: keycloak/dept → [code, label, v1…]. */
export declare function buildStreamFilterAliasMap(catalog: readonly V2ImplementationStreamCatalogEntry[]): Record<string, readonly string[]>;
export declare function catalogCodes(catalog: readonly V2ImplementationStreamCatalogEntry[], options?: {
    activeOnly?: boolean;
    includeUmbrella?: boolean;
}): string[];
/** Коды/подписи из каталога реестра (без зонтичных). Форма анкеты — из словаря. */
export declare function catalogEnumPair(catalog: readonly V2ImplementationStreamCatalogEntry[]): {
    enums: string[];
    enumNames: string[];
};
/** Заводские items словаря формы: только 5 модельных стримов (1:1 с select анкеты). */
export declare function buildFactoryAnketaFormStreamDictionaryItems(): Array<{
    code: string;
    label: string;
    order: number;
    payload: {
        storeCode: true;
    };
}>;
