import { describe, expect, it } from "vitest";
import {
	resolveAdGroupPathsForCanon,
	resolveV2KeycloakTestUsers,
} from "./v2-keycloak-test-users";

describe("v2-keycloak-test-users", () => {
	it("nests DE AD leaves under /de folder", () => {
		expect(
			resolveAdGroupPathsForCanon("/de", "dev_", {
				adFilter: (ad) => ad === "sum_de_kmbkcb",
			}),
		).toEqual(["/de/dev_sum_de_kmbkcb"]);
	});

	it("nests lead AD under SUMD top-level /de_lead (and nested seed path)", () => {
		expect(
			resolveAdGroupPathsForCanon("/de_lead", "dev_", {
				adFilter: (ad) => ad === "sum_Lde_kmbkcb",
			}),
		).toEqual(["/de_lead/dev_sum_Lde_kmbkcb"]);
		expect(
			resolveAdGroupPathsForCanon("/de/de_lead", "dev_", {
				adFilter: (ad) => ad === "sum_Lde_kmbkcb",
			}),
		).toEqual(
			expect.arrayContaining([
				"/de/de_lead/dev_sum_Lde_kmbkcb",
				"/de_lead/dev_sum_Lde_kmbkcb",
			]),
		);
	});

	it("nests auditor under /controller and auditorib under /auditor", () => {
		expect(resolveAdGroupPathsForCanon("/auditor", "test_")).toEqual([
			"/controller/test_sum_auditor",
		]);
		expect(resolveAdGroupPathsForCanon("/auditorib", "test_")).toEqual([
			"/auditor/test_sum_auditorib",
		]);
	});

	it("nests mipm stream under /mipm_stream", () => {
		expect(
			resolveAdGroupPathsForCanon("/mipm_stream", "test_", {
				adFilter: (ad) => ad === "sum_mipm_kmbkcb",
			}),
		).toEqual(["/mipm_stream/test_sum_mipm_kmbkcb"]);
	});

	it("keeps lead users on SUMD canon folders /de + /de_lead", () => {
		const users = resolveV2KeycloakTestUsers("dev_");
		const lead = users.find((u) => u.username === "test_de_lead");
		expect(lead?.groups).toEqual(["/de", "/de_lead"]);

		const de = users.find((u) => u.username === "test_de");
		expect(de?.groups).toEqual(expect.arrayContaining(["/de"]));
		expect(de?.groups.some((g) => g.startsWith("/dev_sum_"))).toBe(false);

		const stream = users.find((u) => u.username === "test_sum_de_kmbkcb");
		expect(stream?.groups).toEqual(
			expect.arrayContaining(["/de/dev_sum_de_kmbkcb"]),
		);
		expect(stream?.groups).not.toEqual(
			expect.arrayContaining(["/dev_sum_de_kmbkcb"]),
		);
	});

	it("creates stream users for ds/de/mo/arch/da", () => {
		const users = resolveV2KeycloakTestUsers("test_");
		const names = users.map((u) => u.username);
		expect(names).toEqual(
			expect.arrayContaining([
				"test_sum_de_kmbkcb",
				"test_sum_de_rb",
				"test_sum_ds_finmdl",
				"test_sum_mo_ptitpc",
				"test_sum_arch_rnd",
				"test_sum_da_kmbkcb",
				"test_sum_mipm_kmbkcb",
			]),
		);
		const auditor = users.find((u) => u.username === "test_auditor");
		expect(auditor?.groups).toContain("/controller/test_sum_auditor");
		const sacfg = users.find((u) => u.username === "test_sum_sacfg");
		expect(sacfg?.groups).toContain("/sacfg/test_sum_sacfg");
	});
});
