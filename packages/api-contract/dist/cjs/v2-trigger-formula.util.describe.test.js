"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_trigger_formula_util_1 = require("./v2-trigger-formula.util");
(0, vitest_1.describe)("describeTypicalWorkTriggerConditions", () => {
    (0, vitest_1.it)("renders simple trigger formula", () => {
        (0, vitest_1.expect)((0, v2_trigger_formula_util_1.describeTypicalWorkTriggerConditions)({
            mode: "simple",
            rules: [
                {
                    paramCode: "field_o_HRj6VO",
                    paramName: "Необходимость пилота (MVP)",
                    operator: "=",
                    valueCode: null,
                    valueLabel: "Да",
                },
            ],
        })).toBe("Необходимость пилота (MVP) = Да");
    });
    (0, vitest_1.it)("renders always-shown trigger without ≠ пусто", () => {
        (0, vitest_1.expect)((0, v2_trigger_formula_util_1.describeTypicalWorkTriggerConditions)({
            mode: "simple",
            rules: [
                {
                    paramCode: "__always__",
                    paramName: "Нет — работа выводится всегда",
                    operator: "=",
                    valueCode: null,
                    valueLabel: null,
                },
            ],
        })).toBe("Нет — работа выводится всегда");
    });
});
