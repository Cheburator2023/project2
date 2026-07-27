import type { V2QuestionnaireDto } from "@smart-anketa/api-contract";
import {
	isV2UserStreamFilterExemptLead,
	isV2UserStreamFilteredByGroups,
	normalizeV2UserGroups,
	resolveV2UserAllowedStreamFilterValues,
	resolveV2UserImplementationStreamsFromGroups,
} from "@smart-anketa/api-contract";

const STREAM_SUFFIX_RE =
	/(?:^|_)(kmbkcb|ptitpc|rnd|rb|finmdl|idsrc|mdlctl|pirm|strdat|digagt|dadm)$/i;

function isDebugEnabled(): boolean {
	if (typeof window === "undefined") return false;
	const flag = window.localStorage.getItem("DEBUG_V2_STREAM_FILTER");
	if (flag === "0" || flag === "false") return false;
	/** Вкл. по умолчанию; выкл.: localStorage.setItem('DEBUG_V2_STREAM_FILTER','0') */
	return true;
}

function resolveImplementationStream(q: V2QuestionnaireDto): string {
	const gi = q.formData?.generalInfo;
	if (!gi || typeof gi !== "object") return "(нет)";
	const raw = (gi as Record<string, unknown>).implementationStream;
	if (typeof raw === "string" && raw.trim()) return raw.trim();
	return "(нет)";
}

/**
 * Диагностика stream-filter реестра v2 в DevTools Console.
 * Выкл.: `localStorage.setItem('DEBUG_V2_STREAM_FILTER','0')` + reload.
 */
export function logV2RegistryStreamDebug(args: {
	username: string | null;
	groups: readonly string[];
	/** Список после UI-фильтра (то, что в гриде). */
	questionnaires: V2QuestionnaireDto[] | undefined;
	/** Полный ответ API до UI-фильтра. */
	allQuestionnaires?: V2QuestionnaireDto[] | undefined;
	streamFilterEnabled?: boolean;
	deModelopsViewAllStreams?: boolean;
	isLoading: boolean;
}): void {
	if (!isDebugEnabled() || args.isLoading) return;

	const groups = [...args.groups];
	const filterOptions = {
		deModelopsViewAllStreams: args.deModelopsViewAllStreams ?? true,
	};
	const normalized = normalizeV2UserGroups(groups);
	const leadExempt = isV2UserStreamFilterExemptLead(groups);
	const clientWouldFilter = isV2UserStreamFilteredByGroups(
		groups,
		filterOptions,
	);
	const allowedStreams = resolveV2UserImplementationStreamsFromGroups(
		groups,
		filterOptions,
	);
	const allowedFilterValues = resolveV2UserAllowedStreamFilterValues(
		groups,
		filterOptions,
	);
	const suffixHits = normalized
		.map((g) => {
			const m = g.match(STREAM_SUFFIX_RE);
			return m ? { group: g, stream: m[1].toLowerCase() } : null;
		})
		.filter(Boolean);

	const visible = args.questionnaires ?? [];
	const all = args.allQuestionnaires ?? visible;
	const rows = visible.map((q) => ({
		id: q.id,
		readableId: q.readableId,
		calcName: q.calcName,
		implementationStream: resolveImplementationStream(q),
	}));
	const allByStream = new Map<string, string[]>();
	for (const q of all) {
		const stream = resolveImplementationStream(q);
		const list = allByStream.get(stream) ?? [];
		list.push(String(q.calcName || q.readableId || q.id));
		allByStream.set(stream, list);
	}

	const summary = {
		username: args.username,
		streamFilterEnabled: args.streamFilterEnabled ?? true,
		deModelopsViewAllStreams: filterOptions.deModelopsViewAllStreams,
		groupsRaw: groups,
		groupsNormalized: normalized,
		leadExempt,
		serverLikelyFilters: clientWouldFilter,
		allowedStreamsFromGroups: allowedStreams,
		allowedFilterValues,
		streamSuffixHitsInGroups: suffixHits,
		apiReturnedCount: all.length,
		afterUiFilterCount: visible.length,
		hint:
			!(args.streamFilterEnabled ?? true)
				? "UI-фильтр выключен (админка / STREAM_FILTER_DISABLED) — показан полный API-список"
				: clientWouldFilter && allowedStreams.length === 0
					? "Level A без департамента/суффикса стрима → UI отдаёт []. Добавь /departament/… или выключи фильтр в админке"
					: leadExempt || !clientWouldFilter
						? "Без жёсткого фильтра по стриму (lead / DE·ModelOps view-all / stream_view_all)"
						: allowedStreams.length > 0
							? "UI фильтрует по стримам из groups"
							: "Фильтр по стриму для этой роли не ожидается",
	};

	console.groupCollapsed(
		`[v2-stream-filter] ${args.username ?? "?"} · API ${all.length} → UI ${visible.length}`,
	);
	console.info("summary", summary);
	console.info("allByStream (до UI-фильтра)", Object.fromEntries(allByStream));
	console.table(rows);
	console.groupEnd();
}
