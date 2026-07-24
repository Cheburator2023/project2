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
        };
        const expanded = (0, v2_ad_domain_groups_util_1.expandV2KeycloakTargetsWithAdAliases)(target, "test_");
        (0, vitest_1.expect)(expanded["/appadmin"]).toEqual(vitest_1.expect.arrayContaining(["anketa_audit_view"]));
        (0, vitest_1.expect)(expanded["/test_sum_appadmin"]).toEqual(vitest_1.expect.arrayContaining(["anketa_audit_view"]));
        (0, vitest_1.expect)(expanded["/test_sum_sacfg"]).toEqual(vitest_1.expect.arrayContaining(["anketa_view_all_calculations"]));
        const noStand = (0, v2_ad_domain_groups_util_1.expandV2KeycloakTargetsWithAdAliases)(target, "");
        (0, vitest_1.expect)(noStand["/sum_appadmin"]).toEqual(vitest_1.expect.arrayContaining(["anketa_audit_view"]));
    });
});
