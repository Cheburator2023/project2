import { describe, expect, it } from "vitest";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { createDefaultOverallUncertaintyConfig } from "@smart-anketa/api-contract";
import {
	applyOverallUncertaintyConfigToSchema,
	ensureOverallUncertaintySchemaComponents,
	findUncertaintyModalPointer,
	mergeSchemaLabelsIntoOverallUncertaintyConfig,
	schemaHasOverallUncertaintyModal,
} from "./overallUncertaintySchemaSync";

describe("overallUncertaintySchemaSync", () => {
	it("adds modal and uncertaintyCalculation when missing", () => {
		const jsonSchema: RJSFSchema = { type: "object", properties: {} };
		const uiSchema: UiSchema = {};
		const result = ensureOverallUncertaintySchemaComponents(jsonSchema, uiSchema);

		expect(result.createdModal).toBe(true);
		expect(result.createdUncertaintyRoot).toBe(true);
		expect(result.modalPointer).toBe("/generalInfo/overallUncertaintyModal");
		expect(
			schemaHasOverallUncertaintyModal(result.uiSchema),
		).toBe(true);
		expect(
			(result.jsonSchema.properties as Record<string, unknown>)
				.uncertaintyCalculation,
		).toBeTruthy();
	});

	it("syncs severity labels and risks into schema fields", () => {
		const config = createDefaultOverallUncertaintyConfig();
		config.severityLevels[0]!.timelineLabel = "Срок А";
		config.severityLevels[0]!.costLabel = "Стоимость А";
		config.risks = [{ id: "custom_risk", name: "Кастомный риск" }];

		const empty: RJSFSchema = { type: "object", properties: {} };
		const synced = applyOverallUncertaintyConfigToSchema(empty, {}, config);
		const uc = (
			synced.jsonSchema.properties as Record<string, RJSFSchema>
		).uncertaintyCalculation as RJSFSchema;
		const props = uc.properties as Record<string, RJSFSchema>;

		expect(props.initiativeTimeline?.enum?.[0]).toBe("Срок А");
		expect(props.initiativeCost?.enum?.[0]).toBe("Стоимость А");
		expect(
			(props.riskGroup?.properties as Record<string, RJSFSchema>).custom_risk
				?.title,
		).toBe("Кастомный риск");
		expect(findUncertaintyModalPointer(synced.uiSchema)).toBe(
			"/generalInfo/overallUncertaintyModal",
		);
	});

	it("reads labels back from schema into config", () => {
		const config = createDefaultOverallUncertaintyConfig();
		const synced = applyOverallUncertaintyConfigToSchema(
			{ type: "object", properties: {} },
			{},
			{
				...config,
				severityLevels: config.severityLevels.map((l, i) =>
					i === 0
						? { ...l, timelineLabel: "из схемы срок", costLabel: "из схемы стоимость" }
						: l,
				),
				risks: [{ id: "r1", name: "Риск из схемы" }],
			},
		);
		const merged = mergeSchemaLabelsIntoOverallUncertaintyConfig(
			createDefaultOverallUncertaintyConfig(),
			synced.jsonSchema,
		);
		expect(merged.severityLevels[0]?.timelineLabel).toBe("из схемы срок");
		expect(merged.severityLevels[0]?.costLabel).toBe("из схемы стоимость");
		expect(merged.risks[0]?.name).toBe("Риск из схемы");
	});
});
