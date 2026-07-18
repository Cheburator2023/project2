import { describe, expect, it } from "vitest";
import { describeTypicalWorkTriggerConditions } from "./v2-trigger-formula.util";
describe("describeTypicalWorkTriggerConditions", () => {
    it("renders simple trigger formula", () => {
        expect(describeTypicalWorkTriggerConditions({
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
    it("renders always-shown trigger without ≠ пусто", () => {
        expect(describeTypicalWorkTriggerConditions({
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
