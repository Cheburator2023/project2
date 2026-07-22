/** Роли Keycloak для стрим-блоков анкеты и редактора логики типовых работ (все `Role`). */
export declare const V2_STREAM_BLOCK_ROLE: {
    readonly ADMIN_IT: "admin_it";
    readonly ADMIN_IT_LEAD: "admin_it_lead";
    readonly VALIDATOR_LEAD: "validator_lead";
    readonly VALIDATOR: "validator";
    readonly BUSINESS_CUSTOMER: "business_customer";
    readonly BI_CUSTOMER_BROKER: "bi_business_customer_broker";
    readonly DS: "ds";
    readonly DE: "de";
    readonly DS_LEAD: "ds_lead";
    readonly DE_LEAD: "de_lead";
    readonly MODEL_OPS: "modelops";
    readonly MODEL_OPS_LEAD: "modelops_lead";
    readonly MIPM: "mipm";
    readonly SAPRG: "saprg";
    readonly SACFG: "sacfg";
    readonly SAREP: "sarep";
};
export type V2StreamBlockRoleCode = (typeof V2_STREAM_BLOCK_ROLE)[keyof typeof V2_STREAM_BLOCK_ROLE];
export declare const V2_STREAM_BLOCK_ROLE_CODES: readonly V2StreamBlockRoleCode[];
export declare const V2_STREAM_BLOCK_ROLE_LABELS: Record<V2StreamBlockRoleCode, string>;
export type V2StreamBlockRoleValue = V2StreamBlockRoleCode | V2StreamBlockRoleCode[];
export declare function isV2StreamBlockRoleCode(value: string): value is V2StreamBlockRoleCode;
export declare function normalizeStreamBlockRole(value: string): V2StreamBlockRoleCode | null;
export declare function normalizeStreamBlockRoles(value: unknown): V2StreamBlockRoleCode[];
export declare function serializeStreamBlockRoles(roles: readonly V2StreamBlockRoleCode[]): V2StreamBlockRoleValue | undefined;
export declare function resolveStreamBlockRolesLabel(value: string | readonly string[] | undefined | null): string;
