import { V2TypicalWorkService } from "../../../../src/modules/anketa-v2/services/v2-typical-work.service";

const TEMPLATE_ID = "tttttttt-tttt-tttt-tttt-tttttttttttt";
const PARENT_VERSION = "11111111-1111-1111-1111-111111111111";
const NEW_VERSION = "22222222-2222-2222-2222-222222222222";
const WORK_ID = "33333333-3333-3333-3333-333333333333";
const STREAM = "Источники данных";

describe("V2TypicalWorkService.copyVersionConfigsFromParent", () => {
	it("copies version configs from parent template version", async () => {
		const saved: Array<Record<string, unknown>> = [];
		const versionConfigRepo = {
			find: jest.fn(async () => [
				{
					workId: WORK_ID,
					templateVersionId: PARENT_VERSION,
					streamExecutor: STREAM,
					formula: [{ kind: "norm" }],
					formulaText: "N * 6 + (Кэф-П1)",
					roundingMode: "CEIL",
					roundingStep: "0.1",
					calculationLogic: { version: 1, result: { var: "norm" } },
				},
			]),
			findOne: jest.fn(async () => null),
			create: jest.fn((input: Record<string, unknown>) => ({ ...input })),
			save: jest.fn(async (input: Record<string, unknown>) => {
				saved.push(input);
				return input;
			}),
		};

		const service = new V2TypicalWorkService(
			{
				find: jest.fn(async () => [{ id: WORK_ID, templateId: TEMPLATE_ID }]),
			} as never,
			{} as never,
			{} as never,
			{} as never,
			{} as never,
			{} as never,
			{} as never,
			versionConfigRepo as never,
			{} as never,
			{} as never,
			{ listTriggerStatusCatalog: jest.fn() } as never,
		);

		const copied = await service.copyVersionConfigsFromParent(
			TEMPLATE_ID,
			PARENT_VERSION,
			NEW_VERSION,
		);

		expect(copied).toBe(1);
		expect(saved[0]).toMatchObject({
			workId: WORK_ID,
			templateVersionId: NEW_VERSION,
			streamExecutor: STREAM,
			formulaText: "N * 6 + (Кэф-П1)",
		});
	});
});
