import {
	V2_IMPLEMENTATION_STREAM_CODES,
	V2_IMPLEMENTATION_STREAM_LABELS,
	mapV2AdGroupLeafToRoleCodes,
	normalizeV2UserGroups as normalizeV2UserGroupsShared,
} from "@smart-anketa/api-contract";
import { DEPARTMENTS, STREAM_FILTERED_ROLES, STREAMS } from "../constants";

const V2_IMPLEMENTATION_STREAM_LABEL_VALUES = Object.values(
	V2_IMPLEMENTATION_STREAM_LABELS,
);

/** Суффиксы стримов в AD/Keycloak path (как в groups-department mapper). */
const STREAM_SUFFIX_RE =
	/(?:^|_)(kmbkcb|ptitpc|rnd|rb|finmdl|idsrc|mdlctl|pirm|strdat|digagt|dadm)$/i;

/**
 * Нормализация groups из JWT:
 * - path-сегменты (`/ds/ds_lead` → ds, ds_lead)
 * - AD-имена (`test_sum_appadmin` / `sum_appadmin` → appadmin)
 */
export function normalizeUserGroups(userGroups: string[]): string[] {
	const result: string[] = [];

	for (const group of userGroups) {
		if (typeof group !== "string") {
			result.push(group);
			continue;
		}

		const fromShared = normalizeV2UserGroupsShared([group]);
		for (const leaf of fromShared) {
			if (!result.includes(leaf)) result.push(leaf);
		}
		/** На случай если shared уже всё разложил — дублируем AD map для нестроковых нет. */
		for (const code of mapV2AdGroupLeafToRoleCodes(group)) {
			if (!result.includes(code)) result.push(code);
		}
	}

	return result;
}

export function extractUserRoles(userGroups: string[]): string[] {
	const normalizedGroups = normalizeUserGroups(userGroups);
	return normalizedGroups.filter((group) =>
		STREAM_FILTERED_ROLES.includes(group as any),
	);
}

export function extractDepartmentsAndStreams(userGroups: string[]): string[] {
	const normalizedGroups = normalizeUserGroups(userGroups);
	const fromGroups = normalizedGroups.filter(
		(group) =>
			Object.values(DEPARTMENTS).includes(group as any) ||
			Object.values(STREAMS).includes(group as any) ||
			(V2_IMPLEMENTATION_STREAM_CODES as readonly string[]).includes(group) ||
			V2_IMPLEMENTATION_STREAM_LABEL_VALUES.includes(group as any),
	);
	const fromSuffixes: string[] = [];
	for (const group of normalizedGroups) {
		const match = group.match(STREAM_SUFFIX_RE);
		if (match) fromSuffixes.push(match[1].toLowerCase());
	}
	return [...new Set([...fromGroups, ...fromSuffixes])];
}
