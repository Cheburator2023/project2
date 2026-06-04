import { migrateV2AnketaFormData } from "../../../../src/modules/anketa-v2/utils/v2-form-data-migration.util";

describe("migrateV2AnketaFormData", () => {
	it("keeps detailInfo UI paths while copying to stream sections", () => {
		const atypical = [{ name: "Задача 1", reason: "Причина" }];
		const sourceSystems = [{ name: "CRM" }];

		const result = migrateV2AnketaFormData({
			detailInfo: {
				detailAtypicalTasks: atypical,
				sourceSystems,
				dataProcess: { workType: "Разработка" },
			},
		});

		const detailInfo = result.detailInfo as Record<string, unknown>;
		expect(detailInfo.detailAtypicalTasks).toEqual(atypical);
		expect(detailInfo.sourceSystems).toEqual(sourceSystems);
		expect(detailInfo.dataProcess).toEqual({ workType: "Разработка" });

		const streamDataSources = result.streamDataSources as Record<string, unknown>;
		expect(streamDataSources.sourceSystems).toEqual(sourceSystems);

		const streamModelControl = result.streamModelControl as Record<string, unknown>;
		expect(streamModelControl.atypicalTasks).toEqual(atypical);
		expect(streamModelControl.dataProcessing).toEqual({ workType: "Разработка" });
	});
});
