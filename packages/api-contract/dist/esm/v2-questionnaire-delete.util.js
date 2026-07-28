import { normalizeV2UserGroups, resolveV2UserScopedStreamsFromGroups, } from "./v2-user-stream-mapping.util";
import { V2_IMPLEMENTATION_STREAM_LABELS, } from "./v2-implementation-streams.util";
/**
 * Роли, которым доступно удаление/деактивация анкеты (карточка + реестр).
 * По живому SUMD: ds_lead / modelops_lead / sacfg / sarep.
 * DE / modelops (executor) — без удаления.
 */
export const V2_QUESTIONNAIRE_DELETE_ROLE_CODES = [
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
        if (V2_IMPLEMENTATION_STREAM_LABELS[code].toLowerCase() === needle) {
            return true;
        }
    }
    return false;
}
export function userHasV2QuestionnaireDeleteRole(userGroups) {
    const normalized = normalizeV2UserGroups(userGroups);
    return V2_QUESTIONNAIRE_DELETE_ROLE_CODES.some((role) => normalized.includes(role));
}
/**
 * Можно ли пользователю удалить/деактивировать анкету (роль + стрим).
 * sacfg — все стримы; ds_lead / modelops_lead / sarep — свой стрим
 * (если стримы из groups не извлечены — разрешаем, как у lead без AD-суффикса).
 */
export function canUserDeleteV2Questionnaire(userGroups, formData) {
    const normalized = normalizeV2UserGroups(userGroups);
    if (!userHasV2QuestionnaireDeleteRole(userGroups)) {
        return { ok: false, reason: "forbidden" };
    }
    if (normalized.includes("sacfg")) {
        return { ok: true };
    }
    const scope = resolveV2UserScopedStreamsFromGroups(userGroups);
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
export function resolveV2QuestionnaireDeleteAction(workflowGlobalStatus, entityStatus) {
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
