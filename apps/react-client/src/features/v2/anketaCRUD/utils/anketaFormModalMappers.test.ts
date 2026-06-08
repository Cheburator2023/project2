import type { DataSourceFormValues } from "@react-client/features/playground/v2_playground/organisms/DataSourceModal";
import type { ModelServiceFormValues } from "@react-client/features/playground/v2_playground/organisms/ModelServiceModal";
import { describe, expect, it } from "vitest";
import {
	mapArrayItemToModalDefaults,
	mapDataSourceToSourceSystem,
	mapModalValuesToArrayItem,
} from "./anketaFormModalMappers";

const DATA_SOURCE_VALUES: DataSourceFormValues = {
	name: "Произвольный источник",
	sourceType: "internal",
	workType: "development",
	pilotRequired: "yes",
	configExchange: "required",
	sourceFor: "dm_retail_scoring_features",
	domainComplexity: "Средняя",
	entityVolume: "Малое",
};

describe("anketaFormModalMappers — DataSource", () => {
	it("сохраняет произвольное название в sourceSystems", () => {
		const item = mapDataSourceToSourceSystem(DATA_SOURCE_VALUES);
		expect(item.name).toBe("Произвольный источник");
	});

	it("roundtrip: modal → schema → modal defaults", () => {
		const item = mapModalValuesToArrayItem(
			"detailInfo.sourceSystems",
			DATA_SOURCE_VALUES,
		);
		const defaults = mapArrayItemToModalDefaults(
			"detailInfo.sourceSystems",
			item,
		);
		expect(defaults.name).toBe("Произвольный источник");
	});

	it("roundtrip: legacy slug name остаётся как есть", () => {
		const legacy = { ...DATA_SOURCE_VALUES, name: "crm_retail" };
		const item = mapDataSourceToSourceSystem(legacy);
		const defaults = mapArrayItemToModalDefaults(
			"detailInfo.sourceSystems",
			item,
		);
		expect(defaults.name).toBe("crm_retail");
	});

	it("сохраняет sourceSystems на произвольном пути через modal kind", () => {
		const item = mapModalValuesToArrayItem(
			"field_xyz",
			DATA_SOURCE_VALUES,
			"dataSource",
		);
		expect(item.name).toBe("Произвольный источник");
	});

	it("modelServiceBlock defaults на произвольном пути", () => {
		const defaults = mapArrayItemToModalDefaults(
			"field_abc",
			{ workType: "Разработка", pkRecalibration: "Да", deployChannels: ["Батч"] },
			"modelServiceBlock",
		) as Partial<ModelServiceFormValues>;
		expect(defaults.workType).toBe("development");
		expect(defaults.pilotRequired).toBe("yes");
		expect(defaults.channels).toEqual(["batch"]);
	});
});
