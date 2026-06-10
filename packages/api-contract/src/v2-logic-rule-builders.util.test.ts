import { describe, expect, it } from "vitest";
import {
	buildBooleanVisibilityRule,
	v2JsonPointerToVarPath,
} from "./v2-logic-rule-builders.util";

describe("v2-logic-rule-builders.util", () => {
	it("maps JSON Pointer to var path", () => {
		expect(v2JsonPointerToVarPath("/detailInfo/parameters/streamsOutsideDADM")).toBe(
			"detailInfo.parameters.streamsOutsideDADM",
		);
	});

	it("builds visibility rule for checked boolean", () => {
		const rule = buildBooleanVisibilityRule({
			id: "test",
			targetPointer: "/detailInfo/parameters/streamNames",
			sourcePointer: "/detailInfo/parameters/streamsOutsideDADM",
			description: "Названия стримов при галочке.",
		});

		expect(rule).toMatchObject({
			kind: "visibility",
			targetPath: "/detailInfo/parameters/streamNames",
			dependencies: ["/detailInfo/parameters/streamsOutsideDADM"],
			condition: {
				"==": [{ var: "detailInfo.parameters.streamsOutsideDADM" }, true],
			},
			description: "Названия стримов при галочке.",
		});
	});
});
