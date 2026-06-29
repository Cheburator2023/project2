import { describe, expect, it } from "vitest";
import {
	buildV2QuestionnaireRegistryExportRow,
	formatV2RegistryExportCellValue,
} from "./v2-questionnaire-registry-export.util";
import type { V2QuestionnaireDto } from "./v2-questionnaire.types";

describe("v2-questionnaire-registry-export.util", () => {
	it("formats booleans and nested form paths", () => {
		expect(formatV2RegistryExportCellValue(true)).toBe("Да");
		expect(formatV2RegistryExportCellValue(null)).toBe("");
	});

	it("builds export row with registry and form fields", () => {
		const row = {
			id: "id-1",
			calcName: "Test anketa",
			status: "active",
			version: "1",
			seriesId: "s1",
			parentQuestionnaireId: null,
			readableId: "V2-1-v1",
			templateId: "t1",
			templateCode: null,
			templateName: "Новая схема",
			boundTemplateVersionId: "v1",
			formData: {
				detailInfo: {
					parameters: {
						streamsOutsideDADM: true,
						streamNames: "Alpha, Beta",
					},
				},
			},
			finalCoefficient: 1.2,
			author: "Author",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-02T00:00:00.000Z",
			schemaBinding: {
				status: "aligned",
				boundTemplateVersionId: "v1",
				boundTemplateVersionNumber: 1,
				boundTemplateVersionStatus: "published",
				currentTemplateVersionId: "v1",
				currentTemplateVersionNumber: 1,
				message: "",
			},
			workflowGlobalStatus: null,
			workflowSectionStatuses: {
				generalInfo: "В работе",
				detailInfo: "В работе",
				streamDataSources: "Создано",
				streamModelControl: "Создано",
			},
		} satisfies V2QuestionnaireDto;

		const exported = buildV2QuestionnaireRegistryExportRow(row);
		expect(exported.calcName).toBe("Test anketa");
		expect(exported["form.detailInfo.parameters.streamNames"]).toBe(
			"Alpha, Beta",
		);
	});
});
