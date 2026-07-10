import { V2_SOURCE_STREAM } from "@smart-anketa/api-contract";
import { V2CalculationService } from "../../../../src/modules/anketa-v2/services/v2-calculation.service";
import { createCalculationService } from "./helpers/v2-calculation-test.helpers";
import {
	createInMemoryTypicalWorkRuntime,
	SOURCE_CATALOG_TASK_TRIGGER_RULE,
	type InMemoryTypicalWorkRuntimeFixture,
} from "./helpers/v2-typical-work-runtime.test-helpers";

const WORK_ID = "11111111-1111-1111-1111-111111111111";
const TEMPLATE_VERSION_ID = "tpl-calc-labor-coeff";

function baseFixture(
	overrides: Partial<InMemoryTypicalWorkRuntimeFixture> = {},
): InMemoryTypicalWorkRuntimeFixture {
	return {
		workId: WORK_ID,
		streamExecutor: V2_SOURCE_STREAM,
		templateVersionId: TEMPLATE_VERSION_ID,
		rules: [
			{
				workId: WORK_ID,
				streamExecutor: V2_SOURCE_STREAM,
				paramCode: "type",
				paramName: "Тип",
				operator: "=",
				valueCode: null,
				valueLabel: "Внутренний",
			},
		],
		...overrides,
	};
}

function evaluateWithRuntime(
	fixture: InMemoryTypicalWorkRuntimeFixture,
	formData: Record<string, unknown>,
) {
	const service = createCalculationService(
		createInMemoryTypicalWorkRuntime(fixture),
	);
	return service.evaluate(
		{ rules: [SOURCE_CATALOG_TASK_TRIGGER_RULE] },
		formData,
		{
			templateVersionId: fixture.templateVersionId,
			templateId: "template-calc-test",
		},
	);
}

describe("V2CalculationService labor coefficients (runtime integration)", () => {
	it("writes by-value schema dictionary coefficient and total into generated rows", async () => {
		const result = await evaluateWithRuntime(
			baseFixture({
				laborParams: [
					{
						workId: WORK_ID,
						streamExecutor: V2_SOURCE_STREAM,
						paramCode: "field_dict",
						paramName: "Поле справочника @ field_dict",
						kind: "by_value",
					},
				],
				laborRows: [
					{
						workId: WORK_ID,
						streamExecutor: V2_SOURCE_STREAM,
						paramCode: "field_dict",
						paramName: "Поле справочника @ field_dict",
						valueCode: "Да",
						valueLabel: "Да",
						coefficient: "20",
					},
					{
						workId: WORK_ID,
						streamExecutor: V2_SOURCE_STREAM,
						paramCode: "field_dict",
						paramName: "Поле справочника @ field_dict",
						valueCode: "Нет",
						valueLabel: "Нет",
						coefficient: "10",
					},
				],
				versionConfigs: [
					{
						workId: WORK_ID,
						streamExecutor: V2_SOURCE_STREAM,
						templateVersionId: TEMPLATE_VERSION_ID,
						formula: [
							{ kind: "norm" },
							{ kind: "param_coeff", paramCode: "field_dict" },
						],
						formulaText: null,
						roundingMode: "none",
						roundingStep: null,
						calculationLogic: null,
					},
				],
			}),
			{
				detailInfo: {
					sourceSystems: [
						{
							name: "Источник 1",
							type: "Внутренний",
							field_dict: "Да",
						},
					],
				},
			},
		);

		const tasks = (
			result.formData.streamDataSources as {
				sourceTypicalTasks: Array<{
					coefficient: number;
					total: number;
					estimateHoursPerDay: number;
				}>;
			}
		).sourceTypicalTasks;

		expect(tasks).toHaveLength(1);
		expect(tasks[0]?.estimateHoursPerDay).toBe(1.5);
		expect(tasks[0]?.coefficient).toBe(20);
		expect(tasks[0]?.total).toBe(30);
	});

	it("writes any-of schema dictionary coefficient and total into generated rows", async () => {
		const result = await evaluateWithRuntime(
			baseFixture({
				laborParams: [
					{
						workId: WORK_ID,
						streamExecutor: V2_SOURCE_STREAM,
						paramCode: "field_dict",
						paramName: "Поле справочника @ field_dict",
						kind: "any_of",
						anyOfValueCodes: ["Да"],
						anyOfValueLabels: ["Да"],
						coeffOn: "20",
						coeffOff: "10",
					},
				],
				versionConfigs: [
					{
						workId: WORK_ID,
						streamExecutor: V2_SOURCE_STREAM,
						templateVersionId: TEMPLATE_VERSION_ID,
						formula: [
							{ kind: "norm" },
							{ kind: "param_anyof", paramCode: "field_dict" },
						],
						formulaText: null,
						roundingMode: "none",
						roundingStep: null,
						calculationLogic: null,
					},
				],
			}),
			{
				detailInfo: {
					sourceSystems: [
						{
							name: "Источник 1",
							type: "Внутренний",
							field_dict: "Нет",
						},
					],
				},
			},
		);

		const tasks = (
			result.formData.streamDataSources as {
				sourceTypicalTasks: Array<{
					coefficient: number;
					total: number;
				}>;
			}
		).sourceTypicalTasks;

		expect(tasks).toHaveLength(1);
		expect(tasks[0]?.coefficient).toBe(10);
		expect(tasks[0]?.total).toBe(15);
	});

	it("passes stream-level field values into runtime source context", async () => {
		let capturedSource: Record<string, unknown> | undefined;
		const runtime = createInMemoryTypicalWorkRuntime(
			baseFixture({
				laborParams: [
					{
						workId: WORK_ID,
						streamExecutor: V2_SOURCE_STREAM,
						paramCode: "field_dict",
						paramName: "Поле справочника @ field_dict",
						kind: "by_value",
					},
				],
				laborRows: [
					{
						workId: WORK_ID,
						streamExecutor: V2_SOURCE_STREAM,
						paramCode: "field_dict",
						paramName: "Поле справочника @ field_dict",
						valueCode: "Да",
						valueLabel: "Да",
						coefficient: "20",
					},
				],
				versionConfigs: [
					{
						workId: WORK_ID,
						streamExecutor: V2_SOURCE_STREAM,
						templateVersionId: TEMPLATE_VERSION_ID,
						formula: [
							{ kind: "norm" },
							{ kind: "param_coeff", paramCode: "field_dict" },
						],
						formulaText: null,
						roundingMode: "none",
						roundingStep: null,
						calculationLogic: null,
					},
				],
			}),
		);
		const buildCatalogTasks = jest.spyOn(runtime, "buildCatalogTasks");

		const service = createCalculationService(runtime);
		await service.evaluate(
			{
				rules: [
					{
						...SOURCE_CATALOG_TASK_TRIGGER_RULE,
						payload: {
							...SOURCE_CATALOG_TASK_TRIGGER_RULE.payload,
							sourceArrayPath: "streamDataSources.sourceSystems",
							outputArrayPath: "streamDataSources.sourceTypicalTasks",
						},
					},
				],
			},
			{
				streamDataSources: {
					sourceSystems: [{ name: "X", type: "Внутренний" }],
					field_dict: "Да",
				},
			},
			{
				templateVersionId: TEMPLATE_VERSION_ID,
				templateId: "template-calc-test",
			},
		);

		expect(buildCatalogTasks).toHaveBeenCalled();
		capturedSource = buildCatalogTasks.mock.calls[0]?.[0]?.source;
		expect(capturedSource?.field_dict).toBe("Да");
		expect(capturedSource?.type).toBe("Внутренний");

		buildCatalogTasks.mockRestore();
	});
});
