import { formatParamNameWithSourceKeys, parseParamNameSourceKeys, stripParamNameSourceKeys } from "./v2-work-param-source-keys.util";
export { formatParamNameWithSourceKeys, parseParamNameSourceKeys, stripParamNameSourceKeys, };
/** Стрим-исполнитель по типу системы-источника в анкете. */
export declare const STREAM_BY_SOURCE_TYPE: Record<string, string>;
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
export declare function resolveStreamFromSourceType(source: Record<string, unknown>): string | null;
/** Стримы, представленные в системах-источниках анкеты (v5: `detailInfo`). */
export declare function resolveStreamsFromSourceSystems(data: Record<string, unknown>): string[];
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
