import { describe, expect, it } from "vitest";
import {
	fingerprintTypicalWorksCompositionAtPath,
	listChangedTypicalWorkCompositionPaths,
} from "./v2-anketa-works-composition.util";

describe("typical works composition fingerprint", () => {
	it("fingerprints sorted workId sets", () => {
		const data = {
			detailInfo: {
				detailTypicalTasks: [
					{ workId: "b" },
					{ workId: "a" },
					{ name: "no-id" },
				],
			},
		};
		expect(
			fingerprintTypicalWorksCompositionAtPath(
				data,
				"detailInfo.detailTypicalTasks",
			),
		).toBe("a,b");
	});

	it("lists only paths with composition change", () => {
		const uiSchema = {
			detailInfo: {
				detailTypicalTasks: {
					"ui:options": {
						archComponent: "typicalWork",
						outputArrayPath: "detailInfo.detailTypicalTasks",
					},
				},
			},
		};
		const prev = {
			detailInfo: { detailTypicalTasks: [{ workId: "a" }] },
		};
		const nextSame = {
			detailInfo: {
				detailTypicalTasks: [{ workId: "a", total: 10 }],
			},
		};
		const nextChanged = {
			detailInfo: {
				detailTypicalTasks: [{ workId: "a" }, { workId: "b" }],
			},
		};
		expect(
			listChangedTypicalWorkCompositionPaths(prev, nextSame, uiSchema),
		).toEqual([]);
		expect(
			listChangedTypicalWorkCompositionPaths(prev, nextChanged, uiSchema),
		).toEqual(["detailInfo.detailTypicalTasks"]);
	});
});
