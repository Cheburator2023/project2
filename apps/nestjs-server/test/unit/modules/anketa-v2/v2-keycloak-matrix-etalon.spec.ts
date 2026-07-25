import { describe, expect, it, vi } from "vitest";
import { V2KeycloakRoleSyncService } from "../../../../src/modules/anketa-v2/services/v2-keycloak-role-sync.service";

describe("V2KeycloakRoleSyncService etalon resolve", () => {
	it("merges overlay groupRoleTarget and testUsers over code defaults", async () => {
		const runtimeSettings = {
			getKeycloakEtalonOverlay: vi.fn(async () => ({
				groupRoleTarget: {
					"/custom": ["anketa_view_all_calculations"],
				},
				testUsers: [
					{
						username: "test_custom",
						groups: ["/custom"],
						label: "Custom",
					},
				],
			})),
			setKeycloakEtalonOverlay: vi.fn(),
		};
		const service = new V2KeycloakRoleSyncService(
			{ get: () => undefined } as never,
			runtimeSettings as never,
		);

		const resolved = await service.resolveEtalonWithOverlay("dev_");
		expect(resolved.source).toBe("code+overlay");
		expect(resolved.groupRoleTarget["/custom"]).toEqual([
			"anketa_view_all_calculations",
		]);
		expect(resolved.groupRoleTarget["/sacfg"]).toContain(
			"anketa_create_calculation",
		);
		expect(
			resolved.testUsers.some((u) => u.username === "test_custom"),
		).toBe(true);
		expect(
			resolved.testUsers.some((u) => u.username === "test_de"),
		).toBe(true);
	});
});
