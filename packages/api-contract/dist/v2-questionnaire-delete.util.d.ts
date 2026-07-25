import type { V2AnketaGlobalStatus } from "./v2-anketa-workflow.types";
import type { V2QuestionnaireStatus } from "./v2-questionnaire.types";
/**
 * Роли, которым доступно удаление/деактивация анкеты (карточка + реестр).
 * По живому SUMD: ds_lead / modelops_lead / sacfg / sarep.
 * DE / modelops (executor) — без удаления.
 */
export declare const V2_QUESTIONNAIRE_DELETE_ROLE_CODES: readonly ["ds_lead", "modelops_lead", "sacfg", "sarep"];
export type V2QuestionnaireDeleteAction = "hard_delete" | "deactivate";
export type V2QuestionnaireDeleteDenyReason = "forbidden" | "wrong_stream" | "already_inactive";
export declare function userHasV2QuestionnaireDeleteRole(userGroups: readonly string[]): boolean;
/**
 * Можно ли пользователю удалить/деактивировать анкету (роль + стрим).
 * sacfg — все стримы; ds_lead / modelops_lead / sarep — свой стрим
 * (если стримы из groups не извлечены — разрешаем, как у lead без AD-суффикса).
 */
export declare function canUserDeleteV2Questionnaire(userGroups: readonly string[], formData: unknown): {
    ok: true;
} | {
    ok: false;
    reason: V2QuestionnaireDeleteDenyReason;
};
/** Черновик → полное удаление; Заполнено/Утверждена → неактивная запись. */
export declare function resolveV2QuestionnaireDeleteAction(workflowGlobalStatus: V2AnketaGlobalStatus | string | null | undefined, entityStatus: V2QuestionnaireStatus): {
    action: V2QuestionnaireDeleteAction;
} | {
    action: "deny";
    reason: V2QuestionnaireDeleteDenyReason;
};
