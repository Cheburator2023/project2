import { Injectable } from "@nestjs/common";
import {
	isV2ImplementationStreamCode,
	V2_IMPLEMENTATION_STREAM,
	V2_IMPLEMENTATION_STREAM_CODES,
	V2_IMPLEMENTATION_STREAM_LABELS,
} from "@smart-anketa/api-contract";
import {
	DEPARTMENTS,
	STREAM_FILTER_EXEMPT_LEAD_ROLES,
	STREAM_FILTERED_ROLES,
	STREAMS,
} from "../constants";
import {
	extractDepartmentsAndStreams,
	extractUserRoles,
	normalizeUserGroups,
} from "../utils/user-groups.util";

/** Департамент Keycloak → стримы v1 (`streamExecutor`) и коды v2 (`implementationStream`). */
const DEPARTMENT_TO_STREAM_MAPPING: Record<string, readonly string[]> = {
	[DEPARTMENTS.KIB_SMB]: [
		STREAMS.KIB_SMB,
		V2_IMPLEMENTATION_STREAM.KMBKCB,
		V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.KMBKCB],
	],
	[DEPARTMENTS.PARTNERSHIPS_IT]: [
		STREAMS.PARTNERSHIPS_IT_IT,
		STREAMS.PARTNERSHIPS_IT_RND,
		V2_IMPLEMENTATION_STREAM.PTITPC,
		V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.PTITPC],
	],
	[DEPARTMENTS.RB]: [
		STREAMS.RB,
		V2_IMPLEMENTATION_STREAM.RB,
		V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.RB],
	],
	[DEPARTMENTS.ML_ALGORITHMS]: [
		STREAMS.ML_ALGORITHMS,
		V2_IMPLEMENTATION_STREAM.RND,
		V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.RND],
	],
	[DEPARTMENTS.PROCESS_FINANCIAL]: [
		STREAMS.PROCESS_FINANCIAL,
		V2_IMPLEMENTATION_STREAM.FINMDL,
		V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.FINMDL],
	],
	/** Прямой код стрима в groups Keycloak → сам код (подпись добавит expandStreamAliases). */
	[V2_IMPLEMENTATION_STREAM.KMBKCB]: [V2_IMPLEMENTATION_STREAM.KMBKCB],
	[V2_IMPLEMENTATION_STREAM.RB]: [V2_IMPLEMENTATION_STREAM.RB],
	[V2_IMPLEMENTATION_STREAM.PTITPC]: [V2_IMPLEMENTATION_STREAM.PTITPC],
	[V2_IMPLEMENTATION_STREAM.FINMDL]: [V2_IMPLEMENTATION_STREAM.FINMDL],
	[V2_IMPLEMENTATION_STREAM.RND]: [V2_IMPLEMENTATION_STREAM.RND],
	[V2_IMPLEMENTATION_STREAM.IDSRC]: [V2_IMPLEMENTATION_STREAM.IDSRC],
	[V2_IMPLEMENTATION_STREAM.MDLCTL]: [V2_IMPLEMENTATION_STREAM.MDLCTL],
	[V2_IMPLEMENTATION_STREAM.DADM]: [V2_IMPLEMENTATION_STREAM.DADM],
	[V2_IMPLEMENTATION_STREAM.PIRM]: [V2_IMPLEMENTATION_STREAM.PIRM],
	[V2_IMPLEMENTATION_STREAM.STRDAT]: [V2_IMPLEMENTATION_STREAM.STRDAT],
	[V2_IMPLEMENTATION_STREAM.DIGAGT]: [V2_IMPLEMENTATION_STREAM.DIGAGT],
};

/**
 * Сервис для определения доступных стримов пользователя
 */
@Injectable()
export class StreamMappingService {
	isStreamFilteredUser(userGroups: string[]): boolean {
		if (!Array.isArray(userGroups)) {
			return false;
		}

		const normalized = normalizeUserGroups(userGroups);
		if (
			STREAM_FILTER_EXEMPT_LEAD_ROLES.some((role) =>
				normalized.includes(role),
			)
		) {
			return false;
		}

		const userRoles = extractUserRoles(userGroups);
		return STREAM_FILTERED_ROLES.some((role) => userRoles.includes(role));
	}

	getGroupsAfterMapping(userGroups: string[]): string[] {
		if (!Array.isArray(userGroups) || userGroups.length === 0) {
			return [];
		}

		if (this.isStreamFilteredUser(userGroups)) {
			const departmentsAndStreams = extractDepartmentsAndStreams(userGroups);
			const mapped = departmentsAndStreams.flatMap(
				(group) => DEPARTMENT_TO_STREAM_MAPPING[group] ?? [group],
			);
			return this.expandStreamAliases(mapped);
		}

		return [];
	}

	/** Добавляет пары code↔label v2, чтобы фильтр срабатывал и по ключу, и по подписи. */
	private expandStreamAliases(streams: readonly string[]): string[] {
		const expanded = new Set<string>();
		for (const stream of streams) {
			const trimmed = stream.trim();
			if (!trimmed) continue;
			expanded.add(trimmed);
			if (isV2ImplementationStreamCode(trimmed)) {
				expanded.add(V2_IMPLEMENTATION_STREAM_LABELS[trimmed]);
				continue;
			}
			for (const code of V2_IMPLEMENTATION_STREAM_CODES) {
				if (V2_IMPLEMENTATION_STREAM_LABELS[code] === trimmed) {
					expanded.add(code);
				}
			}
		}
		return [...expanded];
	}
}
