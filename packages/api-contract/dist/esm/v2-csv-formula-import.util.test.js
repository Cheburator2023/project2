import { describe, expect, it } from "vitest";
import { buildFormulaFromCsvRow, buildFormulaTextFromCsvCore, csvRowToCatalogPatch, extractFormulaCoreFromCsvText, parseCsvFormulaImportRows, parseCsvLaborCoefficients, parseCsvTriggerRules, parseModelStreamTriggerRules, resolveCsvParamCode, } from "./v2-csv-formula-import.util";
describe("v2-csv-formula-import.util", () => {
    it("parses CSV rows with multiline labor params", () => {
        const csv = `Стрим;Арх. Компонент;Название оригинальное;Название в смарт-анкете СУМ;Контекст;Тип работы;Наличие норматива;Параметр-триггер;Параметры трудоемкости;Формула
ИД. Внешний;Арх. Компонент. Система-источник;Work;Этап 214. Work;Этап 214;Опциональная;0,7;Trigger;"1. Param A
2. Param B";"ЧД(работы) = ОКРУГЛ.ВВЕРХ(Норматив × [Param A] × [Param B]; 0,1)"`;
        const rows = parseCsvFormulaImportRows(csv);
        expect(rows).toHaveLength(1);
        expect(rows[0]?.laborParams).toEqual(["Param A", "Param B"]);
        expect(rows[0]?.name).toBe("Work");
    });
    it("keeps commas inside trigger values and splits multiline triggers", () => {
        expect(parseCsvTriggerRules("Тип системы-источника (внешний), Пилот (первичный, повторный)\nНеобходима продуктивизация")).toEqual([
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
    it("marks an explicitly undefined trigger as unresolved", () => {
        expect(parseCsvTriggerRules("Не понятно условие появления работ")).toEqual([
            {
                paramName: "Не понятно условие появления работ",
                operator: "unresolved",
                values: [],
            },
        ]);
    });
    it("parses model-stream triggers without splitting param names on «и»", () => {
        expect(parseModelStreamTriggerRules("Необходимость продуктивизации и количество дополнительных витрин ≠ «Не требуется»")).toEqual([
            {
                paramName: "Необходимость продуктивизации и количество дополнительных витрин",
                operator: "!=",
                values: ["Не требуется"],
            },
        ]);
        expect(parseModelStreamTriggerRules("Каналы внедрения ≠ Пусто")).toEqual([
            {
                paramName: "Каналы внедрения",
                operator: "exists",
                values: [],
            },
        ]);
        expect(parseModelStreamTriggerRules("Необходимость AutoML = «Да» И Каналы внедрения ≠ Пусто")).toEqual([
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
    it("does not turn explanatory dash text into labor params", () => {
        const csv = `Стрим;Арх. Компонент;Название оригинальное;Название в смарт-анкете СУМ;Контекст;Тип работы;Наличие норматива;Параметр-триггер;Параметры трудоемкости;Формула
ИД. Внешний;Арх. Компонент. Объект данных;Work;Этап 220. Work;Этап 220;Опциональная;0,8;Trigger;"— (параметры те же, что у этапа 217)";"ЧД(работы) = ОКРУГЛ.ВВЕРХ(Норматив; 0,1)"`;
        expect(parseCsvFormulaImportRows(csv)[0]?.laborParams).toEqual([]);
    });
    it("extracts CEIL formula core", () => {
        const extracted = extractFormulaCoreFromCsvText("ЧД(работы) = ОКРУГЛ.ВВЕРХ(Норматив × [Сложность предметной области] × [NDA]; 0,1)");
        expect(extracted?.core).toBe("Норматив × [Сложность предметной области] × [NDA]");
        expect(extracted?.roundingMode).toBe("CEIL");
        expect(extracted?.roundingStep).toBe(0.1);
    });
    it("builds N * coef formula text", () => {
        const built = buildFormulaTextFromCsvCore("Норматив × [Param A] × [Param B]", (label) => label === "Param A"
            ? "param_a"
            : label === "Param B"
                ? "param_b"
                : null);
        expect(built.formulaText).toBe("N * коэф(param_a) * коэф(param_b)");
        expect(built.unmatchedParams).toEqual([]);
    });
    it("builds full formula from csv row", () => {
        const build = buildFormulaFromCsvRow({
            formulaRaw: "ЧД(работы) = ОКРУГЛ.ВВЕРХ(Норматив × [Сложность предметной области]; 0,1)",
            laborParams: ["Сложность предметной области"],
        }, []);
        expect(build?.formulaText).toContain("N * коэф(");
        expect(build?.unmatchedParams).toEqual([]);
        expect(build?.parseError).toBeNull();
    });
    it("resolves param via partial name match", () => {
        const code = resolveCsvParamCode("Сложность предметной области", [
            { name: "Сложность предметной области (методология)", code: "slozhnost" },
        ]);
        expect(code).toBe("slozhnost");
    });
    it("parses per-work coefficient values from formula prose", () => {
        const parsed = parseCsvLaborCoefficients(`Переменные — параметры трудоёмкости (Ki, по умолчанию = 1):
  — Сложность реализации: Низкая→0.75; Средняя→1; Высокая→1.5; Неизвестно→1.25
  — Пилот: Первичный→1.1; Повторный→0.75; Не требуется→ работы исключаются
  — Наличие реплики в DAPP: Да (есть реплика)→1; Нет (нет реплики)→1.5

Операнды: «×» — умножение`);
        expect(parsed).toEqual([
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
    it("applies component-specific coefficient override", () => {
        const formula = `Переменные — параметры трудоёмкости (Ki, по умолчанию = 1):
  — Требуется хэширование/ шифрование: Да→1.25; Нет→0.75; Неизвестно→1 (на «Система-источник» Нет→0.9)

Операнды: «×» — умножение`;
        expect(parseCsvLaborCoefficients(formula, "Система-источник")).toEqual([
            {
                paramName: "Требуется хэширование/ шифрование",
                values: [
                    { label: "Да", coefficient: 1.25 },
                    { label: "Нет", coefficient: 0.9 },
                    { label: "Неизвестно", coefficient: 1 },
                ],
            },
        ]);
        expect(parseCsvLaborCoefficients(formula, "Объект / Витрина данных")[0]?.values).toEqual([
            { label: "Да", coefficient: 1.25 },
            { label: "Нет", coefficient: 0.75 },
            { label: "Неизвестно", coefficient: 1 },
        ]);
    });
    it("expands Kдоля through the calibration multiplier", () => {
        const build = buildFormulaFromCsvRow({
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
        expect(build).toMatchObject({
            formulaText: "N * (1 + 0.46 * (коэф(pilot) * коэф(domain_complexity)))",
            inferredLaborParams: ["Пилот", "Сложность предметной области"],
            skippedSpecial: [],
            parseError: null,
        });
    });
    it("rejects an override that disconnects formula and labor param codes", () => {
        const row = parseCsvFormulaImportRows(`Стрим;Арх. Компонент;Название оригинальное;Название в смарт-анкете СУМ;Контекст;Тип работы;Наличие норматива;Параметр-триггер;Параметры трудоемкости;Формула
ИД. Внутренний;Арх. Компонент. Система-источник;Work;Этап 210. Work;Этап 210;Опциональная;1;Тип системы-источника (внутренний);1. Наличие реплики в DAPP;"ЧД(работы) = ОКРУГЛ.ВВЕРХ(Норматив × [Наличие реплики в DAPP]; 0,1)"`)[0];
        const result = csvRowToCatalogPatch(row, [], {
            "Наличие реплики в DAPP": "другой_код",
        });
        expect(result.patch).toBeNull();
        expect(result.build?.unmatchedParams).toContain("formula-code:другой_код");
    });
});
