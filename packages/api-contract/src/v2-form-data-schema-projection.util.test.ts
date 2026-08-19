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

	it("preserves groupActivation even when it is not a schema property", () => {
		const source = {
			generalInfo: { name: "X" },
			groupActivation: {
				streamDataSources: true,
				streamModelControl: false,
			},
		};
		const { formData, report } = projectFormDataOntoJsonSchema(source, schema);
		expect(formData.groupActivation).toEqual({
			streamDataSources: true,
			streamModelControl: false,
		});
		expect(report.droppedPaths).not.toContain("groupActivation");
		expect(report.droppedPaths).not.toContain(
			"groupActivation.streamDataSources",
		);
	});

	it("keeps additionalProperties map entries that are not in properties", () => {
		const withTags = {
			...schema,
			properties: {
				...schema.properties,
				tags: {
					type: "object",
					additionalProperties: { type: "string" },
				},
			},
		};
		const { formData, report } = projectFormDataOntoJsonSchema(
			{ generalInfo: { name: "X" }, tags: { env: "prod" } },
			withTags,
		);
		expect(formData.tags).toEqual({ env: "prod" });
		expect(report.droppedPaths).not.toContain("tags.env");
	});

	it("keeps typical-work arrays that are not jsonSchema properties", () => {
		const source = {
			generalInfo: {
				name: "X",
				modelService: { controlTypicalTasks: [{ name: "ПиРМ" }] },
			},
			detailInfo: { sourceTypicalTasks: [{ name: "Источник" }] },
			streamDataSources: { sourceTypicalTasks: [{ name: "Стрим" }] },
			streamModelControl: {
				control: { controlTypicalTasks: [{ name: "КМ" }] },
			},
		};
		const { formData, report } = projectFormDataOntoJsonSchema(source, {
			type: "object",
			properties: {
				generalInfo: {
					type: "object",
					properties: {
						name: { type: "string" },
						modelService: { type: "object", properties: {} },
					},
				},
				detailInfo: { type: "object", properties: {} },
				streamDataSources: { type: "object", properties: {} },
				streamModelControl: { type: "object", properties: {} },
			},
		});
		expect(
			(formData.detailInfo as { sourceTypicalTasks: unknown })
				.sourceTypicalTasks,
		).toEqual([{ name: "Источник" }]);
		expect(
			(
				formData.generalInfo as {
					modelService: { controlTypicalTasks: unknown };
				}
			).modelService.controlTypicalTasks,
		).toEqual([{ name: "ПиРМ" }]);
		expect(
			(
				formData.streamDataSources as { sourceTypicalTasks: unknown }
			).sourceTypicalTasks,
		).toEqual([{ name: "Стрим" }]);
		expect(
			(
				formData.streamModelControl as {
					control: { controlTypicalTasks: unknown };
				}
			).control.controlTypicalTasks,
		).toEqual([{ name: "КМ" }]);
		expect(report.droppedPaths).toEqual([]);
	});

	it("does not report workflow schema defaults when workflow is preserved", () => {
		const withWorkflow = {
			type: "object",
			properties: {
				...schema.properties,
				workflow: {
					type: "object",
					properties: {
						globalStatus: { type: "string", default: "Черновик" },
						sections: {
							type: "object",
							properties: {
								generalInfo: { type: "string", default: "Создано" },
							},
						},
					},
				},
			},
		};
		const source = {
			generalInfo: { name: "X" },
			workflow: {
				globalStatus: "Утверждена",
				sections: { generalInfo: "Заполнено" },
			},
		};
		const { formData, report } = projectFormDataOntoJsonSchema(
			source,
			withWorkflow,
		);
		expect(formData.workflow).toEqual(source.workflow);
		expect(report.defaultedPaths.some((p) => p.startsWith("workflow"))).toBe(
			false,
		);
	});
});
