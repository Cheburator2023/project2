"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_QUESTIONNAIRE_EDIT_IDLE_TIMEOUT_MS = exports.V2_QUESTIONNAIRE_EDIT_LOCK_TTL_MS = exports.V2_SCHEMA_BINDING_STATUS_RU = exports.V2_SCHEMA_BINDING_STATUS_VALUES = exports.V2_QUESTIONNAIRE_STATUS_RU = exports.V2_QUESTIONNAIRE_STATUS_VALUES = void 0;
exports.formatV2QuestionnaireStatus = formatV2QuestionnaireStatus;
exports.formatV2SchemaBindingStatus = formatV2SchemaBindingStatus;
exports.V2_QUESTIONNAIRE_STATUS_VALUES = [
    "active",
    "archived",
    "inactive",
];
exports.V2_QUESTIONNAIRE_STATUS_RU = {
    active: "Активная",
    archived: "Архив",
    inactive: "Неактивная",
};
function formatV2QuestionnaireStatus(status) {
    if (!status)
        return "";
    return (exports.V2_QUESTIONNAIRE_STATUS_RU[status] ?? String(status));
}
/** Связь анкеты с версией схемы шаблона на момент создания / редактирования. */
exports.V2_SCHEMA_BINDING_STATUS_VALUES = [
    "aligned",
    "superseded",
    "unavailable",
];
exports.V2_SCHEMA_BINDING_STATUS_RU = {
    aligned: "Актуальная",
    superseded: "Устарела",
    unavailable: "Недоступна",
};
function formatV2SchemaBindingStatus(status) {
    if (!status)
        return "";
    return (exports.V2_SCHEMA_BINDING_STATUS_RU[status] ?? String(status));
}
/** TTL блокировки редактирования анкеты (heartbeat продлевает). */
exports.V2_QUESTIONNAIRE_EDIT_LOCK_TTL_MS = 2 * 60 * 1000;
/**
 * Бездействие в открытой анкете: снимаем occupancy-lock и показываем экран выхода.
 * Heartbeat сам по себе не удерживает сессию дольше этого окна без активности.
 */
exports.V2_QUESTIONNAIRE_EDIT_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
