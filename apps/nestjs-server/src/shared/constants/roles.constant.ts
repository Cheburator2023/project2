export const STREAM_FILTERED_ROLES = [
	"ds",
	"de",
	"sarep",
	"data_expert",
	"mipm_stream",
	"modelops",
	/** Аналитик качества модельных данных — жёсткий фильтр по своему стриму (матрица 2026-07). */
	"da",
] as const;

export type StreamFilteredRole = (typeof STREAM_FILTERED_ROLES)[number];

/**
 * Lead-роли (F-05 §2.2): видят реестр всех стримов.
 * Путь `/ds/ds_lead` нормализуется и в `ds`, и в `ds_lead` — без exemption
 * лид ошибочно попадал под жёсткий stream-filter рядового исполнителя.
 */
export const STREAM_FILTER_EXEMPT_LEAD_ROLES = [
	"ds_lead",
	"de_lead",
	"modelops_lead",
] as const;

export type StreamFilterExemptLeadRole =
	(typeof STREAM_FILTER_EXEMPT_LEAD_ROLES)[number];
