import { describe, expect, it } from "vitest";
import { resolvePreviewSourceRowForTypicalWork } from "./typicalWorkTriggerPreview";

describe("resolvePreviewSourceRowForTypicalWork", () => {
	it("picks source row matching work stream", () => {
		const row = resolvePreviewSourceRowForTypicalWork(
			{
				detailInfo: {
					sourceSystems: [
						{ name: "A", type: "Внутренний" },
						{ name: "B", type: "Внешний" },
					],
				},
			},
			"ИД. Внешний",
		);

		expect(row).toEqual({ name: "B", type: "Внешний" });
	});

	it("returns undefined when preview has no source systems", () => {
		expect(
			resolvePreviewSourceRowForTypicalWork({ detailInfo: {} }, "ИД. Внутренний"),
		).toBeUndefined();
	});
});
