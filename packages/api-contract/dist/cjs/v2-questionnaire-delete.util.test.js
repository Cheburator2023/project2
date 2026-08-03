"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_questionnaire_delete_util_1 = require("./v2-questionnaire-delete.util");
const formWithStream = (stream) => ({
    generalInfo: { implementationStream: stream },
});
(0, vitest_1.describe)("userHasV2QuestionnaireDeleteRole", () => {
    (0, vitest_1.it)("allows ds_lead, modelops_lead, sacfg — not sarep (1-я итерация)", () => {
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.userHasV2QuestionnaireDeleteRole)(["/ds/ds_lead"])).toBe(true);
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.userHasV2QuestionnaireDeleteRole)(["/modelops/modelops_lead"])).toBe(true);
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.userHasV2QuestionnaireDeleteRole)(["/sacfg"])).toBe(true);
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.userHasV2QuestionnaireDeleteRole)(["/sarep"])).toBe(false);
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.userHasV2QuestionnaireDeleteRole)(["/sarep", "sum_sarep_dadm"])).toBe(false);
    });
    (0, vitest_1.it)("denies de, modelops executor and plain ds", () => {
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.userHasV2QuestionnaireDeleteRole)(["/de"])).toBe(false);
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.userHasV2QuestionnaireDeleteRole)(["/de/de_lead"])).toBe(false);
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.userHasV2QuestionnaireDeleteRole)(["/modelops"])).toBe(false);
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.userHasV2QuestionnaireDeleteRole)(["/ds"])).toBe(false);
    });
});
(0, vitest_1.describe)("userCanCreateV2Questionnaire", () => {
    (0, vitest_1.it)("denies sarep even with KK create permission (1-я итерация)", () => {
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.userCanCreateV2Questionnaire)(["/sarep"], true)).toBe(false);
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.userCanCreateV2Questionnaire)(["/sarep", "sum_sarep_idsrc"], true)).toBe(false);
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.userHasV2QuestionnaireCreateRole)(["/sarep"])).toBe(false);
    });
    (0, vitest_1.it)("allows lead/sacfg and empty groups with permission", () => {
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.userCanCreateV2Questionnaire)(["/ds_lead"], true)).toBe(true);
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.userCanCreateV2Questionnaire)(["/sacfg"], true)).toBe(true);
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.userCanCreateV2Questionnaire)([], true)).toBe(true);
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.userCanCreateV2Questionnaire)(["/sarep"], false)).toBe(false);
    });
});
(0, vitest_1.describe)("canUserDeleteV2Questionnaire", () => {
    (0, vitest_1.it)("sacfg can delete any stream", () => {
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.canUserDeleteV2Questionnaire)(["/sacfg"], formWithStream("RB"))).toEqual({ ok: true });
    });
    (0, vitest_1.it)("ds_lead limited to own stream when scope is known", () => {
        const groups = ["/ds/ds_lead", "sum_Lds_rb"];
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.canUserDeleteV2Questionnaire)(groups, formWithStream("RB"))).toEqual({ ok: true });
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.canUserDeleteV2Questionnaire)(groups, formWithStream("KMBKCB"))).toEqual({ ok: false, reason: "wrong_stream" });
    });
    (0, vitest_1.it)("ds_lead can delete when anketa has no implementationStream yet", () => {
        const groups = ["/ds_lead", "sum_Lds_rb"];
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.canUserDeleteV2Questionnaire)(groups, {})).toEqual({ ok: true });
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.canUserDeleteV2Questionnaire)(groups, { generalInfo: {} })).toEqual({ ok: true });
    });
    (0, vitest_1.it)("forbidden without delete role", () => {
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.canUserDeleteV2Questionnaire)(["/saprg"], formWithStream("RB"))).toEqual({ ok: false, reason: "forbidden" });
    });
});
(0, vitest_1.describe)("resolveV2QuestionnaireDeleteAction", () => {
    (0, vitest_1.it)("hard deletes draft active questionnaires", () => {
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.resolveV2QuestionnaireDeleteAction)("Черновик", "active")).toEqual({
            action: "hard_delete",
        });
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.resolveV2QuestionnaireDeleteAction)(null, "active")).toEqual({
            action: "hard_delete",
        });
    });
    (0, vitest_1.it)("deactivates filled and approved questionnaires", () => {
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.resolveV2QuestionnaireDeleteAction)("Заполнено", "active")).toEqual({
            action: "deactivate",
        });
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.resolveV2QuestionnaireDeleteAction)("Утверждена", "active")).toEqual({
            action: "deactivate",
        });
    });
    (0, vitest_1.it)("denies already inactive or archived", () => {
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.resolveV2QuestionnaireDeleteAction)("Черновик", "inactive")).toEqual({
            action: "deny",
            reason: "already_inactive",
        });
        (0, vitest_1.expect)((0, v2_questionnaire_delete_util_1.resolveV2QuestionnaireDeleteAction)("Заполнено", "archived")).toEqual({
            action: "deny",
            reason: "already_inactive",
        });
    });
});
