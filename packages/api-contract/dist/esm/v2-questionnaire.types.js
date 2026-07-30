export const V2_QUESTIONNAIRE_STATUS_VALUES = [
    "active",
    "archived",
    "inactive",
];
export const V2_QUESTIONNAIRE_STATUS_RU = {
    active: "Активная",
    archived: "Архив",
    inactive: "Неактивная",
};
export function formatV2QuestionnaireStatus(status) {
    if (!status)
        return "";
    return (V2_QUESTIONNAIRE_STATUS_RU[status] ?? String(status));
}
/** Связь анкеты с версией схемы шаблона на момент создания / редактирования. */
export const V2_SCHEMA_BINDING_STATUS_VALUES = [
    "aligned",
    "superseded",
    "unavailable",
];
export const V2_SCHEMA_BINDING_STATUS_RU = {
    aligned: "Актуальная",
    superseded: "Устарела",
    unavailable: "Недоступна",
};
export function formatV2SchemaBindingStatus(status) {
    if (!status)
        return "";
    return (V2_SCHEMA_BINDING_STATUS_RU[status] ?? String(status));
}
/** TTL блокировки редактирования анкеты (heartbeat продлевает). */
export const V2_QUESTIONNAIRE_EDIT_LOCK_TTL_MS = 2 * 60 * 1000;
