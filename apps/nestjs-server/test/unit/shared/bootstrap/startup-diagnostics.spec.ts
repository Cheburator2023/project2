import { collectStartupDiagnostics } from "../../../../src/shared/bootstrap/startup-diagnostics";

describe("collectStartupDiagnostics", () => {
	it("exposes DB host/port for OpenShift logs without leaking secrets", () => {
		const diagnostics = collectStartupDiagnostics({
			NODE_ENV: "production",
			PORT: "3000",
			DB_HOST: "d5sumd-pgc001lk.corp.dev.vtb",
			DB_PORT: "5432",
			DB_NAME: "sumd",
			DB_USERNAME: "sum_user",
			DB_PASSWORD: "super-secret-password",
			KEYCLOAK_URL: "https://keycloak.example/auth/",
			KEYCLOAK_REALMS: "cym",
			KEYCLOAK_CLIENT: "frontend",
			KEYCLOAK_SECRET: "kc-secret-value",
			KUBERNETES_NAMESPACE: "ik5-pimc01-sumd-system",
			POD_NAME: "smart-anketa-api-abc",
		});

		expect(diagnostics.db.host).toBe("d5sumd-pgc001lk.corp.dev.vtb");
		expect(diagnostics.db.port).toBe("5432");
		expect(diagnostics.db.name).toBe("sumd");
		expect(diagnostics.db.userSet).toBe(true);
		expect(diagnostics.db.passwordSet).toBe(true);
		expect(diagnostics.keycloak.url).toBe("https://keycloak.example/auth/");
		expect(diagnostics.keycloak.secretSet).toBe(true);
		expect(diagnostics.k8s.namespace).toBe("ik5-pimc01-sumd-system");

		const serialized = JSON.stringify(diagnostics);
		expect(serialized).not.toContain("super-secret-password");
		expect(serialized).not.toContain("kc-secret-value");
		expect(serialized).not.toContain("sum_user");
	});

	it("marks unset DB host so a missing env is obvious before TypeORM hangs", () => {
		const diagnostics = collectStartupDiagnostics({});
		expect(diagnostics.db.host).toBe("localhost (default)");
		expect(diagnostics.db.passwordSet).toBe(false);
		expect(diagnostics.keycloak.secretSet).toBe(false);
	});
});
