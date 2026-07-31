import type { V2TypicalWorkCardDto } from "@smart-anketa/api-contract";
import { V2TypicalWorkWriteService } from "../../../../src/modules/anketa-v2/services/v2-typical-work-write.service";

function card(id: string, schemaFieldUid: string): V2TypicalWorkCardDto {
	return {
		id,
		name: id,
		archComponentType: "Источник",
		workType: null,
		streamExecutor: "Источник",
		triggerStatus: "appears",
		norms: [],
		rules: [
			{
				id: `rule-${id}`,
				streamExecutor: "Источник",
				schemaFieldUid,
				paramCode: "field_code",
				paramName: "Поле",
				operator: "=",
				valueCode: "yes",
				valueLabel: "Да",
			},
		],
		laborParams: [],
		formula: { tokens: [{ kind: "norm" }], text: "N" },
		rounding: { mode: "NONE", step: null },
	};
}

describe("V2TypicalWorkWriteService.reconcileSchemaField", () => {
	function setup() {
		const versionConfigRepository = {
			find: jest.fn().mockResolvedValue([
				{ workId: "work-1", streamExecutor: "Источник" },
				{ workId: "work-2", streamExecutor: "Источник" },
			]),
		};
		const ruleRepository = {
			find: jest.fn().mockResolvedValue([
				{
					workId: "work-1",
					streamExecutor: "Источник",
					schemaFieldUid: "field-1",
					paramCode: "field_code",
				},
			]),
		};
		const laborParamRepository = {
			find: jest.fn().mockResolvedValue([]),
		};
		const laborRepository = {
			find: jest.fn().mockResolvedValue([]),
		};
		const typicalWorkService = {
			getWorkCardForSchemaSync: jest
				.fn()
				.mockImplementation((workId: string) =>
					Promise.resolve(
						card(workId, workId === "work-1" ? "field-1" : "other-field"),
					),
				),
		};
		const service = Object.create(
			V2TypicalWorkWriteService.prototype,
		) as V2TypicalWorkWriteService;
		Object.assign(service as unknown as Record<string, unknown>, {
			versionConfigRepository,
			ruleRepository,
			laborParamRepository,
			laborRepository,
			typicalWorkService,
		});
		jest.spyOn(service, "patchWork").mockResolvedValue({} as never);
		return {
			service,
			versionConfigRepository,
			ruleRepository,
			typicalWorkService,
		};
	}

	it("dry-runs every assignment in the requested version without writing", async () => {
		const { service, versionConfigRepository, typicalWorkService } = setup();
		const impact = await service.reconcileSchemaField({
			templateVersionId: "version-1",
			mode: "dryRun",
			operation: "delete",
			field: { schemaFieldUid: "field-1", previousCode: "field_code" },
		});

		expect(versionConfigRepository.find).toHaveBeenCalledWith({
			where: { templateVersionId: "version-1" },
		});
		expect(typicalWorkService.getWorkCardForSchemaSync).toHaveBeenCalledTimes(1);
		expect(service.patchWork).not.toHaveBeenCalled();
		expect(impact).toMatchObject({
			worksMatched: 1,
			worksUpdated: 0,
			rulesRemoved: 1,
		});
	});

	it("applies changes only to matching works from the requested version", async () => {
		const { service } = setup();
		const impact = await service.reconcileSchemaField({
			templateVersionId: "version-1",
			mode: "apply",
			operation: "upsert",
			field: {
				schemaFieldUid: "field-1",
				previousCode: "field_code",
				code: "renamed",
				name: "Переименованное поле",
				values: [{ code: "yes", label: "Да" }],
			},
		});

		expect(service.patchWork).toHaveBeenCalledTimes(1);
		expect(service.patchWork).toHaveBeenCalledWith(
			"work-1",
			expect.objectContaining({
				templateVersionId: "version-1",
				rules: [
					expect.objectContaining({
						paramCode: "renamed",
						paramName: expect.stringContaining("Переименованное поле"),
					}),
				],
			}),
		);
		expect(impact.worksUpdated).toBe(1);
	});

	it("reports affected works with names and per-work impact in dry run", async () => {
		const { service } = setup();
		const impact = await service.reconcileSchemaField({
			templateVersionId: "version-1",
			mode: "dryRun",
			operation: "delete",
			field: { schemaFieldUid: "field-1", previousCode: "field_code" },
		});

		expect(service.patchWork).not.toHaveBeenCalled();
		expect(impact.affectedWorks).toEqual([
			{
				workId: "work-1",
				workName: "work-1",
				streamExecutor: "Источник",
				rulesUpdated: 0,
				rulesRemoved: 1,
				laborParamsUpdated: 0,
				laborParamsRemoved: 0,
				formulaInvalidated: false,
			},
		]);
	});

	it("rebinds refs whose schemaFieldUid no longer exists in the schema", async () => {
		const { service, typicalWorkService } = setup();
		typicalWorkService.getWorkCardForSchemaSync.mockImplementation(
			(workId: string) => Promise.resolve(card(workId, "dead-field")),
		);

		const impact = await service.reconcileSchemaField({
			templateVersionId: "version-1",
			mode: "apply",
			operation: "upsert",
			staleSchemaFieldUids: ["dead-field"],
			field: {
				schemaFieldUid: "field-1",
				previousCode: "field_code",
				code: "field_code",
				name: "Поле",
			},
		});

		expect(impact.worksUpdated).toBe(1);
		expect(service.patchWork).toHaveBeenCalledWith(
			"work-1",
			expect.objectContaining({
				rules: [expect.objectContaining({ schemaFieldUid: "field-1" })],
			}),
		);
	});

	it("keeps refs bound to a live field untouched", async () => {
		const { service, typicalWorkService } = setup();
		typicalWorkService.getWorkCardForSchemaSync.mockImplementation(
			(workId: string) => Promise.resolve(card(workId, "another-live-field")),
		);

		const impact = await service.reconcileSchemaField({
			templateVersionId: "version-1",
			mode: "apply",
			operation: "upsert",
			field: {
				schemaFieldUid: "field-1",
				previousCode: "field_code",
				code: "renamed",
				name: "Поле",
			},
		});

		expect(impact.worksUpdated).toBe(0);
		expect(service.patchWork).not.toHaveBeenCalled();
	});
});
