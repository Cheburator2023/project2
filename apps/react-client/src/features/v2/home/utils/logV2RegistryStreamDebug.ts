import type { V2QuestionnaireDto } from "@smart-anketa/api-contract";
import {
	isV2UserStreamFilteredByGroups,
	normalizeV2UserGroups,
	resolveV2UserImplementationStreamsFromGroups,
} from "@smart-anketa/api-contract";

const LEAD_EXEMPT = ["ds_lead", "de_lead", "modelops_lead"] as const;

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
	questionnaires: V2QuestionnaireDto[] | undefined;
	isLoading: boolean;
}): void {
	if (!isDebugEnabled() || args.isLoading) return;

	const groups = [...args.groups];
	const normalized = normalizeV2UserGroups(groups);
	const leadExempt = LEAD_EXEMPT.filter((r) => normalized.includes(r));
	const clientWouldFilter =
		leadExempt.length === 0 && isV2UserStreamFilteredByGroups(groups);
	const allowedStreams = resolveV2UserImplementationStreamsFromGroups(groups);
	const suffixHits = normalized
		.map((g) => {
			const m = g.match(STREAM_SUFFIX_RE);
			return m ? { group: g, stream: m[1].toLowerCase() } : null;
		})
		.filter(Boolean);

	const rows = (args.questionnaires ?? []).map((q) => ({
		id: q.id,
		readableId: q.readableId,
		calcName: q.calcName,
		implementationStream: resolveImplementationStream(q),
	}));

	const byStream = new Map<string, typeof rows>();
	for (const row of rows) {
		const key = row.implementationStream;
		const list = byStream.get(key) ?? [];
		list.push(row);
		byStream.set(key, list);
	}

	const summary = {
		username: args.username,
		groupsRaw: groups,
		groupsNormalized: normalized,
		leadExempt,
		/** Как на сервере: lead → фильтр выкл.; иначе Level A по role. */
		serverLikelyFilters: clientWouldFilter,
		allowedStreamsFromGroups: allowedStreams,
		streamSuffixHitsInGroups: suffixHits,
		apiReturnedCount: rows.length,
		hint:
			clientWouldFilter && allowedStreams.length === 0
				? "Level A без департамента/суффикса стрима → API должен отдать []. Добавь /departament/… или STREAM_FILTER_DISABLED=true"
				: leadExempt.length > 0
					? "Lead exempt → реестр без жёсткого фильтра по стриму"
					: allowedStreams.length > 0
						? "Фильтр по стримам из groups; в таблице ниже — что вернул API (уже после фильтра сервера)"
						: "Фильтр по стриму для этой роли не ожидается",
	};

	console.groupCollapsed(
		`[v2-stream-filter] ${args.username ?? "?"} · API ${rows.length} анкет`,
	);
	console.info("summary", summary);
	console.table(rows);
	console.info(
		"byStream",
		Object.fromEntries(
			[...byStream.entries()].map(([stream, list]) => [
				stream,
				list.map((r) => r.calcName || r.readableId || r.id),
			]),
		),
	);
	if (rows.length === 0 && clientWouldFilter && allowedStreams.length === 0) {
		console.warn(
			"[v2-stream-filter] Список пуст: сервер отрезал всё (нет allow-list). " +
				"Анкеты со стримами увидишь под de_lead / appadmin или с DEBUG после STREAM_FILTER_DISABLED.",
		);
	}
	console.groupEnd();
}
