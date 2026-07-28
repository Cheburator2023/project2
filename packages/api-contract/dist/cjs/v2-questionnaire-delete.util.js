"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_QUESTIONNAIRE_DELETE_ROLE_CODES = void 0;
exports.userHasV2QuestionnaireDeleteRole = userHasV2QuestionnaireDeleteRole;
exports.canUserDeleteV2Questionnaire = canUserDeleteV2Questionnaire;
exports.resolveV2QuestionnaireDeleteAction = resolveV2QuestionnaireDeleteAction;
const v2_user_stream_mapping_util_1 = require("./v2-user-stream-mapping.util");
const v2_implementation_streams_util_1 = require("./v2-implementation-streams.util");
/**
 * Роли, которым доступно удаление/деактивация анкеты (карточка + реестр).
 * По живому SUMD: ds_lead / modelops_lead / sacfg / sarep.
 * DE / modelops (executor) — без удаления.
 */
exports.V2_QUESTIONNAIRE_DELETE_ROLE_CODES = [
    "ds_lead",
    "modelops_lead",
    "sacfg",
    "sarep",
];
function readImplementationStream(formData) {
    if (!formData || typeof formData !== "object")
        return undefined;
    const generalInfo = formData.generalInfo;
    if (!generalInfo || typeof generalInfo !== "object")
        return undefined;
    const raw = generalInfo.implementationStream;
    if (typeof raw === "string" && raw.trim())
        return raw.trim();
    return undefined;
}
function streamMatchesScope(stream, scope) {
    const needle = stream.trim().toLowerCase();
    for (const code of scope) {
        if (code.toLowerCase() === needle)
            return true;
        if (v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[code].toLowerCase() === needle) {
            return true;
        }
    }
    return false;
}
function userHasV2QuestionnaireDeleteRole(userGroups) {
    const normalized = (0, v2_user_stream_mapping_util_1.normalizeV2UserGroups)(userGroups);
    return exports.V2_QUESTIONNAIRE_DELETE_ROLE_CODES.some((role) => normalized.includes(role));
}
/**
 * Можно ли пользователю удалить/деактивировать анкету (роль + стрим).
 * sacfg — все стримы; ds_lead / modelops_lead / sarep — свой стрим
 * (если стримы из groups не извлечены — разрешаем, как у lead без AD-суффикса).
 */
function canUserDeleteV2Questionnaire(userGroups, formData) {
    const normalized = (0, v2_user_stream_mapping_util_1.normalizeV2UserGroups)(userGroups);
    if (!userHasV2QuestionnaireDeleteRole(userGroups)) {
        return { ok: false, reason: "forbidden" };
    }
    if (normalized.includes("sacfg")) {
        return { ok: true };
    }
    const scope = (0, v2_user_stream_mapping_util_1.resolveV2UserScopedStreamsFromGroups)(userGroups);
    if (scope.length === 0) {
        return { ok: true };
    }
    const stream = readImplementationStream(formData);
    /**
     * Черновик/анкета без стрима: лид с известным scope всё равно может удалить
     * (иначе UI показывает кнопку, а API отвечает wrong_stream).
     */
    if (!stream) {
        return { ok: true };
    }
    if (!streamMatchesScope(stream, scope)) {
        return { ok: false, reason: "wrong_stream" };
    }
    return { ok: true };
}
/** Черновик → полное удаление; Заполнено/Утверждена → неактивная запись. */
function resolveV2QuestionnaireDeleteAction(workflowGlobalStatus, entityStatus) {
    if (entityStatus === "inactive" || entityStatus === "archived") {
        return { action: "deny", reason: "already_inactive" };
    }
    if (workflowGlobalStatus == null ||
        workflowGlobalStatus === "" ||
        workflowGlobalStatus === "Черновик") {
        return { action: "hard_delete" };
    }
    return { action: "deactivate" };
}
