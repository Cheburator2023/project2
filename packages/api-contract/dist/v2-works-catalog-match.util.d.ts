import { formatParamNameWithSourceKeys, parseParamNameSourceKeys, stripParamNameSourceKeys } from "./v2-work-param-source-keys.util";
export { formatParamNameWithSourceKeys, parseParamNameSourceKeys, stripParamNameSourceKeys, };
/** Единый стрим-исполнитель для типовых работ систем-источников. */
export declare const V2_SOURCE_STREAM = "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u0434\u0430\u043D\u043D\u044B\u0445";
/**
 * Legacy-маппинг «тип источника → стрим». Больше НЕ используется для
 * маршрутизации (разделение внутр/внеш убрано): все источники идут в
 * единый стрим `V2_SOURCE_STREAM`. Оставлен только для чтения старых меток.
 */
export declare const STREAM_BY_SOURCE_TYPE: Record<string, string>;
/** Нормализует код/метку типа источника к канонической русской метке. */
export declare function normalizeSourceTypeLabel(raw: unknown): keyof typeof STREAM_BY_SOURCE_TYPE | null;
export declare const CONTROL_MODELS_STREAM = "\u041A\u043E\u043D\u0442\u0440\u043E\u043B\u044C \u043C\u043E\u0434\u0435\u043B\u0435\u0439";
export type TypicalWorkRuleLike = {
    paramCode: string;
    paramName: string | null;
    operator: string;
    valueCode: string | null;
    valueLabel: string | null;
    values?: Array<{
        code: string;
        label: string | null;
    }>;
};
/**
 * Стрим-исполнитель строки-источника. Разделение внутр/внеш убрано —
 * любой источник маршрутизируется в единый стрим `V2_SOURCE_STREAM`.
 * Тип источника (`type`) остаётся обычным триггером работы.
 */
export declare function resolveStreamFromSourceType(_source: Record<string, unknown>): string;
/** Стрим(ы) типовых работ для систем-источников анкеты — всегда единый. */
export declare function resolveStreamsFromSourceSystems(_data: Record<string, unknown>): string[];
/** Читает значение параметра из контекста строки/объекта анкеты. */
export declare function readTypicalWorkSourceField(source: Record<string, unknown>, paramCode: string, paramName: string | null): unknown;
export declare function extractControlCode(label: string): string | null;
export type TriggerStatusCatalogParamLike = {
    code: string;
    values: Array<{
        code: string;
        label: string;
        validFrom?: string | null;
        validTo?: string | null;
    }>;
};
export declare function isSourceTypeTriggerParam(paramCode: string, paramName: string | null | undefined): boolean;
export declare function isControlTypeTriggerParam(paramCode: string, paramName: string | null | undefined): boolean;
export declare function isPresenceOnlyTriggerRule(rule: {
    valueCode: string | null;
    valueLabel: string | null;
    values?: Array<{
        code: string;
        label: string | null;
    }>;
}): boolean;
/** Сопоставляет правило триггера с параметром глобального справочника (алиасы CSV → каталог). */
export declare function resolveTriggerStatusCatalogParam(rule: {
    paramCode: string;
    paramName?: string | null;
}, catalog: TriggerStatusCatalogParamLike[]): TriggerStatusCatalogParamLike | undefined;
/** Канонический ключ группы триггеров при проверке по каталогу (legacy alias → `type`). */
export declare function triggerRuleCatalogGroupKey(rule: {
    paramCode: string;
    paramName?: string | null;
}, catalog: TriggerStatusCatalogParamLike[]): string;
export declare function catalogValueMatchesTriggerRule(catalogValue: {
    code: string;
    label: string;
}, rule: {
    paramCode: string;
    paramName?: string | null;
    valueCode: string | null;
    valueLabel: string | null;
}): boolean;
/** Все условия работы (логическое И) против контекста строки/объекта анкеты. */
export declare function typicalWorkRulesMatchSource(rules: TypicalWorkRuleLike[], source: Record<string, unknown>): boolean;
export declare function resolveLaborCoefficient(source: Record<string, unknown>, paramCode: string, valueCode: string | null, valueLabel: string | null, paramName?: string | null): boolean;
export declare function resolveLaborAnyOfCoefficient(source: Record<string, unknown>, paramCode: string, anyOf: {
    valueCodes: string[];
    valueLabels: string[];
    coeffOn: number;
    coeffOff: number;
}, paramName?: string | null): number;
