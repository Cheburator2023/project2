import { describe, expect, it } from "vitest";
import {
	buildUnifiedAtypicalTotalRule,
	collectAtypicalWorkArrayPaths,
	patchV2AtypicalWorksLogicRules,
} from "./v2-atypical-works-logic.util";

describe("v2-atypical-works-logic.util", () => {
	it("collects atypicalWork array paths from uiSchema", () => {
		const paths = collectAtypicalWorkArrayPaths({
			detailInfo: {
				field_npwqpBHt: {
					"ui:options": { archComponent: "atypicalWork" },
				},
			},
			streamDataSources: {
				field_eCyDEFw3: {
					"ui:options": { archComponent: "atypicalWork" },
				},
			},
		});

		expect(paths).toEqual([
			"detailInfo.field_npwqpBHt",
			"streamDataSources.field_eCyDEFw3",
		]);
	});

	it("injects row_computed and unified-atypical-total rules", () => {
		const patched = patchV2AtypicalWorksLogicRules(
			{ rules: [] },
			{
				uiSchema: {
					detailInfo: {
						field_npwqpBHt: {
							"ui:options": { archComponent: "atypicalWork" },
						},
					},
				},
			},
		);

		const ids = patched.rules?.map((rule) => rule.id) ?? [];
		expect(ids).toContain("unified-atypical-total");
		expect(ids).toContain("unified-atypical-row-total:detailInfo_field_npwqpBHt");

		const rowRule = patched.rules?.find(
			(rule) => rule.id === "unified-atypical-row-total:detailInfo_field_npwqpBHt",
		);
		expect(rowRule?.kind).toBe("row_computed");
		expect((rowRule?.payload as { arrayPath?: string })?.arrayPath).toBe(
			"detailInfo.field_npwqpBHt",
		);

		const totalRule = patched.rules?.find((rule) => rule.id === "unified-atypical-total");
		expect(totalRule?.targetPath).toBe("/summary/atypicalTotal");
	});

	it("buildUnifiedAtypicalTotalRule sums multiple paths", () => {
		const rule = buildUnifiedAtypicalTotalRule([
			"detailInfo.field_npwqpBHt",
			"streamDataSources.field_eCyDEFw3",
		]);
		expect(rule?.condition).toMatchObject({
			"+": expect.any(Array),
		});
		expect(rule?.dependencies).toEqual([
			"/detailInfo/field_npwqpBHt",
			"/streamDataSources/field_eCyDEFw3",
		]);
	});
});
