import { V2QuestionnaireService } from "../../../../src/modules/anketa-v2/services/v2-questionnaire.service";
import { V2QuestionnaireRegistryReadCache } from "../../../../src/modules/anketa-v2/services/v2-questionnaire-registry-read-cache.service";
import { V2QuestionnaireEntity } from "../../../../src/modules/anketa-v2/entities/v2-questionnaire.entity";

const DRAFT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const APPROVED_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function createService(options: {
	leanRows: Array<{
		id: string;
		status: string | null;
		workflowGlobalStatus: string | null;
		implementationStream: string | null;
	}>;
	dadmEnabled: boolean;
}) {
	const execute = jest.fn(async () => undefined);
	const updateQb = {
		update: jest.fn().mockReturnThis(),
		set: jest.fn().mockReturnThis(),
		where: jest.fn().mockReturnThis(),
		execute,
	};
	const em = {
		createQueryBuilder: jest.fn(() => updateQb),
		delete: jest.fn(async () => undefined),
	};
	const selectQb = {
		select: jest.fn().mockReturnThis(),
		addSelect: jest.fn().mockReturnThis(),
		where: jest.fn().mockReturnThis(),
		getRawMany: jest.fn(async () => options.leanRows),
	};
	const questionnaireRepository = {
		findOne: jest.fn(),
		remove: jest.fn(),
		save: jest.fn(),
		createQueryBuilder: jest.fn(() => selectQb),
		manager: {
			transaction: jest.fn(async (fn: (e: typeof em) => Promise<void>) =>
				fn(em),
			),
		},
	};
	const service = new V2QuestionnaireService(
		questionnaireRepository as never,
		{} as never,
		{} as never,
		{} as never,
		{} as never,
		{
			isDadmProgramManagerEnabled: jest.fn(async () => options.dadmEnabled),
		} as never,
		new V2QuestionnaireRegistryReadCache(),
	);
	return { service, questionnaireRepository, em, execute };
}

describe("V2QuestionnaireService.bulkDelete", () => {
	it("hard-deletes a draft without TypeORM remove when DADM is on", async () => {
		const { service, questionnaireRepository, em } = createService({
			dadmEnabled: true,
			leanRows: [
				{
					id: DRAFT_ID,
					status: "active",
					workflowGlobalStatus: "Черновик",
					implementationStream: "dadm",
				},
			],
		});

		const result = await service.bulkDelete([DRAFT_ID], {
			groups: ["/sacfg"],
		});

		expect(result.deletedIds).toEqual([DRAFT_ID]);
		expect(result.deactivatedIds).toEqual([]);
		expect(result.failed).toEqual([]);
		expect(questionnaireRepository.remove).not.toHaveBeenCalled();
		expect(questionnaireRepository.findOne).not.toHaveBeenCalled();
		expect(em.delete).toHaveBeenCalledWith(V2QuestionnaireEntity, [DRAFT_ID]);
	});

	it("hard-deletes leftover inactive drafts after DADM new version", async () => {
		const { service, em } = createService({
			dadmEnabled: true,
			leanRows: [
				{
					id: DRAFT_ID,
					status: "inactive",
					workflowGlobalStatus: "Черновик",
					implementationStream: "dadm",
				},
			],
		});

		const result = await service.bulkDelete([DRAFT_ID], {
			groups: ["/sacfg"],
		});

		expect(result.deletedIds).toEqual([DRAFT_ID]);
		expect(result.deactivatedIds).toEqual([]);
		expect(result.failed).toEqual([]);
		expect(em.delete).toHaveBeenCalledWith(V2QuestionnaireEntity, [DRAFT_ID]);
	});

	it("deactivates an approved version when DADM is on", async () => {
		const { service, questionnaireRepository, em, execute } = createService({
			dadmEnabled: true,
			leanRows: [
				{
					id: APPROVED_ID,
					status: "active",
					workflowGlobalStatus: "Утверждена",
					implementationStream: "dadm",
				},
			],
		});

		const result = await service.bulkDelete([APPROVED_ID], {
			groups: ["/sacfg"],
		});

		expect(result.deletedIds).toEqual([]);
		expect(result.deactivatedIds).toEqual([APPROVED_ID]);
		expect(em.delete).not.toHaveBeenCalled();
		expect(execute).toHaveBeenCalled();
		expect(questionnaireRepository.remove).not.toHaveBeenCalled();
	});

	it("returns failed items instead of throwing when SQL delete fails", async () => {
		const { service, em } = createService({
			dadmEnabled: true,
			leanRows: [
				{
					id: DRAFT_ID,
					status: "active",
					workflowGlobalStatus: "Черновик",
					implementationStream: "dadm",
				},
			],
		});
		em.delete.mockRejectedValueOnce(new Error("fk_v2_questionnaire_parent"));

		const result = await service.bulkDelete([DRAFT_ID], {
			groups: ["/sacfg"],
		});

		expect(result.deletedIds).toEqual([]);
		expect(result.failed).toEqual([
			expect.objectContaining({
				id: DRAFT_ID,
				reason: "delete_failed",
				message: "fk_v2_questionnaire_parent",
			}),
		]);
	});
});
