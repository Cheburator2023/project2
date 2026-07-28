"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_role_compat_util_1 = require("./v2-role-compat.util");
const BASE_TARGET = {
    "/ds_lead": [
        "anketa_view_all_calculations",
        "anketa_create_calculation",
        "anketa_edit_calculation",
        "anketa_delete_calculation",
        "anketa_export_reports",
        "anketa_workflow_approve",
        "anketa_complete_anketa",
    ],
    "/de_lead": [
        "anketa_view_all_calculations",
        "anketa_edit_calculation",
        "anketa_export_reports",
        "anketa_workflow_approve",
        "anketa_complete_anketa",
    ],
    "/modelops_lead": [
        "anketa_view_all_calculations",
        "anketa_create_calculation",
        "anketa_edit_calculation",
        "anketa_delete_calculation",
        "anketa_export_reports",
        "anketa_workflow_approve",
        "anketa_complete_anketa",
    ],
    "/appadmin": ["anketa_view_all_calculations", "anketa_audit_view"],
    "/admin_it": [],
};
(0, vitest_1.describe)("normalizeV2UserGroupsWithCompat", () => {
    (0, vitest_1.it)("maps bare /admin_it to appadmin when toggle on", () => {
        (0, vitest_1.expect)((0, v2_role_compat_util_1.normalizeV2UserGroupsWithCompat)(["/admin_it"], {
            adminItAsAppadmin: true,
        })).toEqual(vitest_1.expect.arrayContaining(["admin_it", "appadmin"]));
    });
    (0, vitest_1.it)("does not map bare /admin_it to appadmin when toggle off", () => {
        (0, vitest_1.expect)((0, v2_role_compat_util_1.normalizeV2UserGroupsWithCompat)(["/admin_it"], {
            adminItAsAppadmin: false,
        })).toEqual(["admin_it"]);
    });
    (0, vitest_1.it)("still maps AD leaf sum_appadmin under /admin_it", () => {
        (0, vitest_1.expect)((0, v2_role_compat_util_1.normalizeV2UserGroupsWithCompat)(["/admin_it/test_sum_appadmin"], {
            adminItAsAppadmin: false,
        })).toEqual(vitest_1.expect.arrayContaining(["appadmin", "admin_it"]));
    });
});
(0, vitest_1.describe)("buildV2KeycloakGroupRoleTargetWithCompat", () => {
    (0, vitest_1.it)("adds nested lead paths when allowed", () => {
        const target = (0, v2_role_compat_util_1.buildV2KeycloakGroupRoleTargetWithCompat)(BASE_TARGET, {
            allowNestedLeadGroups: true,
        });
        (0, vitest_1.expect)(target["/de/de_lead"]).toEqual(BASE_TARGET["/de_lead"]);
        (0, vitest_1.expect)(target["/modelops/modelops_lead"]).toEqual(BASE_TARGET["/modelops_lead"]);
        (0, vitest_1.expect)(target["/ds/ds_lead"]).toEqual(BASE_TARGET["/ds_lead"]);
    });
    (0, vitest_1.it)("keeps admin_it empty and appadmin F-05 roles", () => {
        const target = (0, v2_role_compat_util_1.buildV2KeycloakGroupRoleTargetWithCompat)(BASE_TARGET, {
            adminItAsAppadmin: true,
        });
        (0, vitest_1.expect)(target["/admin_it"]).toEqual([]);
        (0, vitest_1.expect)(target["/appadmin"]).toEqual([
            "anketa_view_all_calculations",
            "anketa_audit_view",
        ]);
    });
});
(0, vitest_1.describe)("expandV2KeycloakTargetsWithCompat", () => {
    (0, vitest_1.it)("duplicates lead roles onto nested paths", () => {
        const expanded = (0, v2_role_compat_util_1.expandV2KeycloakTargetsWithCompat)(BASE_TARGET, "test_", { allowNestedLeadGroups: true });
        (0, vitest_1.expect)(expanded["/de/de_lead"]).toEqual(vitest_1.expect.arrayContaining(["anketa_workflow_approve", "anketa_complete_anketa"]));
        (0, vitest_1.expect)(expanded["/modelops/modelops_lead"]).toEqual(vitest_1.expect.arrayContaining([
            "anketa_delete_calculation",
            "anketa_workflow_approve",
        ]));
    });
});
(0, vitest_1.describe)("resolveV2ImpliedPermissionsFromGroups", () => {
    (0, vitest_1.it)("implies approve/complete for nested de_lead when toggle on", () => {
        const perms = (0, v2_role_compat_util_1.resolveV2ImpliedPermissionsFromGroups)(["/de/de_lead"], {
            allowNestedLeadGroups: true,
        });
        (0, vitest_1.expect)(perms).toEqual(vitest_1.expect.arrayContaining([
            "anketa_workflow_approve",
            "anketa_complete_anketa",
        ]));
        (0, vitest_1.expect)(perms).not.toContain("anketa_delete_calculation");
    });
    (0, vitest_1.it)("returns empty when toggle off", () => {
        (0, vitest_1.expect)((0, v2_role_compat_util_1.resolveV2ImpliedPermissionsFromGroups)(["/de/de_lead"], {
            allowNestedLeadGroups: false,
        })).toEqual([]);
    });
    (0, vitest_1.it)("merges into existing permissions", () => {
        (0, vitest_1.expect)((0, v2_role_compat_util_1.mergeV2PermissionsWithImplied)(["anketa_view_all_calculations"], ["/modelops/modelops_lead"], { allowNestedLeadGroups: true })).toEqual(vitest_1.expect.arrayContaining([
            "anketa_view_all_calculations",
            "anketa_delete_calculation",
            "anketa_complete_anketa",
        ]));
    });
});
