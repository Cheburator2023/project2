import { describe, expect, it } from "vitest";
import { projectFormDataOntoJsonSchema } from "./v2-form-data-schema-projection.util";

describe("projectFormDataOntoJsonSchema", () => {
	const schema = {
		type: "object",
		properties: {
			generalInfo: {
				type: "object",
				properties: {
					name: { type: "string" },
					stream: {
						type: "string",
						enum: ["A", "B"],
						default: "A",
					},
					newFlag: { type: "boolean", default: false },
				},
			},
			detailInfo: {
				type: "object",
				properties: {
					count: { type: "number", default: 1 },
				},
			},
		},
	};

	it("keeps overlapping values, drops removed params, defaults new ones", () => {
		const source = {
			generalInfo: {
				name: "X",
				stream: "B",
				legacyOnly: "gone",
			},
			removedSection: { a: 1 },
			workflow: { globalStatus: "Утверждена" },
		};

		const { formData, report } = projectFormDataOntoJsonSchema(source, schema);

		expect(formData.generalInfo).toEqual({
			name: "X",
			stream: "B",
			newFlag: false,
		});
		expect(formData.detailInfo).toEqual({ count: 1 });
		expect(formData.workflow).toEqual({ globalStatus: "Утверждена" });
		expect(formData.removedSection).toBeUndefined();
		expect(report.droppedPaths).toEqual([
			"generalInfo.legacyOnly",
			"removedSection",
		]);
		expect(report.defaultedPaths).toEqual([
			"detailInfo.count",
			"generalInfo.newFlag",
		]);
		expect(report.summary).toContain("Не перенесены");
		expect(report.summary).toContain("значения по умолчанию");
	});

	it("replaces enum values missing in new schema with default", () => {
		const source = {
			generalInfo: { stream: "LEGACY" },
		};
		const { formData, report } = projectFormDataOntoJsonSchema(source, schema);
		expect((formData.generalInfo as { stream: string }).stream).toBe("A");
		expect(report.defaultedPaths).toContain("generalInfo.stream");
	});
});
