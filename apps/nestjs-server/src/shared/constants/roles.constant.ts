export const STREAM_FILTERED_ROLES = [
	"ds",
	"de",
	"data_expert",
	"mipm_stream",
	"modelops",
	/**
	 * Аналитик качества модельных данных стрима (sum_da_<стрим>).
	 * sum_da без стрима (/da) — уровень B, без жёсткого фильтра.
	 */
	"da_stream",
] as const;

export type StreamFilteredRole = (typeof STREAM_FILTERED_ROLES)[number];

/**
 * Lead-роли (F-05 §2 уровень B): видят реестр всех стримов.
 * Путь `/ds/ds_lead` (legacy nested) нормализуется и в `ds`, и в `ds_lead` —
 * без exemption лид ошибочно попадал под жёсткий stream-filter рядового исполнителя.
 * В эталоне KK лиды создаём только top-level: `/ds_lead`, `/de_lead`.
 */
export const STREAM_FILTER_EXEMPT_LEAD_ROLES = [
	"ds_lead",
	"de_lead",
	"modelops_lead",
] as const;

export type StreamFilterExemptLeadRole =
	(typeof STREAM_FILTER_EXEMPT_LEAD_ROLES)[number];

/**
 * DE / ModelOps family: при env `DE_MODELOPS_VIEW_ALL_STREAMS` (default ON)
 * не режутся по стриму. Синхронно с `V2_USER_DE_MODELOPS_VIEW_ALL_ROLE_CODES`.
 */
export const DE_MODELOPS_VIEW_ALL_STREAM_ROLES = [
	"de",
	"de_lead",
	"modelops",
	"modelops_lead",
] as const;

/**
 * Доменная роль: отключает разделение реестра по стримам для любого пользователя.
 * Keycloak path `/stream_view_all`, AD `sum_stream_view_all`.
 */
export const STREAM_VIEW_ALL_ROLE = "stream_view_all" as const;
