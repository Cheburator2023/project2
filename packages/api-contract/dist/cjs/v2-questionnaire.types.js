"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_SCHEMA_BINDING_STATUS_RU = exports.V2_SCHEMA_BINDING_STATUS_VALUES = exports.V2_QUESTIONNAIRE_STATUS_VALUES = void 0;
exports.formatV2SchemaBindingStatus = formatV2SchemaBindingStatus;
exports.V2_QUESTIONNAIRE_STATUS_VALUES = ["active", "archived"];
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
