"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_csv_formula_import_util_1 = require("./v2-csv-formula-import.util");
(0, vitest_1.describe)("v2-csv-formula-import.util", () => {
    (0, vitest_1.it)("parses CSV rows with multiline labor params", () => {
        const csv = `Стрим;Арх. Компонент;Название оригинальное;Название в смарт-анкете СУМ;Контекст;Тип работы;Наличие норматива;Параметр-триггер;Параметры трудоемкости;Формула
ИД. Внешний;Арх. Компонент. Система-источник;Work;Этап 214. Work;Этап 214;Опциональная;0,7;Trigger;"1. Param A
2. Param B";"ЧД(работы) = ОКРУГЛ.ВВЕРХ(Норматив × [Param A] × [Param B]; 0,1)"`;
        const rows = (0, v2_csv_formula_import_util_1.parseCsvFormulaImportRows)(csv);
        (0, vitest_1.expect)(rows).toHaveLength(1);
        (0, vitest_1.expect)(rows[0]?.laborParams).toEqual(["Param A", "Param B"]);
        (0, vitest_1.expect)(rows[0]?.name).toBe("Work");
    });
    (0, vitest_1.it)("keeps commas inside trigger values and splits multiline triggers", () => {
        (0, vitest_1.expect)((0, v2_csv_formula_import_util_1.parseCsvTriggerRules)("Тип системы-источника (внешний), Пилот (первичный, повторный)\nНеобходима продуктивизация")).toEqual([
            {
                paramName: "Тип системы-источника",
                operator: "=",
                values: ["Внешний"],
            },
            {
                paramName: "Пилот",
                operator: "in",
                values: ["Первичный", "Повторный"],
            },
            {
                paramName: "Необходима продуктивизация",
                operator: "=",
                values: ["Да"],
            },
        ]);
    });
    (0, vitest_1.it)("marks an explicitly undefined trigger as unresolved", () => {
        (0, vitest_1.expect)((0, v2_csv_formula_import_util_1.parseCsvTriggerRules)("Не понятно условие появления работ")).toEqual([
            {
                paramName: "Не понятно условие появления работ",
                operator: "unresolved",
                values: [],
            },
        ]);
    });
    (0, vitest_1.it)("parses model-stream triggers without splitting param names on «и»", () => {
        (0, vitest_1.expect)((0, v2_csv_formula_import_util_1.parseModelStreamTriggerRules)("Необходимость продуктивизации и количество дополнительных витрин ≠ «Не требуется»")).toEqual([
            {
                paramName: "Необходимость продуктивизации и количество дополнительных витрин",
                operator: "!=",
                values: ["Не требуется"],
            },
        ]);
        (0, vitest_1.expect)((0, v2_csv_formula_import_util_1.parseModelStreamTriggerRules)("Каналы внедрения ≠ Пусто")).toEqual([
            {
                paramName: "Каналы внедрения",
                operator: "exists",
                values: [],
            },
        ]);
        (0, vitest_1.expect)((0, v2_csv_formula_import_util_1.parseModelStreamTriggerRules)("Необходимость AutoML = «Да» И Каналы внедрения ≠ Пусто")).toEqual([
            {
                paramName: "Необходимость AutoML",
                operator: "=",
                values: ["Да"],
            },
            {
                paramName: "Каналы внедрения",
                operator: "exists",
                values: [],
            },
        ]);
    });
    (0, vitest_1.it)("reads model-stream trigger from «Результат выбора» when param column is name-only", () => {
        (0, vitest_1.expect)((0, v2_csv_formula_import_util_1.extractTriggerTextFromResultChoice)('Триггер: Необходимость пилота (MVP) = «Да» (иначе Итог = 0).\nНорматив: 40 чел-дн.')).toBe("Необходимость пилота (MVP) = «Да»");
        const csv = `"Стрим";"Арх. Компонент";"Название в смарт-анкете СУМ";"Наличие норматива";"Параметр-триггер";"Параметры трудоемкости";"Коэффициенты параметров трудоёмкости";"Формула";"Результат выбора"
"Модельный стрим";"Арх. Компонент. Модель";"05А. Разработка пилотной модели (MVP)";"40";"Необходимость пилота (MVP)";"Сложность постановки";"1→1";"N";"Триггер: Необходимость пилота (MVP) = «Да» (иначе Итог = 0)."`;
        const row = (0, v2_csv_formula_import_util_1.parseCsvFormulaImportRows)(csv)[0];
        (0, vitest_1.expect)(row?.triggerRules).toEqual([
            {
                paramName: "Необходимость пилота (MVP)",
                operator: "=",
                values: ["Да"],
            },
        ]);
    });
    (0, vitest_1.it)("does not turn explanatory dash text into labor params", () => {
        const csv = `Стрим;Арх. Компонент;Название оригинальное;Название в смарт-анкете СУМ;Контекст;Тип работы;Наличие норматива;Параметр-триггер;Параметры трудоемкости;Формула
ИД. Внешний;Арх. Компонент. Объект данных;Work;Этап 220. Work;Этап 220;Опциональная;0,8;Trigger;"— (параметры те же, что у этапа 217)";"ЧД(работы) = ОКРУГЛ.ВВЕРХ(Норматив; 0,1)"`;
        (0, vitest_1.expect)((0, v2_csv_formula_import_util_1.parseCsvFormulaImportRows)(csv)[0]?.laborParams).toEqual([]);
    });
    (0, vitest_1.it)("extracts CEIL formula core", () => {
        const extracted = (0, v2_csv_formula_import_util_1.extractFormulaCoreFromCsvText)("ЧД(работы) = ОКРУГЛ.ВВЕРХ(Норматив × [Сложность предметной области] × [NDA]; 0,1)");
        (0, vitest_1.expect)(extracted?.core).toBe("Норматив × [Сложность предметной области] × [NDA]");
        (0, vitest_1.expect)(extracted?.roundingMode).toBe("CEIL");
        (0, vitest_1.expect)(extracted?.roundingStep).toBe(0.1);
    });
    (0, vitest_1.it)("builds N * coef formula text", () => {
        const built = (0, v2_csv_formula_import_util_1.buildFormulaTextFromCsvCore)("Норматив × [Param A] × [Param B]", (label) => label === "Param A"
            ? "param_a"
            : label === "Param B"
                ? "param_b"
                : null);
        (0, vitest_1.expect)(built.formulaText).toBe("N * коэф(param_a) * коэф(param_b)");
        (0, vitest_1.expect)(built.unmatchedParams).toEqual([]);
    });
    (0, vitest_1.it)("builds full formula from csv row", () => {
        const build = (0, v2_csv_formula_import_util_1.buildFormulaFromCsvRow)({
            formulaRaw: "ЧД(работы) = ОКРУГЛ.ВВЕРХ(Норматив × [Сложность предметной области]; 0,1)",
            laborParams: ["Сложность предметной области"],
        }, []);
        (0, vitest_1.expect)(build?.formulaText).toContain("N * коэф(");
        (0, vitest_1.expect)(build?.unmatchedParams).toEqual([]);
        (0, vitest_1.expect)(build?.parseError).toBeNull();
    });
    (0, vitest_1.it)("resolves param via partial name match", () => {
        const code = (0, v2_csv_formula_import_util_1.resolveCsvParamCode)("Сложность предметной области", [
            { name: "Сложность предметной области (методология)", code: "slozhnost" },
        ]);
        (0, vitest_1.expect)(code).toBe("slozhnost");
    });
    (0, vitest_1.it)("parses per-work coefficient values from formula prose", () => {
        const parsed = (0, v2_csv_formula_import_util_1.parseCsvLaborCoefficients)(`Переменные — параметры трудоёмкости (Ki, по умолчанию = 1):
  — Сложность реализации: Низкая→0.75; Средняя→1; Высокая→1.5; Неизвестно→1.25
  — Пилот: Первичный→1.1; Повторный→0.75; Не требуется→ работы исключаются
  — Наличие реплики в DAPP: Да (есть реплика)→1; Нет (нет реплики)→1.5

Операнды: «×» — умножение`);
        (0, vitest_1.expect)(parsed).toEqual([
            {
                paramName: "Сложность реализации",
                values: [
                    { label: "Низкая", coefficient: 0.75 },
                    { label: "Средняя", coefficient: 1 },
                    { label: "Высокая", coefficient: 1.5 },
                    { label: "Неизвестно", coefficient: 1.25 },
                ],
            },
            {
                paramName: "Пилот",
                values: [
                    { label: "Первичный", coefficient: 1.1 },
                    { label: "Повторный", coefficient: 0.75 },
                ],
            },
            {
                paramName: "Наличие реплики в DAPP",
                values: [
                    { label: "Да", coefficient: 1 },
                    { label: "Нет", coefficient: 1.5 },
                ],
            },
        ]);
    });
    (0, vitest_1.it)("applies component-specific coefficient override", () => {
        const formula = `Переменные — параметры трудоёмкости (Ki, по умолчанию = 1):
  — Требуется хэширование/ шифрование: Да→1.25; Нет→0.75; Неизвестно→1 (на «Система-источник» Нет→0.9)

Операнды: «×» — умножение`;
        (0, vitest_1.expect)((0, v2_csv_formula_import_util_1.parseCsvLaborCoefficients)(formula, "Система-источник")).toEqual([
            {
                paramName: "Требуется хэширование/ шифрование",
                values: [
                    { label: "Да", coefficient: 1.25 },
                    { label: "Нет", coefficient: 0.9 },
                    { label: "Неизвестно", coefficient: 1 },
                ],
            },
        ]);
        (0, vitest_1.expect)((0, v2_csv_formula_import_util_1.parseCsvLaborCoefficients)(formula, "Объект / Витрина данных")[0]?.values).toEqual([
            { label: "Да", coefficient: 1.25 },
            { label: "Нет", coefficient: 0.75 },
            { label: "Неизвестно", coefficient: 1 },
        ]);
    });
    (0, vitest_1.it)("expands Kдоля through the calibration multiplier", () => {
        const build = (0, v2_csv_formula_import_util_1.buildFormulaFromCsvRow)({
            formulaRaw: `ЧД(работы) = ОКРУГЛ.ВВЕРХ(Норматив × Kдоля(Этап 217); 0,1)
Исходная (калибровочная) формула: ЧД(работы) = ОКРУГЛ.ВВЕРХ(0,5 × (1 + 0,46 × ([Пилот] × [Сложность предметной области])); 0,1)`,
            laborParams: [],
        }, [
            { name: "Пилот", code: "pilot" },
            {
                name: "Сложность предметной области",
                code: "domain_complexity",
            },
        ]);
        (0, vitest_1.expect)(build).toMatchObject({
            formulaText: "N * (1 + 0.46 * (коэф(pilot) * коэф(domain_complexity)))",
            inferredLaborParams: ["Пилот", "Сложность предметной области"],
            skippedSpecial: [],
            parseError: null,
        });
    });
    (0, vitest_1.it)("rejects an override that disconnects formula and labor param codes", () => {
        const row = (0, v2_csv_formula_import_util_1.parseCsvFormulaImportRows)(`Стрим;Арх. Компонент;Название оригинальное;Название в смарт-анкете СУМ;Контекст;Тип работы;Наличие норматива;Параметр-триггер;Параметры трудоемкости;Формула
ИД. Внутренний;Арх. Компонент. Система-источник;Work;Этап 210. Work;Этап 210;Опциональная;1;Тип системы-источника (внутренний);1. Наличие реплики в DAPP;"ЧД(работы) = ОКРУГЛ.ВВЕРХ(Норматив × [Наличие реплики в DAPP]; 0,1)"`)[0];
        const result = (0, v2_csv_formula_import_util_1.csvRowToCatalogPatch)(row, [], {
            "Наличие реплики в DAPP": "другой_код",
        });
        (0, vitest_1.expect)(result.patch).toBeNull();
        (0, vitest_1.expect)(result.build?.unmatchedParams).toContain("formula-code:другой_код");
    });
});
