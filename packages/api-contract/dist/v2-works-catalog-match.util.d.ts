import { formatParamNameWithSourceKeys, parseParamNameSourceKeys, stripParamNameSourceKeys } from "./v2-work-param-source-keys.util";
import { type V2WorkArchCountCoeffStep, type V2WorkFormulaArchCountKind } from "./v2-work-arch-count-coeff.util";
import type { TypicalWorkTriggerMatchContext } from "./v2-typical-works.util";
import type { V2TypicalWorkTriggerArchCountCombinator } from "./v2-typical-work.types";
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
/** Вход для normalize: factory snapshot может хранить values как string[]. */
export type TypicalWorkTriggerRuleMatchInput = Omit<TypicalWorkRuleLike, "values"> & {
    values?: Array<{
        code: string;
        label: string | null;
    } | string>;
};
/** Приводит legacy/snapshot-правила к виду, пригодному для сопоставления с ответами анкеты. */
export declare function normalizeTypicalWorkTriggerRuleForMatch(rule: TypicalWorkTriggerRuleMatchInput): TypicalWorkRuleLike;
export declare function normalizeTypicalWorkTriggerRulesForMatch(rules: TypicalWorkTriggerRuleMatchInput[]): TypicalWorkRuleLike[];
export type TypicalWorkTriggerArchCountLike = {
    kind?: V2WorkFormulaArchCountKind | null;
    steps?: V2WorkArchCountCoeffStep[] | null;
    combinator?: V2TypicalWorkTriggerArchCountCombinator;
};
/**
 * Стрим-исполнитель строки-источника. Разделение внутр/внеш убрано —
 * любой источник маршрутизируется в единый стрим `V2_SOURCE_STREAM`.
 * Тип источника (`type`) остаётся обычным триггером работы.
 */
export declare function resolveStreamFromSourceType(_source: Record<string, unknown>): string;
/** Стрим(ы) типовых работ для систем-источников анкеты — всегда единый. */
export declare function resolveStreamsFromSourceSystems(_data: Record<string, unknown>): string[];
/**
 * Ответ параметра трудоёмкости: только явные поля анкеты (paramCode / sourceKeys / slug).
 * Без fallback на `value`/`controlType` строки — иначе отсутствующий чекбокс
 * ошибочно наследует чужое значение и получает coeffOn вместо coeffOff.
 */
export declare function readLaborParamAnswer(source: Record<string, unknown>, paramCode: string, paramName: string | null): unknown;
/** Читает значение параметра из контекста строки/объекта анкеты (триггеры, JsonLogic). */
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
/** Сентинел: работа выводится всегда, без проверки полей анкеты. */
export declare const V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_CODE = "__always__";
export declare const V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_NAME = "\u041D\u0435\u0442 \u2014 \u0440\u0430\u0431\u043E\u0442\u0430 \u0432\u044B\u0432\u043E\u0434\u0438\u0442\u0441\u044F \u0432\u0441\u0435\u0433\u0434\u0430";
export declare function isAlwaysShownTriggerParam(paramCode: string, paramName: string | null | undefined): boolean;
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
/** Битые/пустые ссылки из legacy CSV — не проверяем против схемы. */
export declare function isBrokenTypicalWorkTriggerRef(rule: {
    paramCode: string;
    paramName?: string | null;
}): boolean;
/**
 * Методологические presence-триггеры (пилот, мониторинг и т.п.) не привязаны к полям схемы.
 * Legacy CSV иногда режет «Пилот (первичный, повторный)» на отдельные paramCode.
 */
