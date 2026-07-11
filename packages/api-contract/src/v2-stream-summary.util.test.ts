import { describe, expect, it } from "vitest";
import { buildExecutorStreamWorkSummaryRows } from "./v2-stream-summary.util";

const uiSchema = {
	streamDataSources: {
		"ui:options": { streamBlock: true, streamExecutor: "Источники данных" },
		sourceTypicalTasks: { "ui:options": { archComponent: "typicalWork" } },
		field_atyp: { "ui:options": { archComponent: "atypicalWork" } },
	},
	field_dadm: {
		"ui:options": { streamBlock: true, streamExecutor: "ДАДМ" },
		field_atyp: { "ui:options": { archComponent: "atypicalWork" } },
	},
	streamOptional: {
		"ui:options": {
			streamBlock: true,
			streamExecutor: "Цифровые агенты",
			groupActivatable: true,
			groupActive: false,
		},
		field_typ: { "ui:options": { archComponent: "typicalWork" } },
	},
};

describe("buildExecutorStreamWorkSummaryRows", () => {
	it("aggregates typical and atypical totals per active stream block", () => {
		const rows = buildExecutorStreamWorkSummaryRows(
			{
				streamDataSources: {
					sourceTypicalTasks: [{ total: 5 }, { total: 3 }],
					field_atyp: [
						{
							estimateHoursPerDay: 2,
							coefficient: 2,
							includeInCalculation: true,
						},
					],
				},
				field_dadm: {
					field_atyp: [{ total: 4, includeInCalculation: true }],
				},
			},
			uiSchema,
		);

		const dadm = rows.find((row) => row.streamExecutor === "ДАДМ");
		const sources = rows.find((row) => row.streamExecutor === "Источники данных");
		expect(sources?.baseTypicalScore).toBe(8);
		expect(sources?.atypicalScore).toBe(4);
		expect(dadm?.baseTypicalScore).toBe(0);
		expect(dadm?.atypicalScore).toBe(4);
	});

	it("includes optional stream block only when group is active", () => {
		const inactive = buildExecutorStreamWorkSummaryRows(
			{
				streamOptional: { field_typ: [{ total: 10 }] },
			},
			uiSchema,
		);
		expect(inactive.some((row) => row.streamExecutor === "Цифровые агенты")).toBe(
			false,
		);

		const active = buildExecutorStreamWorkSummaryRows(
			{
				groupActivation: { streamOptional: true },
				streamOptional: { field_typ: [{ total: 10 }] },
			},
			uiSchema,
		);
		const optional = active.find((row) => row.streamExecutor === "Цифровые агенты");
		expect(optional?.baseTypicalScore).toBe(10);
	});
});
