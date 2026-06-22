import type {
	V2ParamDefLike,
	WorkTriggerStatusCatalogParam,
} from "@smart-anketa/api-contract";
import { V2_DOC_CATALOG } from "../constants/v2-doc-catalog";
import { slugParamCode } from "./v2-typical-work-catalog.util";

export function listCatalogParamDefs(): V2ParamDefLike[] {
	return V2_DOC_CATALOG.dictionaries
		.filter((dict) => dict.values.length > 0)
		.map((dict) => ({
			code: slugParamCode(dict.name),
			name: dict.name,
		}));
}

export function listTriggerStatusCatalog(): WorkTriggerStatusCatalogParam[] {
	return V2_DOC_CATALOG.dictionaries.map((dict) => ({
		code: slugParamCode(dict.name),
		values: dict.values.map((value) => ({
			code: slugParamCode(value.label),
			label: value.label,
		})),
	}));
}
