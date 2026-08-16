import { describe, expect, it } from "vitest";
import { shouldInvalidateV2QuestionnaireRegistry } from "./v2-questionnaire-registry-cache";

describe("shouldInvalidateV2QuestionnaireRegistry", () => {
	it("invalidates after Excel import that writes to DB, not dry-run", () => {
		expect(
			shouldInvalidateV2QuestionnaireRegistry(
				"/v2/questionnaires/import-master-registry?dryRun=false",
				"POST",
			),
		).toBe(true);
		expect(
			shouldInvalidateV2QuestionnaireRegistry(
				"/v2/questionnaires/import-master-registry?dryRun=true",
				"POST",
			),
		).toBe(false);
	});

	it("invalidates create / copy / delete, not autosave PATCH or export", () => {
		expect(
			shouldInvalidateV2QuestionnaireRegistry("/v2/questionnaires", "POST"),
		).toBe(true);
		expect(
			shouldInvalidateV2QuestionnaireRegistry(
				"/v2/questionnaires/bulk-delete",
				"POST",
			),
		).toBe(true);
		expect(
			shouldInvalidateV2QuestionnaireRegistry(
				"/v2/questionnaires/abc/copy",
				"POST",
			),
		).toBe(true);
		expect(
			shouldInvalidateV2QuestionnaireRegistry(
				"/v2/questionnaires/abc",
				"PATCH",
			),
		).toBe(false);
		expect(
			shouldInvalidateV2QuestionnaireRegistry(
				"/v2/questionnaires/export/xlsx",
				"POST",
			),
		).toBe(false);
	});
});
