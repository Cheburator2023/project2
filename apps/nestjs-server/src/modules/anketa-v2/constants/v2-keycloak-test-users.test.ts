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
		expect(
			resolveAdGroupPathsForCanon("/de/de_lead", "dev_", {
				adFilter: (ad) => ad === "sum_Lde_kmbkcb",
			}),
		).toEqual(["/de/de_lead/dev_sum_Lde_kmbkcb"]);
	});

	it("keeps lead users on canon folder paths /de + /de/de_lead", () => {
		const users = resolveV2KeycloakTestUsers("dev_");
		const lead = users.find((u) => u.username === "test_de_lead");
		expect(lead?.groups).toEqual(["/de", "/de/de_lead"]);

		const de = users.find((u) => u.username === "test_de");
		expect(de?.groups).toEqual(
			expect.arrayContaining(["/de"]),
		);
		expect(de?.groups.some((g) => g.startsWith("/dev_sum_"))).toBe(false);

		const kib = users.find((u) => u.username === "test_de_kib");
		expect(kib?.groups).toEqual(
			expect.arrayContaining(["/de/dev_sum_de_kmbkcb"]),
		);
		expect(kib?.groups).not.toEqual(
			expect.arrayContaining(["/dev_sum_de_kmbkcb"]),
		);
	});
});
