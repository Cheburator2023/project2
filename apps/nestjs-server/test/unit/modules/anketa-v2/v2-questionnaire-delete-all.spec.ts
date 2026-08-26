import { BadRequestException } from "@nestjs/common";
import { V2QuestionnaireService } from "../../../../src/modules/anketa-v2/services/v2-questionnaire.service";
import { V2QuestionnaireRegistryReadCache } from "../../../../src/modules/anketa-v2/services/v2-questionnaire-registry-read-cache.service";
import { V2_QUESTIONNAIRE_DELETE_ALL_CONFIRM } from "@smart-anketa/api-contract";

function createService() {
	const query = jest.fn();
	const em = { query };
	const questionnaireRepository = {
		manager: {
			transaction: jest.fn(async (fn: (e: typeof em) => Promise<unknown>) =>
				fn(em),
			),
		},
	};
	const cache = new V2QuestionnaireRegistryReadCache();
	const invalidateAll = jest.spyOn(cache, "invalidateAll");
	const service = new V2QuestionnaireService(
		questionnaireRepository as never,
		{} as never,
		{} as never,
		{} as never,
		{} as never,
		{} as never,
		cache,
	);
	return { service, query, invalidateAll };
}

describe("V2QuestionnaireService.deleteAllQuestionnaires", () => {
	it("rejects a confirm phrase that is not the admin wipe token", async () => {
		const { service, query } = createService();
		await expect(service.deleteAllQuestionnaires("yes")).rejects.toBeInstanceOf(
			BadRequestException,
		);
		expect(query).not.toHaveBeenCalled();
	});

	it("does not touch the table when the registry is already empty", async () => {
		const { service, query, invalidateAll } = createService();
		query.mockResolvedValueOnce([{ count: 0 }]);
		await expect(
			service.deleteAllQuestionnaires(V2_QUESTIONNAIRE_DELETE_ALL_CONFIRM),
		).resolves.toEqual({ deleted: 0 });
		expect(query).toHaveBeenCalledTimes(1);
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	it("hard-deletes every questionnaire after breaking parent and comment FKs", async () => {
		const { service, query, invalidateAll } = createService();
		query.mockResolvedValueOnce([{ count: 12 }]);
		query.mockResolvedValue(undefined);
		await expect(
			service.deleteAllQuestionnaires(V2_QUESTIONNAIRE_DELETE_ALL_CONFIRM),
		).resolves.toEqual({ deleted: 12 });
		const sql = query.mock.calls.map((call) => String(call[0]));
		expect(sql.some((item) => item.includes("v2_questionnaire_comments"))).toBe(
			true,
		);
		expect(
			sql.some((item) => item.includes("v2_questionnaire_edit_locks")),
		).toBe(true);
		expect(
			sql.some((item) =>
				item.includes("UPDATE v2_questionnaire SET parent_questionnaire_id"),
			),
		).toBe(true);
		expect(sql).toContain("DELETE FROM v2_questionnaire");
		expect(invalidateAll).toHaveBeenCalled();
	});
});
