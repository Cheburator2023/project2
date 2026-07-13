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
		const typicalWorkService = {
			getWorkCard: jest
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
			typicalWorkService,
		});
		jest.spyOn(service, "patchWork").mockResolvedValue({} as never);
		return { service, versionConfigRepository, typicalWorkService };
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
		expect(typicalWorkService.getWorkCard).toHaveBeenCalledTimes(2);
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
						paramName: "Переименованное поле",
					}),
				],
			}),
		);
		expect(impact.worksUpdated).toBe(1);
	});
});
