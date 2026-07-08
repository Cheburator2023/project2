import { describe, expect, it } from "vitest";
import { resolvePreviewSourceRowForTypicalWork } from "./typicalWorkTriggerPreview";

describe("resolvePreviewSourceRowForTypicalWork", () => {
	it("picks the first source row (stream split removed)", () => {
		const row = resolvePreviewSourceRowForTypicalWork({
			detailInfo: {
				sourceSystems: [
					{ name: "A", type: "Внутренний" },
					{ name: "B", type: "Внешний" },
				],
			},
		});

		expect(row).toEqual({ name: "A", type: "Внутренний" });
	});

	it("returns undefined when preview has no source systems", () => {
		expect(
			resolvePreviewSourceRowForTypicalWork({ detailInfo: {} }),
		).toBeUndefined();
	});
});
