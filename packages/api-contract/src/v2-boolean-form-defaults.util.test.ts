import { describe, expect, it } from "vitest";
import {
	applyBooleanDefaultsToFormData,
	applyBooleanDefaultsToObject,
} from "./v2-boolean-form-defaults.util";

describe("v2-boolean-form-defaults", () => {
	const modelSchema = {
		type: "object",
		properties: {
			detailInfo: {
				type: "object",
				properties: {
					modelsList: {
						type: "array",
						items: {
							type: "object",
							properties: {
								name: { type: "string" },
								readyPromReports: { type: "boolean" },
								autoML: { type: "boolean" },
							},
						},
					},
				},
			},
		},
	};

	it("fills missing booleans with false in array items", () => {
		const result = applyBooleanDefaultsToFormData(
			{
				detailInfo: {
					modelsList: [
						{ name: "a", readyPromReports: true },
						{ name: "b" },
						{ name: "c", readyPromReports: "Нет" },
					],
				},
			},
			modelSchema,
		);
		const models = (result.detailInfo as { modelsList: Record<string, unknown>[] })
			.modelsList;
		expect(models[0]).toMatchObject({
			readyPromReports: true,
			autoML: false,
		});
		expect(models[1]).toMatchObject({
			readyPromReports: false,
			autoML: false,
		});
		expect(models[2]).toMatchObject({
			readyPromReports: false,
			autoML: false,
		});
	});

	it("does not create empty object branches only for booleans", () => {
		const result = applyBooleanDefaultsToFormData({}, modelSchema);
		expect(result.detailInfo).toBeUndefined();
	});

	it("applies defaults to a single object schema slice", () => {
		expect(
			applyBooleanDefaultsToObject(
				{ name: "x" },
				{
					type: "object",
					properties: {
						name: { type: "string" },
						readyPromReports: { type: "boolean" },
					},
				},
			),
		).toEqual({ name: "x", readyPromReports: false });
	});
});
