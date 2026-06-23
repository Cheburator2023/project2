import type { RJSFSchema } from "@rjsf/utils";
import { describe, expect, it } from "vitest";
import { buildSelectOptions } from "./selectFieldOptions";

describe("buildSelectOptions", () => {
	it("uses enumOptions labels from dictionary preview", () => {
		const options = buildSelectOptions(
			{
				enumOptions: [
					{ value: "dept_a", label: "Департамент A" },
					{ value: "dept_b", label: "Департамент B" },
				],
			},
			{ type: "string" },
		);

		expect(options).toEqual([
			{ value: "dept_a", label: "Департамент A" },
			{ value: "dept_b", label: "Департамент B" },
		]);
	});

	it("maps RJSF enumOptions codes to schema.enumNames labels", () => {
		const schema: RJSFSchema = {
			type: "string",
			enum: ["dept_a", "dept_b"],
			enumNames: ["Департамент A", "Департамент B"],
		};

		expect(
			buildSelectOptions(
				{
					enumOptions: [
						{ value: "dept_a", label: "dept_a" },
						{ value: "dept_b", label: "dept_b" },
					],
				},
				schema,
			),
		).toEqual([
			{ value: "dept_a", label: "Департамент A" },
			{ value: "dept_b", label: "Департамент B" },
		]);
	});

	it("prefers ui:options.enumNames over schema when RJSF rebuilds enumOptions", () => {
		expect(
			buildSelectOptions(
				{
					enumNames: ["Подпись A", "Подпись B"],
					enumOptions: [
						{ value: "a", label: "a" },
						{ value: "b", label: "b" },
					],
				},
				{ type: "string", enum: ["a", "b"], enumNames: ["Alpha", "Beta"] },
			),
		).toEqual([
			{ value: "a", label: "Подпись A" },
			{ value: "b", label: "Подпись B" },
		]);
	});

	it("falls back to schema enumNames when enumOptions are absent", () => {
		const schema: RJSFSchema = {
			type: "string",
			enum: ["a", "b"],
			enumNames: ["Alpha", "Beta"],
		};

		expect(buildSelectOptions(undefined, schema)).toEqual([
			{ value: "a", label: "Alpha" },
			{ value: "b", label: "Beta" },
		]);
	});

	it("reads labels from array items schema for multi dictionary fields", () => {
		const schema: RJSFSchema = {
			type: "array",
			items: {
				type: "string",
				enum: ["x", "y"],
				enumNames: ["Икс", "Игрек"],
			} as RJSFSchema,
		};

		expect(buildSelectOptions(undefined, schema)).toEqual([
			{ value: "x", label: "Икс" },
			{ value: "y", label: "Игрек" },
		]);
	});
});
