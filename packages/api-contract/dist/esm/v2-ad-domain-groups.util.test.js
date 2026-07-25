import { describe, expect, it } from "vitest";
import { expandV2KeycloakTargetsWithAdAliases, isV2AdDelegatedCanonPath, mapV2AdGroupLeafToRoleCodes, normalizeV2AdStandPrefix, isV2KeycloakIgnoredOrgGroupPath, resolveV2KeycloakGroupPath, v2KeycloakGroupParentPath, shouldEnsureV2KeycloakGroupPath, stripV2AdStandPrefix, } from "./v2-ad-domain-groups.util";
import { normalizeV2UserGroups } from "./v2-user-stream-mapping.util";
describe("v2-ad-domain-groups", () => {
    it("strips stand prefixes", () => {
        expect(stripV2AdStandPrefix("test_sum_appadmin")).toBe("sum_appadmin");
        expect(stripV2AdStandPrefix("dev_sum_ds_rb")).toBe("sum_ds_rb");
        expect(stripV2AdStandPrefix("prod_sum_sacfg")).toBe("sum_sacfg");
        expect(stripV2AdStandPrefix("sum_appadmin")).toBe("sum_appadmin");
    });
    it("maps AD leaves to canonical role codes", () => {
        expect(mapV2AdGroupLeafToRoleCodes("sum_appadmin")).toEqual(["appadmin"]);
        expect(mapV2AdGroupLeafToRoleCodes("test_sum_appadmin")).toEqual([
            "appadmin",
        ]);
        expect(mapV2AdGroupLeafToRoleCodes("prod_sum_appadmin")).toEqual([
            "appadmin",
        ]);
        expect(mapV2AdGroupLeafToRoleCodes("dev_sum_sacfg")).toEqual(["sacfg"]);
        expect(mapV2AdGroupLeafToRoleCodes("sum_ds_kmbkcb")).toEqual(["ds"]);
        expect(mapV2AdGroupLeafToRoleCodes("sum_Lds_rb")).toEqual([
            "ds_lead",
            "ds",
        ]);
        expect(mapV2AdGroupLeafToRoleCodes("sum_mo_finmdl")).toEqual(["modelops"]);
        expect(mapV2AdGroupLeafToRoleCodes("sum_da")).toEqual(["da"]);
        expect(mapV2AdGroupLeafToRoleCodes("sum_da_ptitpc")).toEqual(["da_stream"]);
        expect(mapV2AdGroupLeafToRoleCodes("sum_sarep_idsrc")).toEqual(["sarep"]);
        /** KK канон без AD sum_ */
        expect(mapV2AdGroupLeafToRoleCodes("appadmin")).toEqual(["appadmin"]);
    });
    it("does not ignore missing sum_ after stand prefix", () => {
        expect(mapV2AdGroupLeafToRoleCodes("prod_appadmin")).toEqual([]);
        expect(mapV2AdGroupLeafToRoleCodes("test_appadmin")).toEqual([]);
        expect(mapV2AdGroupLeafToRoleCodes("dev_sacfg")).toEqual([]);
    });
    it("normalizeV2UserGroups expands AD names", () => {
        expect(normalizeV2UserGroups(["/test_sum_appadmin"])).toEqual(expect.arrayContaining(["test_sum_appadmin", "appadmin"]));
        expect(normalizeV2UserGroups(["sum_appadmin"])).toEqual(expect.arrayContaining(["sum_appadmin", "appadmin"]));
        expect(normalizeV2UserGroups(["/sacfg/dev_sum_sacfg"])).toEqual(expect.arrayContaining(["sacfg", "dev_sum_sacfg"]));
    });
    it("normalizes stand prefix input", () => {
        expect(normalizeV2AdStandPrefix("test")).toBe("test_");
        expect(normalizeV2AdStandPrefix("test_")).toBe("test_");
        expect(normalizeV2AdStandPrefix("")).toBe("");
        expect(normalizeV2AdStandPrefix("DEV")).toBe("dev_");
    });
    it("expands sync TARGET with AD aliases", () => {
        const target = {
            "/appadmin": ["anketa_view_all_calculations", "anketa_audit_view"],
            "/sacfg": ["anketa_view_all_calculations"],
            "/sarep": ["anketa_view_all_calculations"],
            "/saprg": ["anketa_hold"],
            "/prjtoffice": [],
            "/de": ["anketa_view_all_calculations"],
            "/de_lead": [
                "anketa_view_all_calculations",
                "anketa_edit_calculation",
            ],
            "/de/de_lead": [
                "anketa_view_all_calculations",
                "anketa_edit_calculation",
            ],
            "/auditor": [
                "anketa_view_all_calculations",
                "anketa_audit_view",
            ],
            "/auditorib": [
                "anketa_view_all_calculations",
                "anketa_audit_view",
            ],
            "/mipm_stream": ["anketa_view_all_calculations"],
        };
        const expanded = expandV2KeycloakTargetsWithAdAliases(target, "dev_");
        /** delegated: роли только на AD-листе, не на каноне /appadmin */
        expect(expanded["/appadmin"]).toBeUndefined();
        expect(isV2AdDelegatedCanonPath("/appadmin")).toBe(true);
        expect(shouldEnsureV2KeycloakGroupPath("/appadmin")).toBe(false);
        expect(shouldEnsureV2KeycloakGroupPath("/admin_it")).toBe(true);
        expect(shouldEnsureV2KeycloakGroupPath("/auditor")).toBe(true);
        expect(shouldEnsureV2KeycloakGroupPath("/auditorib")).toBe(false);
        /** appadmin AD → под /admin_it, не top-level */
        expect(expanded["/dev_sum_appadmin"]).toBeUndefined();
        expect(expanded["/admin_it/dev_sum_appadmin"]).toEqual(expect.arrayContaining(["anketa_audit_view"]));
        /** nested canons — без top-level */
        expect(expanded["/dev_sum_sacfg"]).toBeUndefined();
        expect(expanded["/dev_sum_sarep_dadm"]).toBeUndefined();
        expect(expanded["/dev_sum_saprg"]).toBeUndefined();
        expect(expanded["/dev_sum_prjtoffice"]).toBeUndefined();
        expect(expanded["/sacfg/dev_sum_sacfg"]).toEqual(expect.arrayContaining(["anketa_view_all_calculations"]));
        expect(expanded["/sarep/dev_sum_sarep_dadm"]).toEqual(expect.arrayContaining(["anketa_view_all_calculations"]));
        expect(expanded["/saprg/dev_sum_saprg"]).toEqual(expect.arrayContaining(["anketa_hold"]));
        expect(expanded["/project_office/dev_sum_prjtoffice"]).toEqual([]);
        expect(expanded["/prjtoffice/dev_sum_prjtoffice"]).toEqual([]);
        /** /de — папка; AD только внутри, не top-level */
        expect(expanded["/dev_sum_de_kmbkcb"]).toBeUndefined();
        expect(expanded["/dev_sum_Lde_kmbkcb"]).toBeUndefined();
        expect(expanded["/de"]).toEqual(expect.arrayContaining(["anketa_view_all_calculations"]));
        expect(expanded["/de/de_lead"]).toEqual(expect.arrayContaining(["anketa_edit_calculation"]));
        expect(expanded["/de/dev_sum_de_kmbkcb"]).toEqual(expect.arrayContaining(["anketa_view_all_calculations"]));
        /** nested seed + SUMD top-level lead */
        expect(expanded["/de/de_lead/dev_sum_Lde_rb"]).toEqual(expect.arrayContaining(["anketa_edit_calculation"]));
        expect(expanded["/de_lead/dev_sum_Lde_rb"]).toEqual(expect.arrayContaining(["anketa_edit_calculation"]));
        expect(expanded["/controller/dev_sum_auditor"]).toEqual(expect.arrayContaining(["anketa_audit_view"]));
        expect(expanded["/auditor/dev_sum_auditorib"]).toEqual(expect.arrayContaining(["anketa_audit_view"]));
        expect(expanded["/mipm_stream/dev_sum_mipm_kmbkcb"]).toEqual(expect.arrayContaining(["anketa_view_all_calculations"]));
        const noStand = expandV2KeycloakTargetsWithAdAliases({ "/appadmin": ["anketa_audit_view"] }, "");
        expect(noStand["/admin_it/sum_appadmin"]).toEqual(expect.arrayContaining(["anketa_audit_view"]));
        expect(noStand["/sum_appadmin"]).toBeUndefined();
    });
    it("resolves AD leaf under nested canon path", () => {
        expect(resolveV2KeycloakGroupPath("/dev_sum_sarep_dadm", [
            "/sarep",
            "/sarep/dev_sum_sarep_dadm",
            "/sarep/dev_sum_sarep_idsrc",
        ])).toBe("/sarep/dev_sum_sarep_dadm");
        expect(resolveV2KeycloakGroupPath("/admin_it/dev_sum_appadmin", [
            "/admin_it",
            "/admin_it/dev_sum_appadmin",
        ])).toBe("/admin_it/dev_sum_appadmin");
        expect(resolveV2KeycloakGroupPath("/dev_sum_appadmin", [
            "/admin_it/dev_sum_appadmin",
        ])).toBe("/admin_it/dev_sum_appadmin");
        expect(resolveV2KeycloakGroupPath("/dev_sum_appadmin", ["/appadmin"])).toBe(null);
    });
    it("ignores org noise groups in matrix warnings", () => {
        expect(isV2KeycloakIgnoredOrgGroupPath("/access_during_freeze")).toBe(true);
        expect(isV2KeycloakIgnoredOrgGroupPath("/departament/Управление моделирования КИБ и СМБ")).toBe(true);
        expect(isV2KeycloakIgnoredOrgGroupPath("/departament_business_customer/Департамент брокерского обслуживания")).toBe(true);
        expect(isV2KeycloakIgnoredOrgGroupPath("/mipm")).toBe(false);
        expect(isV2KeycloakIgnoredOrgGroupPath("/ds_lead")).toBe(false);
    });
    it("parent path of nested groups", () => {
        expect(v2KeycloakGroupParentPath("/mipm/dev_sum_mipm")).toBe("/mipm");
        expect(v2KeycloakGroupParentPath("/ds/ds_lead")).toBe("/ds");
        expect(v2KeycloakGroupParentPath("/ds_lead")).toBe(null);
    });
});