export declare function isMethodologyPresenceTriggerRule(rule: {
    paramCode: string;
    paramName?: string | null;
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
/** Сопоставление значения поля анкеты с кодом/меткой из справочника или схемы. */
export declare function coerceNumericLaborActual(actual: unknown): unknown;
/** Читает значение по schemaPointer (`/generalInfo/field`, `/detailInfo/dataMart/items/field`). */
export declare function readValueAtSchemaPointer(root: Record<string, unknown>, pointer: string): unknown;
/**
 * Поля триггера с другого арх. компонента (напр. readyPromReports на моделях
 * при fan-out по системам-источникам): flatten last-write даёт значение
 * последней модели и ломает «хотя бы одна модель = Нет».
 *
 * Если в formData несколько разных ответов — всегда подставляем массив
 * (laborValueMatches = any), даже когда source уже содержит last-write.
 * Один ответ: не трогаем source, если поле на нём уже есть.
 */
export declare function overlayCrossComponentTriggerLookup(lookup: Record<string, unknown>, source: Record<string, unknown>, formData: Record<string, unknown> | undefined, paramCodes: readonly string[]): Record<string, unknown>;
/**
 * Разворачивает значение sourceContextPaths в плоский объект полей.
 * UI хранит dataProcess/dataMart/modelService как массив записей — берём первую.
 */
export declare function flattenSourceContextValue(value: unknown): Record<string, unknown>;
export type LaborFieldValueWithSource = {
    value: unknown;
    sourceLabel: string | null;
};
/** Ищет все вхождения поля по коду с подписью арх-компонента (name и т.п.). */
export declare function findFieldValuesWithSourceLabels(formData: Record<string, unknown>, fieldCode: string): LaborFieldValueWithSource[];
/** Ищет значение поля по коду в глубине formData (массивы арх. блоков и т.п.). */
export declare function findFieldValueInFormData(formData: Record<string, unknown>, fieldCode: string): unknown;
/** Контекст для коэффициентов: строка arch-компонента + поля formData вне строки (generalInfo и т.д.). */
export declare function buildLaborCoefficientLookupSource(source: Record<string, unknown>, formData: Record<string, unknown>, schemaParams: ReadonlyArray<{
    code: string;
    name?: string | null;
    schemaPointer?: string | null;
}>, paramCodes: readonly string[]): Record<string, unknown>;
/** Сопоставление значения поля анкеты с кодом/меткой из справочника или схемы. */
export declare function laborValueMatches(actual: unknown, valueCode: string | null | undefined, valueLabel: string | null | undefined): boolean;
export declare function matchSingleTypicalWorkRuleForTriggerFormula(rule: TypicalWorkRuleLike, source: Record<string, unknown>): boolean;
/** Все параметры-триггеры (И) и опционально глобальное условие по количеству компонентов. */
export declare function typicalWorkRulesMatchSource(rules: TypicalWorkRuleLike[], source: Record<string, unknown>, formData?: Record<string, unknown>, triggerArchCount?: TypicalWorkTriggerArchCountLike | null, matchContext?: TypicalWorkTriggerMatchContext): boolean;
/**
 * Устаревший paramCode в триггере (после пересоздания поля в схеме):
 * перепривязка по имени параметра через schemaParams.
 */
export declare function remapTriggerRulesToSchemaParams(rules: TypicalWorkRuleLike[], schemaParams?: ReadonlyArray<{
    code: string;
    name?: string | null;
}> | null): TypicalWorkRuleLike[];
export declare function hasTypicalWorkTriggersConfiguredSimple(rules: TypicalWorkRuleLike[], triggerArchCount?: TypicalWorkTriggerArchCountLike | null): boolean;
export declare function resolveLaborCoefficient(source: Record<string, unknown>, paramCode: string, valueCode: string | null, valueLabel: string | null, paramName?: string | null): boolean;
export declare function resolveLaborAnyOfCoefficient(source: Record<string, unknown>, paramCode: string, anyOf: {
    valueCodes: string[];
    valueLabels: string[];
    coeffOn: number;
    coeffOff: number;
}, paramName?: string | null): number;
export type ByValueLaborCoefficientRow = {
    paramCode: string;
    paramName?: string | null;
    valueCode: string | null;
    valueLabel: string | null;
    coefficient: number;
};
export type LaborCoefficientAnswerPart = {
    sourceLabel: string | null;
    answerLabel: string;
    coefficient: number;
};
export type LaborCoefficientResolvedDetail = {
    paramCode: string;
    value: number;
    aggregation: "single" | "max";
    /** Подстановка в разборе формулы: `0.5` или `max(0.5, 1)`. */
    formulaValueLabel: string;
    parts: LaborCoefficientAnswerPart[];
};
/**
 * Детальный разбор коэффициента «по значениям» для одного source-контекста
 * (per-instance: скаляр текущего экземпляра).
 */
export declare function resolveByValueLaborParamCoefficientDetails(source: Record<string, unknown>, rows: readonly ByValueLaborCoefficientRow[], _formData?: Record<string, unknown> | null): Record<string, LaborCoefficientResolvedDetail>;
/** Коэффициенты режима «По значениям» по фактическому ответу в анкете. */
export declare function resolveByValueLaborParamCoefficients(source: Record<string, unknown>, rows: readonly ByValueLaborCoefficientRow[], _formData?: Record<string, unknown> | null): Record<string, number>;
export type TypicalWorkAnyOfLaborParamLike = {
    paramCode: string;
    paramName?: string | null;
    anyOf: {
        valueCodes: string[];
        valueLabels: string[];
        coeffOn: number;
        coeffOff: number;
    };
};
/**
 * Резолвер коэффициента фактора формулы: сначала рассчитанные значения,
 * затем any_of по фактическому ответу (в т.ч. «выкл» при отсутствии/снятом чекбоксе).
 */
export declare function buildTypicalWorkFactorCoeffResolver(params: {
    paramCoefficients: Record<string, number>;
    anyOfParams: readonly TypicalWorkAnyOfLaborParamLike[];
    source: Record<string, unknown>;
}): (paramCode: string) => number;
