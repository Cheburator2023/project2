import type {
	V2ParamDefLike,
	WorkTriggerStatusCatalogParam,
} from "@smart-anketa/api-contract";
import { V2_FACTORY_TYPICAL_WORKS_SNAPSHOT } from "../constants/v2-factory-typical-works-catalog";
import { slugParamCode } from "./v2-typical-work-catalog.util";

export function listCatalogParamDefs(): V2ParamDefLike[] {
	return V2_FACTORY_TYPICAL_WORKS_SNAPSHOT.dictionaries
		.filter((dict) => dict.values.length > 0)
		.map((dict) => ({
			code: slugParamCode(dict.name),
			name: dict.name,
		}));
}

export function listTriggerStatusCatalog(): WorkTriggerStatusCatalogParam[] {
	return V2_FACTORY_TYPICAL_WORKS_SNAPSHOT.dictionaries.map((dict) => ({
		code: slugParamCode(dict.name),
		values: dict.values.map((value) => ({
			code: slugParamCode(value.label),
			label: value.label,
		})),
	}));
}
