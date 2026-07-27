import {
	isV2ImplementationStreamCode,
	V2_IMPLEMENTATION_STREAM,
	V2_IMPLEMENTATION_STREAM_CODES,
	V2_IMPLEMENTATION_STREAM_LABELS,
	type V2ImplementationStreamCode,
} from "./v2-implementation-streams.util";
import { mapV2AdGroupLeafToRoleCodes } from "./v2-ad-domain-groups.util";

/** Роли Keycloak, для которых стрим берётся из департамента / groups (как на бекенде). */
export const V2_USER_STREAM_FILTERED_ROLE_CODES = [
	"ds",
	"de",
	"data_expert",
	"mipm_stream",
	"modelops",
	/** Аналитик качества модельных данных стрима (sum_da_<стрим>). */
	"da_stream",
] as const;

/**
 * Lead-роли (F-05 уровень B): реестр без жёсткого фильтра по стриму.
 * Синхронно с Nest `STREAM_FILTER_EXEMPT_LEAD_ROLES`.
 */
export const V2_USER_STREAM_FILTER_EXEMPT_LEAD_CODES = [
	"ds_lead",
	"de_lead",
	"modelops_lead",
] as const;

/**
 * DE / DE lead / ModelOps / ModelOps lead — при `DE_MODELOPS_VIEW_ALL_STREAMS`
 * (default ON) видят все стримы без разделения.
 */
export const V2_USER_DE_MODELOPS_VIEW_ALL_ROLE_CODES = [
	"de",
	"de_lead",
	"modelops",
	"modelops_lead",
] as const;

/**
 * Доменная/Keycloak-группа: при наличии отключает разделение реестра по стримам
 * (для любой роли). Path: `/stream_view_all`, AD: `sum_stream_view_all`.
 */
export const V2_USER_STREAM_VIEW_ALL_ROLE_CODE = "stream_view_all" as const;

/** `/mipm` без департамента = Бизнес-партнёр (все стримы); с департаментом = Бизнес-партнёр стрима. */
export const V2_USER_CONDITIONAL_STREAM_FILTER_ROLE_CODES = ["mipm"] as const;

/** Опции UI/Nest для stream-filter (env прокидывается с сервера). */
export type V2StreamFilterOptions = {
	/**
	 * DE / DE lead / ModelOps / ModelOps lead видят все стримы.
	 * Default `true` (= env `DE_MODELOPS_VIEW_ALL_STREAMS` не `false`).
	 */
	deModelopsViewAllStreams?: boolean;
};

/** Суффиксы стримов в AD/Keycloak path (как в groups-department mapper). */
const V2_STREAM_SUFFIX_RE =
	/(?:^|_)(kmbkcb|ptitpc|rnd|rb|finmdl|idsrc|mdlctl|pirm|strdat|digagt|dadm)$/i;

const V2_DEPARTMENT_GROUPS = {
	KIB_SMB: "Управление моделирования КИБ и СМБ",
	PARTNERSHIPS_IT: "Управление моделирования партнерств и ИТ-процессов",
	RB: "Управление моделирования РБ",
	ML_ALGORITHMS: "Управление перспективных алгоритмов машинного обучения",
	PROCESS_FINANCIAL: "Управление процессных и финансовых моделей",
} as const;

const V2_LEGACY_STREAM_GROUPS = {
	KIB_SMB: "Разработка моделей для КМБ и КСБ",
	PARTNERSHIPS_IT_IT: "Модели партнерств и платформы больших данных",
	PARTNERSHIPS_IT_RND: "Моделирование RnD",
	RB: "Моделирование РБ",
	ML_ALGORITHMS: "Моделирование RnD",
	PROCESS_FINANCIAL: "Финансовое моделирование",
} as const;

/**
 * Департамент Keycloak / код стрима → allow-list v2 implementationStream.
 * `_rnd` / RnD → ещё и «AI-модели партнерств» (`ptitpc`).
 */
const DEPARTMENT_TO_V2_STREAM_CODES: Record<
	string,
	readonly V2ImplementationStreamCode[]
