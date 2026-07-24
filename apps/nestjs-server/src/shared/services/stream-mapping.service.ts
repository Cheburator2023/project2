import { Injectable, Optional } from "@nestjs/common";
import {
	V2_IMPLEMENTATION_STREAM,
	V2_IMPLEMENTATION_STREAM_CODES,
	V2_IMPLEMENTATION_STREAM_LABELS,
	isV2ImplementationStreamCode,
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
import { V2StreamCatalogService } from "../../modules/anketa-v2/services/v2-stream-catalog.service";

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
	constructor(
		@Optional()
		private readonly streamCatalog?: V2StreamCatalogService,
	) {}

	/**
	 * STREAM_FILTER_DISABLED=true — не резать реестр по департаменту/стриму
	 * (Level A для ds/de/modelops и т.п. отключён).
	 */
	isStreamFilterDisabled(): boolean {
		return process.env.STREAM_FILTER_DISABLED === "true";
	}

	isStreamFilteredUser(userGroups: string[]): boolean {
		if (this.isStreamFilterDisabled()) {
			return false;
		}
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
		if (STREAM_FILTERED_ROLES.some((role) => userRoles.includes(role))) {
			return true;
		}
		/**
		 * `/mipm` без департамента = Бизнес-партнёр (все стримы);
		 * `/mipm` + департамент/стрим = Бизнес-партнёр стрима (жёсткий фильтр).
		 */
		if (
			normalized.includes("mipm") &&
			extractDepartmentsAndStreams(userGroups).length > 0
		) {
			return true;
		}
		return false;
	}

	getGroupsAfterMapping(userGroups: string[]): string[] {
		if (!Array.isArray(userGroups) || userGroups.length === 0) {
			return [];
		}

		if (this.isStreamFilteredUser(userGroups)) {
			const departmentsAndStreams = extractDepartmentsAndStreams(userGroups);
			const catalogMap = this.buildCatalogAliasMap();
			const mapped = departmentsAndStreams.flatMap((group) => {
				if (catalogMap?.[group]?.length) {
					return [...catalogMap[group]!];
				}
				return DEPARTMENT_TO_STREAM_MAPPING[group] ?? [group];
			});
			return this.expandStreamAliases(mapped);
		}

		return [];
	}

	private buildCatalogAliasMap(): Record<string, readonly string[]> | null {
		if (!this.streamCatalog) return null;
		const catalog = this.streamCatalog.getCachedCatalog();
		const map: Record<string, string[]> = {};
		const add = (key: string, values: readonly string[]) => {
			const trimmed = key.trim();
			if (!trimmed) return;
			const bucket = map[trimmed] ?? (map[trimmed] = []);
			for (const value of values) {
				const v = value.trim();
				if (v && !bucket.includes(v)) bucket.push(v);
			}
		};
		for (const entry of catalog) {
			if (!entry.isActive) continue;
			const aliases = [
				entry.code,
				entry.label,
				...entry.payload.v1Labels,
				...entry.payload.dbNames,
				...entry.payload.legacyLabels,
			];
			add(entry.code, aliases);
			for (const kc of entry.payload.keycloakAliases) {
				add(kc, aliases);
			}
		}
		return map;
	}

	/** Добавляет пары code↔label v2, чтобы фильтр срабатывал и по ключу, и по подписи. */
	private expandStreamAliases(streams: readonly string[]): string[] {
		const expanded = new Set<string>();
		const catalog = this.streamCatalog?.getCachedCatalog() ?? [];
		for (const stream of streams) {
			const trimmed = stream.trim();
			if (!trimmed) continue;
			expanded.add(trimmed);
			const entry = catalog.find(
				(item) =>
					item.code === trimmed ||
					item.label === trimmed ||
					item.payload.dbNames.includes(trimmed) ||
					item.payload.v1Labels.includes(trimmed) ||
					item.payload.legacyLabels.includes(trimmed),
			);
			if (entry) {
				expanded.add(entry.code);
				expanded.add(entry.label);
				for (const name of entry.payload.v1Labels) expanded.add(name);
				for (const name of entry.payload.dbNames) expanded.add(name);
				continue;
			}
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
