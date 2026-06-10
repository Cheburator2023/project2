import { describe, expect, it } from "vitest";
import {
	binaryEnumCoeffKey,
	coerceBinaryBooleanFormValue,
	isBinaryBooleanEnum,
	isPositiveBinaryFormValue,
} from "./v2-binary-boolean-schema.util";

describe("v2-binary-boolean-schema.util", () => {
	it("detects yes/no and required enums", () => {
		expect(isBinaryBooleanEnum(["Да", "Нет"])).toBe(true);
		expect(isBinaryBooleanEnum(["Нет", "Да"])).toBe(true);
		expect(isBinaryBooleanEnum(["Требуется", "Не требуется"])).toBe(true);
		expect(isBinaryBooleanEnum(["Требуется MVP", "Не требуется"])).toBe(false);
		expect(isBinaryBooleanEnum(["Есть", "Нет"])).toBe(false);
	});

	it("coerces legacy strings and booleans", () => {
		expect(coerceBinaryBooleanFormValue(true)).toBe(true);
		expect(coerceBinaryBooleanFormValue("Да")).toBe(true);
		expect(coerceBinaryBooleanFormValue("Требуется")).toBe(true);
		expect(coerceBinaryBooleanFormValue("Нет")).toBe(false);
		expect(isPositiveBinaryFormValue("Не требуется")).toBe(false);
	});

	it("maps coeff keys for boolean values", () => {
		expect(binaryEnumCoeffKey(true)).toBe("Да");
		expect(binaryEnumCoeffKey(false)).toBe("Нет");
		expect(binaryEnumCoeffKey(true, "Требуется")).toBe("Требуется");
		expect(binaryEnumCoeffKey(false, "Требуется")).toBe("Не требуется");
	});
});
