/**
 * Раньше имя резали под varchar(255); при длинных alias суффикс съедал весь
 * displayName → `" @ field|…"` и bulk dryRun вечно «чинил» paramName.
 * Колонки расширены (param_name 1000 / formula_text text) — не обрезаем.
 */
export declare function formatParamNameWithSourceKeys(name: string, sourceKeys?: readonly string[]): string;
export declare function parseParamNameSourceKeys(paramName: string | null | undefined): {
    displayName: string;
    sourceKeys: string[];
};
export declare function stripParamNameSourceKeys(paramName: string | null | undefined): string;
