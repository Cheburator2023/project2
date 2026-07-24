import { describe, expect, it } from "vitest";
import {
	expandV2KeycloakTargetsWithAdAliases,
	mapV2AdGroupLeafToRoleCodes,
	normalizeV2AdStandPrefix,
	stripV2AdStandPrefix,
} from "./v2-ad-domain-groups.util";
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
		expect(normalizeV2UserGroups(["/test_sum_appadmin"])).toEqual(
			expect.arrayContaining(["test_sum_appadmin", "appadmin"]),
		);
		expect(normalizeV2UserGroups(["sum_appadmin"])).toEqual(
			expect.arrayContaining(["sum_appadmin", "appadmin"]),
		);
		expect(normalizeV2UserGroups(["/sacfg/dev_sum_sacfg"])).toEqual(
			expect.arrayContaining(["sacfg", "dev_sum_sacfg"]),
		);
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
		};
		const expanded = expandV2KeycloakTargetsWithAdAliases(target, "test_");
		expect(expanded["/appadmin"]).toEqual(
			expect.arrayContaining(["anketa_audit_view"]),
		);
		expect(expanded["/test_sum_appadmin"]).toEqual(
			expect.arrayContaining(["anketa_audit_view"]),
		);
		expect(expanded["/test_sum_sacfg"]).toEqual(
			expect.arrayContaining(["anketa_view_all_calculations"]),
		);

		const noStand = expandV2KeycloakTargetsWithAdAliases(target, "");
		expect(noStand["/sum_appadmin"]).toEqual(
			expect.arrayContaining(["anketa_audit_view"]),
		);
	});
});
