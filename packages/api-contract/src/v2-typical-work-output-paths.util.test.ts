import { describe, expect, it } from "vitest";
import {
	clearStaleGeneratedTypicalWorkPaths,
	listAllGeneratedTypicalWorkArrayPaths,
} from "./v2-typical-work-output-paths.util";

describe("v2-typical-work-output-paths.util", () => {
	it("lists uiSchema and legacy generated typical work paths", () => {
		const paths = listAllGeneratedTypicalWorkArrayPaths({
			field_OFmNQhnL: { "ui:options": { archComponent: "typicalWork" } },
		});
		expect(paths).toContain("field_OFmNQhnL");
		expect(paths).toContain("streamDataSources.sourceTypicalTasks");
		expect(paths).toContain("detailInfo.detailTypicalTasks");
	});

	it("clears legacy fan-out paths when custom output is replaced", () => {
		const staleRow = { name: "ееее", total: 10 };
		const next = clearStaleGeneratedTypicalWorkPaths(
			{
				field_OFmNQhnL: [staleRow],
				streamDataSources: { sourceTypicalTasks: [staleRow] },
				detailInfo: { detailTypicalTasks: [staleRow] },
				streamModelControl: { "field_Khn6-HAW": [staleRow] },
			},
			"field_OFmNQhnL",
			{
				field_OFmNQhnL: { "ui:options": { archComponent: "typicalWork" } },
			},
		);

		expect(
			(next.field_OFmNQhnL as Array<{ name: string }>)[0]?.name,
		).toBe("ееее");
		expect(
			(next.streamDataSources as { sourceTypicalTasks: unknown[] })
				.sourceTypicalTasks,
		).toEqual([]);
		expect(
			(next.detailInfo as { detailTypicalTasks: unknown[] }).detailTypicalTasks,
		).toEqual([]);
		expect(
			(next.streamModelControl as { "field_Khn6-HAW": unknown[] })[
				"field_Khn6-HAW"
			],
		).toEqual([]);
	});

	it("does not clear sibling typicalWork blocks when replacing one output path", () => {
		const staleRow = { name: "stale", total: 10 };
		const activeRow = { name: "active", total: 20 };
		const next = clearStaleGeneratedTypicalWorkPaths(
			{
				field_a: [activeRow],
				field_b: [staleRow],
				streamDataSources: { sourceTypicalTasks: [staleRow] },
			},
			"field_a",
			{
				field_a: { "ui:options": { archComponent: "typicalWork" } },
				field_b: { "ui:options": { archComponent: "typicalWork" } },
			},
		);

		expect((next.field_a as Array<{ name: string }>)[0]?.name).toBe("active");
		expect((next.field_b as Array<{ name: string }>)[0]?.name).toBe("stale");
		expect(
			(next.streamDataSources as { sourceTypicalTasks: unknown[] })
				.sourceTypicalTasks,
		).toEqual([]);
	});
});
