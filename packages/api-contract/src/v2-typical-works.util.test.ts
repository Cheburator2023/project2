import { describe, expect, it } from "vitest";
import {
	flattenTypicalWorkStreamTriggerFields,
	hasTypicalWorkStreamTriggerContext,
	isFilledTypicalWorkSourceRow,
	readFilledArchComponentListRows,
	readTypicalWorksStreamTriggerContext,
} from "./v2-typical-works.util";

describe("v2-typical-works.util stream trigger context", () => {
	it("flattens nested group fields by leaf key", () => {
		expect(
			flattenTypicalWorkStreamTriggerFields({
				groupKirilla: {
					field_dropdown: "Кухня",
					field_number: 322,
				},
				sourceTypicalTasks: [{ name: "skip", estimateHoursPerDay: 1 }],
			}),
		).toEqual({
			field_dropdown: "Кухня",
			field_number: 322,
		});
	});

	it("reads stream trigger context without sourceSystems rows", () => {
		const context = readTypicalWorksStreamTriggerContext(
			{
				generalInfo: {
					modelService: [{ field_o_HRj6VO: true }],
				},
				streamDataSources: {
					groupKirilla: { field_dropdown: "Кухня" },
					localParams: { entityVolume: "Большое" },
				},
			},
			"streamDataSources.sourceTypicalTasks",
		);
		expect(context.field_o_HRj6VO).toBe(true);
		expect(context.field_dropdown).toBe("Кухня");
		expect(hasTypicalWorkStreamTriggerContext(context)).toBe(true);
	});

	it("reads stream trigger context without sourceSystems rows (legacy)", () => {
		const context = readTypicalWorksStreamTriggerContext(
			{
				streamDataSources: {
					groupKirilla: { field_dropdown: "Кухня" },
					localParams: { entityVolume: "Большое" },
				},
			},
			"streamDataSources.sourceTypicalTasks",
		);

		expect(context.field_dropdown).toBe("Кухня");
		expect(context.entityVolume).toBe("Большое");
		expect(hasTypicalWorkStreamTriggerContext(context)).toBe(true);
	});

	it("reads root-level form fields when output is not under a stream block", () => {
		const context = readTypicalWorksStreamTriggerContext(
			{
				field_KQX2OsDx: "Непосредственно",
				field_SId8TZKZ: [],
				meta: { status: "Активная" },
			},
			"field_SId8TZKZ",
		);

		expect(context.field_KQX2OsDx).toBe("Непосредственно");
		expect(context.field_SId8TZKZ).toBeUndefined();
		expect(hasTypicalWorkStreamTriggerContext(context)).toBe(true);
	});

	it("reads model-stream MVP from generalInfo when output is controlTypicalTasks", () => {
		const formData = {
			generalInfo: {
				modelService: [{ field_o_HRj6VO: true }],
			},
		};
		const context = readTypicalWorksStreamTriggerContext(
			formData,
			"generalInfo.modelService.controlTypicalTasks",
		);
		expect(context.field_o_HRj6VO).toBe(true);
	});

	it("treats empty sourceSystems row as unfilled", () => {
		expect(isFilledTypicalWorkSourceRow({})).toBe(false);
		expect(isFilledTypicalWorkSourceRow({ type: "", name: "" })).toBe(false);
		expect(isFilledTypicalWorkSourceRow({ field_room: "Кухня" })).toBe(true);
	});

	it("reads filled arch object list rows from array or singleton object", () => {
		expect(
			readFilledArchComponentListRows([{ field_o_HRj6VO: true }]),
		).toEqual([{ field_o_HRj6VO: true }]);
		expect(
			readFilledArchComponentListRows({ field_o_HRj6VO: true }),
		).toEqual([{ field_o_HRj6VO: true }]);
		expect(readFilledArchComponentListRows([{}])).toEqual([]);
	});
});
