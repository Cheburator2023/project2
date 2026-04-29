import { ConfigService } from "@nestjs/config";
import { TokenValidation } from "nest-keycloak-connect";
import { KeycloakConfigService } from "../../../../src/shared/keycloak/keycloak.config.service";

describe("KeycloakConfigService", () => {
	const buildSvc = (cfg: Record<string, string | undefined>) => {
		const config = {
			get: jest.fn((key: string) => cfg[key]),
		} as unknown as ConfigService;
		return new KeycloakConfigService(config);
	};

	afterEach(() => {
		delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
	});

	it("builds options with required env values", () => {
		const svc = buildSvc({
			KEYCLOAK_URL: "http://kc",
			KEYCLOAK_REALMS: "realm1",
			KEYCLOAK_CLIENT: "client1",
			KEYCLOAK_SECRET: "secret",
		});
		const opts = svc.createKeycloakConnectOptions();
		expect(opts).toEqual({
			authServerUrl: "http://kc",
			realm: "realm1",
			clientId: "client1",
			secret: "secret",
			tokenValidation: TokenValidation.OFFLINE,
			bearerOnly: true,
		});
	});

	it("disables TLS verification in development environment", () => {
		const svc = buildSvc({
			NODE_ENV: "development",
			KEYCLOAK_URL: "http://kc",
			KEYCLOAK_REALMS: "r",
			KEYCLOAK_CLIENT: "c",
			KEYCLOAK_SECRET: "s",
		});
		svc.createKeycloakConnectOptions();
		expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe("0");
	});

	it("throws on missing required env", () => {
		const svc = buildSvc({});
		expect(() => svc.createKeycloakConnectOptions()).toThrow(/KEYCLOAK_URL/);
	});
});
