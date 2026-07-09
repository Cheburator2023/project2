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

	it("falls back to stream-level fields when sourceSystems is empty", () => {
		expect(
			resolvePreviewSourceRowForTypicalWork({
				streamDataSources: {
					groupKirilla: { field_room: "Кухня" },
				},
			}),
		).toEqual({ field_room: "Кухня" });
	});

	it("ignores empty sourceSystems row and uses stream-level fields", () => {
		expect(
			resolvePreviewSourceRowForTypicalWork({
				detailInfo: {
					sourceSystems: [{}],
				},
				streamDataSources: {
					groupKirilla: { field_room: "Кухня" },
				},
			}),
		).toEqual({ field_room: "Кухня" });
	});

	it("uses root-level trigger fields for minimal schemas", () => {
		const uiSchema = {
			field_SId8TZKZ: { "ui:options": { archComponent: "typicalWork" } },
		};
		const jsonSchema = {
			type: "object",
			properties: {
				field_KQX2OsDx: { type: "string" },
				field_SId8TZKZ: { type: "array", items: { type: "object" } },
			},
		};

		expect(
			resolvePreviewSourceRowForTypicalWork(
				{ field_KQX2OsDx: "Непосредственно" },
				uiSchema,
				jsonSchema,
			),
		).toEqual({ field_KQX2OsDx: "Непосредственно" });
	});
});
