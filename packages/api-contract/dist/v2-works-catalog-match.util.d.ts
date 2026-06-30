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
/** Стримы, представленные в `streamDataSources.sourceSystems`. */
export declare function resolveStreamsFromSourceSystems(data: Record<string, unknown>): string[];
/** Читает значение параметра из контекста строки/объекта анкеты. */
export declare function readTypicalWorkSourceField(source: Record<string, unknown>, paramCode: string, paramName: string | null): unknown;
/** Все условия работы (логическое И) против контекста строки/объекта анкеты. */
export declare function typicalWorkRulesMatchSource(rules: TypicalWorkRuleLike[], source: Record<string, unknown>): boolean;
export declare function resolveLaborCoefficient(source: Record<string, unknown>, paramCode: string, valueCode: string | null, valueLabel: string | null): boolean;
export declare function resolveLaborAnyOfCoefficient(source: Record<string, unknown>, paramCode: string, anyOf: {
    valueCodes: string[];
    valueLabels: string[];
    coeffOn: number;
    coeffOff: number;
}): number;
