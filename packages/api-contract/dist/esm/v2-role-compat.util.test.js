import { describe, expect, it } from "vitest";
import { buildV2KeycloakGroupRoleTargetWithCompat, expandV2KeycloakTargetsWithCompat, mergeV2PermissionsWithImplied, normalizeV2UserGroupsWithCompat, resolveV2ImpliedPermissionsFromGroups, } from "./v2-role-compat.util";
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
describe("normalizeV2UserGroupsWithCompat", () => {
    it("maps bare /admin_it to appadmin when toggle on", () => {
        expect(normalizeV2UserGroupsWithCompat(["/admin_it"], {
            adminItAsAppadmin: true,
        })).toEqual(expect.arrayContaining(["admin_it", "appadmin"]));
    });
    it("does not map bare /admin_it to appadmin when toggle off", () => {
        expect(normalizeV2UserGroupsWithCompat(["/admin_it"], {
            adminItAsAppadmin: false,
        })).toEqual(["admin_it"]);
    });
    it("still maps AD leaf sum_appadmin under /admin_it", () => {
        expect(normalizeV2UserGroupsWithCompat(["/admin_it/test_sum_appadmin"], {
            adminItAsAppadmin: false,
        })).toEqual(expect.arrayContaining(["appadmin", "admin_it"]));
    });
});
describe("buildV2KeycloakGroupRoleTargetWithCompat", () => {
    it("adds nested lead paths when allowed", () => {
        const target = buildV2KeycloakGroupRoleTargetWithCompat(BASE_TARGET, {
            allowNestedLeadGroups: true,
        });
        expect(target["/de/de_lead"]).toEqual(BASE_TARGET["/de_lead"]);
        expect(target["/modelops/modelops_lead"]).toEqual(BASE_TARGET["/modelops_lead"]);
        expect(target["/ds/ds_lead"]).toEqual(BASE_TARGET["/ds_lead"]);
    });
    it("keeps admin_it empty and appadmin F-05 roles", () => {
        const target = buildV2KeycloakGroupRoleTargetWithCompat(BASE_TARGET, {
            adminItAsAppadmin: true,
        });
        expect(target["/admin_it"]).toEqual([]);
        expect(target["/appadmin"]).toEqual([
            "anketa_view_all_calculations",
            "anketa_audit_view",
        ]);
    });
});
describe("expandV2KeycloakTargetsWithCompat", () => {
    it("duplicates lead roles onto nested paths", () => {
        const expanded = expandV2KeycloakTargetsWithCompat(BASE_TARGET, "test_", { allowNestedLeadGroups: true });
        expect(expanded["/de/de_lead"]).toEqual(expect.arrayContaining(["anketa_workflow_approve", "anketa_complete_anketa"]));
        expect(expanded["/modelops/modelops_lead"]).toEqual(expect.arrayContaining([
            "anketa_delete_calculation",
            "anketa_workflow_approve",
        ]));
    });
});
describe("resolveV2ImpliedPermissionsFromGroups", () => {
    it("implies approve/complete for nested de_lead when toggle on", () => {
        const perms = resolveV2ImpliedPermissionsFromGroups(["/de/de_lead"], {
            allowNestedLeadGroups: true,
        });
        expect(perms).toEqual(expect.arrayContaining([
            "anketa_workflow_approve",
            "anketa_complete_anketa",
        ]));
        expect(perms).not.toContain("anketa_delete_calculation");
    });
    it("returns empty when toggle off", () => {
        expect(resolveV2ImpliedPermissionsFromGroups(["/de/de_lead"], {
            allowNestedLeadGroups: false,
        })).toEqual([]);
    });
    it("merges into existing permissions", () => {
        expect(mergeV2PermissionsWithImplied(["anketa_view_all_calculations"], ["/modelops/modelops_lead"], { allowNestedLeadGroups: true })).toEqual(expect.arrayContaining([
            "anketa_view_all_calculations",
            "anketa_delete_calculation",
            "anketa_complete_anketa",
        ]));
    });
});
