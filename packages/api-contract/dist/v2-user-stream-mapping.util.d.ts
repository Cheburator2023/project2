import { type V2ImplementationStreamCode } from "./v2-implementation-streams.util";
/** Роли Keycloak, для которых стрим берётся из департамента / groups (как на бекенде). */
export declare const V2_USER_STREAM_FILTERED_ROLE_CODES: readonly ["ds", "de", "data_expert", "mipm_stream", "modelops", "da_stream"];
/**
 * Lead-роли (F-05 уровень B): реестр без жёсткого фильтра по стриму.
 * Синхронно с Nest `STREAM_FILTER_EXEMPT_LEAD_ROLES`.
 */
export declare const V2_USER_STREAM_FILTER_EXEMPT_LEAD_CODES: readonly ["ds_lead", "de_lead", "modelops_lead"];
/** `/mipm` без департамента = Бизнес-партнёр (все стримы); с департаментом = Бизнес-партнёр стрима. */
export declare const V2_USER_CONDITIONAL_STREAM_FILTER_ROLE_CODES: readonly ["mipm"];
/**
 * Нормализация groups из токена:
 * - `/ds/ds_lead` → `ds`, `ds_lead`
 * - AD `sum_appadmin` / `test_sum_appadmin` / `prod_sum_appadmin` → ещё и `appadmin`
 * - stand-prefix `dev_|test_|prod_` снимается; `sum_` — часть AD-имени, обязателен
 */
export declare function normalizeV2UserGroups(userGroups: readonly string[]): string[];
export declare function extractV2UserRoleCodes(userGroups: readonly string[]): string[];
export declare function isV2UserStreamFilterExemptLead(userGroups: readonly string[]): boolean;
export declare function isV2UserStreamFilteredByGroups(userGroups: readonly string[]): boolean;
/**
 * Коды implementationStream из groups (департаменты + AD-суффиксы),
 * без учёта lead-exemption фильтра реестра.
 */
export declare function resolveV2UserScopedStreamsFromGroups(userGroups: readonly string[]): V2ImplementationStreamCode[];
/** Коды implementationStream пользователя из groups Keycloak. */
export declare function resolveV2UserImplementationStreamsFromGroups(userGroups: readonly string[]): V2ImplementationStreamCode[];
/** Allow-list для фильтра реестра: коды + подписи (как Nest expandStreamAliases). */
export declare function resolveV2UserAllowedStreamFilterValues(userGroups: readonly string[]): string[];
/**
 * Фильтр списка анкет по стриму пользователя (логика бывшего Nest StreamFilterInterceptor).
 * `filterEnabled=false` → список без изменений.
 */
export declare function filterV2QuestionnairesByUserStreamGroups<T extends {
    formData?: unknown;
}>(items: readonly T[], userGroups: readonly string[], filterEnabled: boolean): T[];
