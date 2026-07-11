import { describe, expect, it } from "vitest";
import {
	appendBoundWorkIdAtPointer,
	filterTypicalWorksForStreamExecutor,
	resolveTypicalWorkDisplayBoundIds,
} from "./typicalWorkBlockBinding";

const catalog = [
	{ id: "w-source", streams: ["Источники данных"] },
	{ id: "w-control", streams: ["Контроль моделей"] },
	{ id: "w-both", streams: ["Источники данных", "ПиРМ"] },
];

describe("typicalWorkBlockBinding", () => {
	it("resolveTypicalWorkDisplayBoundIds filters legacy block by streamExecutor", () => {
		const uiSchema = {
			streamDataSources: {
				"ui:options": { streamBlock: true, streamExecutor: "Источники данных" },
				sourceTypicalTasks: {
					"ui:options": { archComponent: "typicalWork" },
				},
			},
		};
		const ids = resolveTypicalWorkDisplayBoundIds(
			uiSchema,
			"/streamDataSources/sourceTypicalTasks",
			catalog,
			"Источники данных",
		);
		expect(ids).toEqual(["w-source", "w-both"]);
		expect(ids).not.toContain("w-control");
	});

	it("resolveTypicalWorkDisplayBoundIds respects explicit boundWorkIds", () => {
		const uiSchema = {
			field_tw: {
				"ui:options": {
					archComponent: "typicalWork",
					boundWorkIds: ["w-control"],
				},
			},
		};
		const ids = resolveTypicalWorkDisplayBoundIds(
			uiSchema,
			"/field_tw",
			catalog,
			"Источники данных",
		);
		expect(ids).toEqual(["w-control"]);
	});

	it("appendBoundWorkIdAtPointer materializes legacy binding from stream scope", () => {
		const uiSchema = {
			streamDataSources: {
				sourceTypicalTasks: {
					"ui:options": { archComponent: "typicalWork" },
				},
			},
		};
		const next = appendBoundWorkIdAtPointer(
			uiSchema,
			"/streamDataSources/sourceTypicalTasks",
			"w-extra",
			[...catalog, { id: "w-extra", streams: ["Источники данных"] }],
			"Источники данных",
		);
		const opts = (
			next.streamDataSources as Record<string, unknown>
		).sourceTypicalTasks as Record<string, unknown>;
		expect((opts["ui:options"] as { boundWorkIds: string[] }).boundWorkIds).toEqual(
			["w-source", "w-both", "w-extra"],
		);
	});

	it("filterTypicalWorksForStreamExecutor maps DB stream aliases", () => {
		const items = filterTypicalWorksForStreamExecutor(
			[{ id: "w1", streams: ["ИД. Внутренний"] }],
			"Источники данных",
		);
		expect(items.map((item) => item.id)).toEqual(["w1"]);
	});
});
