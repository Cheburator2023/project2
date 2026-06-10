"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_binary_boolean_schema_util_1 = require("./v2-binary-boolean-schema.util");
(0, vitest_1.describe)("v2-binary-boolean-schema.util", () => {
    (0, vitest_1.it)("detects yes/no and required enums", () => {
        (0, vitest_1.expect)((0, v2_binary_boolean_schema_util_1.isBinaryBooleanEnum)(["Да", "Нет"])).toBe(true);
        (0, vitest_1.expect)((0, v2_binary_boolean_schema_util_1.isBinaryBooleanEnum)(["Нет", "Да"])).toBe(true);
        (0, vitest_1.expect)((0, v2_binary_boolean_schema_util_1.isBinaryBooleanEnum)(["Требуется", "Не требуется"])).toBe(true);
        (0, vitest_1.expect)((0, v2_binary_boolean_schema_util_1.isBinaryBooleanEnum)(["Требуется MVP", "Не требуется"])).toBe(false);
        (0, vitest_1.expect)((0, v2_binary_boolean_schema_util_1.isBinaryBooleanEnum)(["Есть", "Нет"])).toBe(false);
    });
    (0, vitest_1.it)("coerces legacy strings and booleans", () => {
        (0, vitest_1.expect)((0, v2_binary_boolean_schema_util_1.coerceBinaryBooleanFormValue)(true)).toBe(true);
        (0, vitest_1.expect)((0, v2_binary_boolean_schema_util_1.coerceBinaryBooleanFormValue)("Да")).toBe(true);
        (0, vitest_1.expect)((0, v2_binary_boolean_schema_util_1.coerceBinaryBooleanFormValue)("Требуется")).toBe(true);
        (0, vitest_1.expect)((0, v2_binary_boolean_schema_util_1.coerceBinaryBooleanFormValue)("Нет")).toBe(false);
        (0, vitest_1.expect)((0, v2_binary_boolean_schema_util_1.isPositiveBinaryFormValue)("Не требуется")).toBe(false);
    });
    (0, vitest_1.it)("maps coeff keys for boolean values", () => {
        (0, vitest_1.expect)((0, v2_binary_boolean_schema_util_1.binaryEnumCoeffKey)(true)).toBe("Да");
        (0, vitest_1.expect)((0, v2_binary_boolean_schema_util_1.binaryEnumCoeffKey)(false)).toBe("Нет");
        (0, vitest_1.expect)((0, v2_binary_boolean_schema_util_1.binaryEnumCoeffKey)(true, "Требуется")).toBe("Требуется");
        (0, vitest_1.expect)((0, v2_binary_boolean_schema_util_1.binaryEnumCoeffKey)(false, "Требуется")).toBe("Не требуется");
    });
});