> = {
	[V2_DEPARTMENT_GROUPS.KIB_SMB]: [V2_IMPLEMENTATION_STREAM.KMBKCB],
	[V2_DEPARTMENT_GROUPS.PARTNERSHIPS_IT]: [
		V2_IMPLEMENTATION_STREAM.PTITPC,
	],
	[V2_DEPARTMENT_GROUPS.RB]: [V2_IMPLEMENTATION_STREAM.RB],
	[V2_DEPARTMENT_GROUPS.ML_ALGORITHMS]: [
		V2_IMPLEMENTATION_STREAM.RND,
		V2_IMPLEMENTATION_STREAM.PTITPC,
	],
	[V2_DEPARTMENT_GROUPS.PROCESS_FINANCIAL]: [
		V2_IMPLEMENTATION_STREAM.FINMDL,
	],
	/** Legacy/v1 label «Моделирование RnD» (и ML_ALGORITHMS, и PARTNERSHIPS_IT_RND). */
	[V2_LEGACY_STREAM_GROUPS.ML_ALGORITHMS]: [
		V2_IMPLEMENTATION_STREAM.RND,
		V2_IMPLEMENTATION_STREAM.PTITPC,
	],
	[V2_IMPLEMENTATION_STREAM.KMBKCB]: [V2_IMPLEMENTATION_STREAM.KMBKCB],
	[V2_IMPLEMENTATION_STREAM.RB]: [V2_IMPLEMENTATION_STREAM.RB],
	[V2_IMPLEMENTATION_STREAM.PTITPC]: [V2_IMPLEMENTATION_STREAM.PTITPC],
	[V2_IMPLEMENTATION_STREAM.FINMDL]: [V2_IMPLEMENTATION_STREAM.FINMDL],
	[V2_IMPLEMENTATION_STREAM.RND]: [
		V2_IMPLEMENTATION_STREAM.RND,
		V2_IMPLEMENTATION_STREAM.PTITPC,
	],
	[V2_IMPLEMENTATION_STREAM.IDSRC]: [V2_IMPLEMENTATION_STREAM.IDSRC],
	[V2_IMPLEMENTATION_STREAM.MDLCTL]: [V2_IMPLEMENTATION_STREAM.MDLCTL],
	[V2_IMPLEMENTATION_STREAM.DADM]: [V2_IMPLEMENTATION_STREAM.DADM],
	[V2_IMPLEMENTATION_STREAM.PIRM]: [V2_IMPLEMENTATION_STREAM.PIRM],
	[V2_IMPLEMENTATION_STREAM.STRDAT]: [V2_IMPLEMENTATION_STREAM.STRDAT],
	[V2_IMPLEMENTATION_STREAM.DIGAGT]: [V2_IMPLEMENTATION_STREAM.DIGAGT],
};

const V2_IMPLEMENTATION_STREAM_LABEL_VALUES = Object.values(
	V2_IMPLEMENTATION_STREAM_LABELS,
);

function pushUnique(acc: string[], value: string) {
	if (value && !acc.includes(value)) acc.push(value);
}

/**
 * Нормализация groups из токена:
 * - `/ds/ds_lead` → `ds`, `ds_lead`
 * - AD `sum_appadmin` / `test_sum_appadmin` / `prod_sum_appadmin` → ещё и `appadmin`
 * - stand-prefix `dev_|test_|prod_` снимается; `sum_` — часть AD-имени, обязателен
 */
