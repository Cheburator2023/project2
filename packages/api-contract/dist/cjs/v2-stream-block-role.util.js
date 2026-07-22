"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_STREAM_BLOCK_ROLE_LABELS = exports.V2_STREAM_BLOCK_ROLE_CODES = exports.V2_STREAM_BLOCK_ROLE = void 0;
exports.isV2StreamBlockRoleCode = isV2StreamBlockRoleCode;
exports.normalizeStreamBlockRole = normalizeStreamBlockRole;
exports.normalizeStreamBlockRoles = normalizeStreamBlockRoles;
exports.serializeStreamBlockRoles = serializeStreamBlockRoles;
exports.resolveStreamBlockRolesLabel = resolveStreamBlockRolesLabel;
/** Роли Keycloak для стрим-блоков анкеты и редактора логики типовых работ (все `Role`). */
exports.V2_STREAM_BLOCK_ROLE = {
    ADMIN_IT: "admin_it",
    ADMIN_IT_LEAD: "admin_it_lead",
    VALIDATOR_LEAD: "validator_lead",
    VALIDATOR: "validator",
    BUSINESS_CUSTOMER: "business_customer",
    BI_CUSTOMER_BROKER: "bi_business_customer_broker",
    DS: "ds",
    DE: "de",
    DS_LEAD: "ds_lead",
    DE_LEAD: "de_lead",
    MODEL_OPS: "modelops",
    MODEL_OPS_LEAD: "modelops_lead",
    MIPM: "mipm",
    SAPRG: "saprg",
    SACFG: "sacfg",
    SAREP: "sarep",
};
exports.V2_STREAM_BLOCK_ROLE_CODES = Object.values(exports.V2_STREAM_BLOCK_ROLE);
exports.V2_STREAM_BLOCK_ROLE_LABELS = {
    [exports.V2_STREAM_BLOCK_ROLE.ADMIN_IT]: "Администратор ИТ",
    [exports.V2_STREAM_BLOCK_ROLE.ADMIN_IT_LEAD]: "Руководитель администраторов ИТ",
    [exports.V2_STREAM_BLOCK_ROLE.VALIDATOR_LEAD]: "Руководитель валидаторов",
    [exports.V2_STREAM_BLOCK_ROLE.VALIDATOR]: "Валидатор",
    [exports.V2_STREAM_BLOCK_ROLE.BUSINESS_CUSTOMER]: "Заказчик бизнеса",
    [exports.V2_STREAM_BLOCK_ROLE.BI_CUSTOMER_BROKER]: "Брокер заказчика BI",
    [exports.V2_STREAM_BLOCK_ROLE.DS]: "Специалист DS",
    [exports.V2_STREAM_BLOCK_ROLE.DE]: "Специалист DE",
    [exports.V2_STREAM_BLOCK_ROLE.DS_LEAD]: "Руководитель DS",
    [exports.V2_STREAM_BLOCK_ROLE.DE_LEAD]: "Руководитель DE",
    [exports.V2_STREAM_BLOCK_ROLE.MODEL_OPS]: "ModelOps",
    [exports.V2_STREAM_BLOCK_ROLE.MODEL_OPS_LEAD]: "Руководитель ModelOps",
    [exports.V2_STREAM_BLOCK_ROLE.MIPM]: "МИПМ",
    [exports.V2_STREAM_BLOCK_ROLE.SAPRG]: "Руководитель программ ДАДМ",
    [exports.V2_STREAM_BLOCK_ROLE.SACFG]: "Конфигуратор Смарт-Анкеты",
    [exports.V2_STREAM_BLOCK_ROLE.SAREP]: "Представитель стрима-не участника ЖЦМ",
};
function isV2StreamBlockRoleCode(value) {
    return exports.V2_STREAM_BLOCK_ROLE_CODES.includes(value);
}
function normalizeStreamBlockRole(value) {
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    if (isV2StreamBlockRoleCode(trimmed))
        return trimmed;
    for (const code of exports.V2_STREAM_BLOCK_ROLE_CODES) {
        if (exports.V2_STREAM_BLOCK_ROLE_LABELS[code] === trimmed)
            return code;
    }
    return null;
}
function normalizeStreamBlockRoles(value) {
    if (typeof value === "string") {
        const code = normalizeStreamBlockRole(value);
        return code ? [code] : [];
    }
    if (!Array.isArray(value))
        return [];
    const result = [];
    for (const item of value) {
        if (typeof item !== "string")
            continue;
        const code = normalizeStreamBlockRole(item);
        if (code && !result.includes(code))
            result.push(code);
    }
    return result;
}
function serializeStreamBlockRoles(roles) {
    if (roles.length === 0)
        return undefined;
    if (roles.length === 1)
        return roles[0];
    return [...roles];
}
function resolveStreamBlockRolesLabel(value) {
    const codes = normalizeStreamBlockRoles(value);
    if (codes.length === 0)
        return "";
    return codes.map((code) => exports.V2_STREAM_BLOCK_ROLE_LABELS[code]).join(", ");
}
