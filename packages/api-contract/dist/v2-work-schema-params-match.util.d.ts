import type { TypicalWorkRuleLike, TypicalWorkTriggerArchCountLike } from "./v2-works-catalog-match.util";
/** Минимальное описание поля схемы для сопоставления с legacy-кодами каталога. */
export type WorkSchemaParamDef = {
    code: string;
    name: string;
    description?: string | null;
    /** Архитектурный компонент поля из ближайшего ui:options.archComponent. */
    archComponent?: string | null;
    schemaFieldUid?: string | null;
    schemaPointer?: string | null;
    sourceKeys?: string[];
    values?: Array<{
        code: string;
        label: string;
    }>;
    /** ui:options.dictionaryCode — для сверки значений с живым справочником. */
    dictionaryCode?: string | null;
};
export type TypicalWorkRuleRefLike = {
    paramCode: string;
    paramName?: string | null;
    schemaFieldUid?: string | null;
};
/**
 * Нормализует legacy-ярлыки каталога (АвтоМЛ / Маркер / mdlctl) к названиям полей схемы.
 */
export declare function normalizeLegacySchemaParamLabel(name: string): string;
/** Нормализует legacy paramCode (`автомл_*`, `*_в_маркере`, mdlctl CSV) к коду/slug поля схемы. */
export declare function normalizeLegacySchemaParamCode(code: string): string;
/** Labor-параметр из устаревшего CSV без поля схемы (безопасно удалить при sync). */
export declare function isObsoleteCatalogLaborParam(ref: {
    paramCode?: string | null;
    paramName?: string | null;
}): boolean;
export declare function findWorkSchemaParameter<T extends WorkSchemaParamDef>(params: T[], paramCode: string, paramName?: string | null): T | undefined;
/** CSV/seed-триггер → поле схемы анкеты (алиас «Тип источника» → `type`). */
export declare function resolveWorkSchemaParamForRule<T extends WorkSchemaParamDef>(rule: TypicalWorkRuleRefLike, params: T[]): T | undefined;
export declare function resolveTypicalWorkRulesForSourceMatch<T extends TypicalWorkRuleLike>(rules: T[], schemaParams: WorkSchemaParamDef[] | undefined): T[];
export declare function typicalWorkRulesMatchSourceWithSchema(rules: TypicalWorkRuleLike[], source: Record<string, unknown>, schemaParams?: WorkSchemaParamDef[], formData?: Record<string, unknown>, triggerArchCount?: TypicalWorkTriggerArchCountLike | null): boolean;
export type LaborCoefficientRowRef = {
    paramCode: string;
    paramName?: string | null;
    valueCode: string | null;
    valueLabel: string | null;
    coefficient: number;
};
export declare function remapLaborCoefficientRowsForSchema<T extends LaborCoefficientRowRef>(rows: readonly T[], schemaParams: WorkSchemaParamDef[] | undefined): T[];