export function normalizeV2UserGroups(userGroups: readonly string[]): string[] {
	const result: string[] = [];
	for (const group of userGroups) {
		if (typeof group !== "string") continue;
		const normalized = group.replace(/^\//, "");
		const leaves: string[] = [];
		if (normalized.includes("/")) {
			const parts = normalized.split("/");
			if (parts[0] === "departament") {
				leaves.push(parts.slice(1).join("/"));
			} else {
				leaves.push(...parts.filter(Boolean));
			}
		} else if (normalized) {
			leaves.push(normalized);
		}
		for (const leaf of leaves) {
			pushUnique(result, leaf);
			for (const code of mapV2AdGroupLeafToRoleCodes(leaf)) {
				pushUnique(result, code);
			}
		}
	}
	return result;
}

export function extractV2UserRoleCodes(userGroups: readonly string[]): string[] {
	const normalized = normalizeV2UserGroups(userGroups);
	return normalized.filter((group) =>
		(V2_USER_STREAM_FILTERED_ROLE_CODES as readonly string[]).includes(group),
	);
}

export function isV2UserStreamFilterExemptLead(
	userGroups: readonly string[],
): boolean {
	const normalized = normalizeV2UserGroups(userGroups);
	return V2_USER_STREAM_FILTER_EXEMPT_LEAD_CODES.some((role) =>
		normalized.includes(role),
	);
}

/** Роль `/stream_view_all` — видеть все стримы независимо от DE/ModelOps env. */
export function isV2UserStreamViewAll(userGroups: readonly string[]): boolean {
	return normalizeV2UserGroups(userGroups).includes(
		V2_USER_STREAM_VIEW_ALL_ROLE_CODE,
	);
}

export function isV2UserDeModelopsViewAllFamily(
	userGroups: readonly string[],
): boolean {
	const normalized = normalizeV2UserGroups(userGroups);
	return V2_USER_DE_MODELOPS_VIEW_ALL_ROLE_CODES.some((role) =>
		normalized.includes(role),
	);
}

export function isV2UserStreamFilteredByGroups(
	userGroups: readonly string[],
	options?: V2StreamFilterOptions,
): boolean {
	if (isV2UserStreamViewAll(userGroups)) return false;

	const deModelopsViewAll = options?.deModelopsViewAllStreams !== false;
	if (deModelopsViewAll && isV2UserDeModelopsViewAllFamily(userGroups)) {
		return false;
	}

	if (isV2UserStreamFilterExemptLead(userGroups)) return false;
	if (extractV2UserRoleCodes(userGroups).length > 0) return true;
	const normalized = normalizeV2UserGroups(userGroups);
	/** mipm + департамент/стрим → «Бизнес-партнёр стрима». */
	if (
		normalized.includes("mipm") &&
		extractDepartmentsAndStreamGroups(userGroups).length > 0
	) {
		return true;
	}
	return false;
}

function extractDepartmentsAndStreamGroups(
	userGroups: readonly string[],
): string[] {
	const normalized = normalizeV2UserGroups(userGroups);
	const fromGroups = normalized.filter(
		(group) =>
			Object.values(V2_DEPARTMENT_GROUPS).includes(group as never) ||
			Object.values(V2_LEGACY_STREAM_GROUPS).includes(group as never) ||
			(V2_IMPLEMENTATION_STREAM_CODES as readonly string[]).includes(group) ||
			V2_IMPLEMENTATION_STREAM_LABEL_VALUES.includes(group),
	);
	const fromSuffixes: string[] = [];
	for (const group of normalized) {
		const match = group.match(V2_STREAM_SUFFIX_RE);
		if (match) fromSuffixes.push(match[1].toLowerCase());
	}
	return [...new Set([...fromGroups, ...fromSuffixes])];
}

function expandStreamCodeAliases(
	streams: readonly string[],
): V2ImplementationStreamCode[] {
	const expanded = new Set<V2ImplementationStreamCode>();
	for (const stream of streams) {
		const trimmed = stream.trim();
		if (!trimmed) continue;
		if (isV2ImplementationStreamCode(trimmed)) {
			expanded.add(trimmed);
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

/**
 * Коды implementationStream из groups (департаменты + AD-суффиксы),
 * без учёта lead-exemption фильтра реестра.
 */
export function resolveV2UserScopedStreamsFromGroups(
	userGroups: readonly string[],
): V2ImplementationStreamCode[] {
	const departmentsAndStreams = extractDepartmentsAndStreamGroups(userGroups);
	const mapped = departmentsAndStreams.flatMap(
		(group) => DEPARTMENT_TO_V2_STREAM_CODES[group] ?? [],
	);
	const directCodes = departmentsAndStreams.filter(
		(group): group is V2ImplementationStreamCode =>
			isV2ImplementationStreamCode(group),
	);
	return expandStreamCodeAliases([...mapped, ...directCodes]);
}

/** Коды implementationStream пользователя из groups Keycloak. */
export function resolveV2UserImplementationStreamsFromGroups(
	userGroups: readonly string[],
	options?: V2StreamFilterOptions,
): V2ImplementationStreamCode[] {
	if (!isV2UserStreamFilteredByGroups(userGroups, options)) {
		return [];
	}
	return resolveV2UserScopedStreamsFromGroups(userGroups);
}

/** Allow-list для фильтра реестра: коды + подписи (как Nest expandStreamAliases). */
export function resolveV2UserAllowedStreamFilterValues(
	userGroups: readonly string[],
	options?: V2StreamFilterOptions,
): string[] {
	const codes = resolveV2UserImplementationStreamsFromGroups(
		userGroups,
		options,
	);
	const expanded = new Set<string>();
	for (const code of codes) {
		expanded.add(code);
		expanded.add(V2_IMPLEMENTATION_STREAM_LABELS[code]);
	}
	return [...expanded];
}

function readImplementationStream(formData: unknown): string | undefined {
	if (!formData || typeof formData !== "object") return undefined;
	const generalInfo = (formData as Record<string, unknown>).generalInfo;
	if (!generalInfo || typeof generalInfo !== "object") return undefined;
	const raw = (generalInfo as Record<string, unknown>).implementationStream;
	if (typeof raw === "string" && raw.trim()) return raw.trim();
	return undefined;
}

/**
 * Фильтр списка анкет по стриму пользователя (логика бывшего Nest StreamFilterInterceptor).
 * `filterEnabled=false` → список без изменений.
 */
export function filterV2QuestionnairesByUserStreamGroups<
	T extends { formData?: unknown },
>(
	items: readonly T[],
	userGroups: readonly string[],
	filterEnabled: boolean,
	options?: V2StreamFilterOptions,
): T[] {
	if (!filterEnabled) return [...items];
	if (!isV2UserStreamFilteredByGroups(userGroups, options)) return [...items];

	const allowed = resolveV2UserAllowedStreamFilterValues(userGroups, options);
	if (allowed.length === 0) return [];

	return items.filter((item) => {
		const primary = readImplementationStream(item.formData);
		if (!primary) return true;
		return allowed.includes(primary);
	});
}
