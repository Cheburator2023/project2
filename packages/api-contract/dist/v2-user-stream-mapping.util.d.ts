import { type V2ImplementationStreamCode } from "./v2-implementation-streams.util";
/** Роли Keycloak, для которых стрим берётся из департамента / groups (как на бекенде). */
export declare const V2_USER_STREAM_FILTERED_ROLE_CODES: readonly ["ds", "de", "data_expert", "mipm_stream", "modelops", "da_stream"];
/** `/mipm` без департамента = Бизнес-партнёр (все стримы); с департаментом = Бизнес-партнёр стрима. */
export declare const V2_USER_CONDITIONAL_STREAM_FILTER_ROLE_CODES: readonly ["mipm"];
export declare function normalizeV2UserGroups(userGroups: readonly string[]): string[];
export declare function extractV2UserRoleCodes(userGroups: readonly string[]): string[];
export declare function isV2UserStreamFilteredByGroups(userGroups: readonly string[]): boolean;
/** Коды implementationStream пользователя из groups Keycloak. */
export declare function resolveV2UserImplementationStreamsFromGroups(userGroups: readonly string[]): V2ImplementationStreamCode[];
