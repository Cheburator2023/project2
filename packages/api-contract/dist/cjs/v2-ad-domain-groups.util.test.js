"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_ad_domain_groups_util_1 = require("./v2-ad-domain-groups.util");
const v2_user_stream_mapping_util_1 = require("./v2-user-stream-mapping.util");
(0, vitest_1.describe)("v2-ad-domain-groups", () => {
    (0, vitest_1.it)("strips stand prefixes", () => {
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.stripV2AdStandPrefix)("test_sum_appadmin")).toBe("sum_appadmin");
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.stripV2AdStandPrefix)("dev_sum_ds_rb")).toBe("sum_ds_rb");
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.stripV2AdStandPrefix)("prod_sum_sacfg")).toBe("sum_sacfg");
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.stripV2AdStandPrefix)("sum_appadmin")).toBe("sum_appadmin");
    });
    (0, vitest_1.it)("maps AD leaves to canonical role codes", () => {
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.mapV2AdGroupLeafToRoleCodes)("sum_appadmin")).toEqual(["appadmin"]);
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.mapV2AdGroupLeafToRoleCodes)("test_sum_appadmin")).toEqual([
            "appadmin",
        ]);
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.mapV2AdGroupLeafToRoleCodes)("prod_sum_appadmin")).toEqual([
            "appadmin",
        ]);
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.mapV2AdGroupLeafToRoleCodes)("dev_sum_sacfg")).toEqual(["sacfg"]);
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.mapV2AdGroupLeafToRoleCodes)("sum_ds_kmbkcb")).toEqual(["ds"]);
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.mapV2AdGroupLeafToRoleCodes)("sum_Lds_rb")).toEqual([
            "ds_lead",
            "ds",
        ]);
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.mapV2AdGroupLeafToRoleCodes)("sum_mo_finmdl")).toEqual(["modelops"]);
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.mapV2AdGroupLeafToRoleCodes)("sum_da")).toEqual(["da"]);
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.mapV2AdGroupLeafToRoleCodes)("sum_da_ptitpc")).toEqual(["da_stream"]);
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.mapV2AdGroupLeafToRoleCodes)("sum_sarep_idsrc")).toEqual(["sarep"]);
        /** KK канон без AD sum_ */
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.mapV2AdGroupLeafToRoleCodes)("appadmin")).toEqual(["appadmin"]);
    });
    (0, vitest_1.it)("does not ignore missing sum_ after stand prefix", () => {
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.mapV2AdGroupLeafToRoleCodes)("prod_appadmin")).toEqual([]);
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.mapV2AdGroupLeafToRoleCodes)("test_appadmin")).toEqual([]);
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.mapV2AdGroupLeafToRoleCodes)("dev_sacfg")).toEqual([]);
    });
    (0, vitest_1.it)("normalizeV2UserGroups expands AD names", () => {
        (0, vitest_1.expect)((0, v2_user_stream_mapping_util_1.normalizeV2UserGroups)(["/test_sum_appadmin"])).toEqual(vitest_1.expect.arrayContaining(["test_sum_appadmin", "appadmin"]));
        (0, vitest_1.expect)((0, v2_user_stream_mapping_util_1.normalizeV2UserGroups)(["sum_appadmin"])).toEqual(vitest_1.expect.arrayContaining(["sum_appadmin", "appadmin"]));
        (0, vitest_1.expect)((0, v2_user_stream_mapping_util_1.normalizeV2UserGroups)(["/sacfg/dev_sum_sacfg"])).toEqual(vitest_1.expect.arrayContaining(["sacfg", "dev_sum_sacfg"]));
    });
    (0, vitest_1.it)("normalizes stand prefix input", () => {
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.normalizeV2AdStandPrefix)("test")).toBe("test_");
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.normalizeV2AdStandPrefix)("test_")).toBe("test_");
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.normalizeV2AdStandPrefix)("")).toBe("");
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.normalizeV2AdStandPrefix)("DEV")).toBe("dev_");
    });
    (0, vitest_1.it)("expands sync TARGET with AD aliases", () => {
        const target = {
            "/appadmin": ["anketa_view_all_calculations", "anketa_audit_view"],
            "/sacfg": ["anketa_view_all_calculations"],
            "/sarep": ["anketa_view_all_calculations"],
            "/saprg": ["anketa_hold"],
            "/prjtoffice": [],
        };
        const expanded = (0, v2_ad_domain_groups_util_1.expandV2KeycloakTargetsWithAdAliases)(target, "dev_");
        (0, vitest_1.expect)(expanded["/appadmin"]).toEqual(vitest_1.expect.arrayContaining(["anketa_audit_view"]));
        /** appadmin AD → под /admin_it, не top-level */
        (0, vitest_1.expect)(expanded["/dev_sum_appadmin"]).toBeUndefined();
        (0, vitest_1.expect)(expanded["/admin_it/dev_sum_appadmin"]).toEqual(vitest_1.expect.arrayContaining(["anketa_audit_view"]));
        /** nested canons — без top-level */
        (0, vitest_1.expect)(expanded["/dev_sum_sacfg"]).toBeUndefined();
        (0, vitest_1.expect)(expanded["/dev_sum_sarep_dadm"]).toBeUndefined();
        (0, vitest_1.expect)(expanded["/dev_sum_saprg"]).toBeUndefined();
        (0, vitest_1.expect)(expanded["/dev_sum_prjtoffice"]).toBeUndefined();
        (0, vitest_1.expect)(expanded["/sacfg/dev_sum_sacfg"]).toEqual(vitest_1.expect.arrayContaining(["anketa_view_all_calculations"]));
        (0, vitest_1.expect)(expanded["/sarep/dev_sum_sarep_dadm"]).toEqual(vitest_1.expect.arrayContaining(["anketa_view_all_calculations"]));
        (0, vitest_1.expect)(expanded["/saprg/dev_sum_saprg"]).toEqual(vitest_1.expect.arrayContaining(["anketa_hold"]));
        (0, vitest_1.expect)(expanded["/project_office/dev_sum_prjtoffice"]).toEqual([]);
        (0, vitest_1.expect)(expanded["/prjtoffice/dev_sum_prjtoffice"]).toEqual([]);
        const noStand = (0, v2_ad_domain_groups_util_1.expandV2KeycloakTargetsWithAdAliases)({ "/appadmin": ["anketa_audit_view"] }, "");
        (0, vitest_1.expect)(noStand["/admin_it/sum_appadmin"]).toEqual(vitest_1.expect.arrayContaining(["anketa_audit_view"]));
        (0, vitest_1.expect)(noStand["/sum_appadmin"]).toBeUndefined();
    });
    (0, vitest_1.it)("resolves AD leaf under nested canon path", () => {
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.resolveV2KeycloakGroupPath)("/dev_sum_sarep_dadm", [
            "/sarep",
            "/sarep/dev_sum_sarep_dadm",
            "/sarep/dev_sum_sarep_idsrc",
        ])).toBe("/sarep/dev_sum_sarep_dadm");
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.resolveV2KeycloakGroupPath)("/admin_it/dev_sum_appadmin", [
            "/admin_it",
            "/admin_it/dev_sum_appadmin",
        ])).toBe("/admin_it/dev_sum_appadmin");
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.resolveV2KeycloakGroupPath)("/dev_sum_appadmin", [
            "/admin_it/dev_sum_appadmin",
        ])).toBe("/admin_it/dev_sum_appadmin");
        (0, vitest_1.expect)((0, v2_ad_domain_groups_util_1.resolveV2KeycloakGroupPath)("/dev_sum_appadmin", ["/appadmin"])).toBe(null);
    });
});
