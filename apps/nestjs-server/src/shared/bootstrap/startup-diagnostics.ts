import { ConfigService } from "@nestjs/config";
import { DB_CONNECT_TIMEOUT_MS } from "../database/database.config";

export const STARTUP_LOG_PREFIX = "[startup]";

export type StartupDiagnostics = {
	at: string;
	pid: number;
	nodeEnv: string;
	port: string;
	db: {
		host: string;
		port: string;
		name: string;
		schema: string;
		migrationsRun: string;
		synchronize: string;
		userSet: boolean;
		passwordSet: boolean;
		connectTimeoutMs: number;
	};
	keycloak: {
		url: string;
		realm: string;
		client: string;
		secretSet: boolean;
	};
	audit: {
		enabled: string;
		sidecarUrl: string;
	};
	tslg: {
		configured: boolean;
		host: string;
		port: string;
	};
	k8s: {
		namespace: string;
		podName: string;
		podIp: string;
		nodeName: string;
	};
	factoryCatalogSyncOnStart: string;
};

const unset = "(unset)";

const envText = (
	env: NodeJS.Dict<string | undefined>,
	key: string,
	fallback?: string,
): string => {
	const raw = env[key];
	if (raw !== undefined && raw !== null && String(raw) !== "") {
		return String(raw);
	}
	return fallback ?? unset;
};

export const collectStartupDiagnostics = (
	env: NodeJS.Dict<string | undefined> = process.env,
): StartupDiagnostics => ({
	at: new Date().toISOString(),
	pid: process.pid,
	nodeEnv: envText(env, "NODE_ENV", "development"),
	port: envText(env, "PORT", "3000"),
	db: {
		host: envText(env, "DB_HOST", "localhost (default)"),
		port: envText(env, "DB_PORT", "5432 (default)"),
		name: envText(env, "DB_NAME", "calculation_db (default)"),
		schema: envText(env, "DB_SCHEMA"),
		migrationsRun: envText(env, "DB_MIGRATIONS_RUN", "true (default)"),
		synchronize: envText(env, "DB_SYNCHRONIZE", "false (default)"),
		userSet: Boolean(env.DB_USERNAME),
		passwordSet: Boolean(env.DB_PASSWORD),
		connectTimeoutMs: DB_CONNECT_TIMEOUT_MS,
	},
	keycloak: {
		url: envText(env, "KEYCLOAK_URL"),
		realm: envText(env, "KEYCLOAK_REALMS"),
		client: envText(env, "KEYCLOAK_CLIENT"),
		secretSet: Boolean(env.KEYCLOAK_SECRET),
	},
	audit: {
		enabled: envText(env, "AUDIT_ENABLED", "true (default)"),
		sidecarUrl: envText(env, "AUDIT_SIDECAR_URL", "http://localhost:8081/api/v2/audit (default)"),
	},
	tslg: {
		configured: Boolean(env.TSLG_AGENT_HOST && env.TSLG_AGENT_PORT),
		host: envText(env, "TSLG_AGENT_HOST"),
		port: envText(env, "TSLG_AGENT_PORT"),
	},
	k8s: {
		namespace: envText(env, "KUBERNETES_NAMESPACE"),
		podName: envText(env, "POD_NAME"),
		podIp: envText(env, "POD_IP"),
		nodeName: envText(env, "NODE_NAME"),
	},
	factoryCatalogSyncOnStart: envText(env, "V2_FACTORY_CATALOG_SYNC_ON_START", "false (default)"),
});

export const envFromConfigService = (
	config: ConfigService,
): NodeJS.Dict<string | undefined> => ({
	...process.env,
	NODE_ENV: config.get<string>("NODE_ENV") ?? process.env.NODE_ENV,
	PORT: config.get<string>("PORT") ?? process.env.PORT,
	DB_HOST: config.get<string>("DB_HOST") ?? process.env.DB_HOST,
	DB_PORT: String(config.get<string | number>("DB_PORT") ?? process.env.DB_PORT ?? ""),
	DB_NAME: config.get<string>("DB_NAME") ?? process.env.DB_NAME,
	DB_SCHEMA: config.get<string>("DB_SCHEMA") ?? process.env.DB_SCHEMA,
	DB_MIGRATIONS_RUN:
		config.get<string>("DB_MIGRATIONS_RUN") ?? process.env.DB_MIGRATIONS_RUN,
	DB_SYNCHRONIZE: config.get<string>("DB_SYNCHRONIZE") ?? process.env.DB_SYNCHRONIZE,
	DB_USERNAME: config.get<string>("DB_USERNAME") ?? process.env.DB_USERNAME,
	DB_PASSWORD: config.get<string>("DB_PASSWORD") ?? process.env.DB_PASSWORD,
	KEYCLOAK_URL: config.get<string>("KEYCLOAK_URL") ?? process.env.KEYCLOAK_URL,
	KEYCLOAK_REALMS:
		config.get<string>("KEYCLOAK_REALMS") ?? process.env.KEYCLOAK_REALMS,
	KEYCLOAK_CLIENT:
		config.get<string>("KEYCLOAK_CLIENT") ?? process.env.KEYCLOAK_CLIENT,
	KEYCLOAK_SECRET:
		config.get<string>("KEYCLOAK_SECRET") ?? process.env.KEYCLOAK_SECRET,
	AUDIT_ENABLED: config.get<string>("AUDIT_ENABLED") ?? process.env.AUDIT_ENABLED,
	AUDIT_SIDECAR_URL:
		config.get<string>("AUDIT_SIDECAR_URL") ?? process.env.AUDIT_SIDECAR_URL,
	TSLG_AGENT_HOST:
		config.get<string>("TSLG_AGENT_HOST") ?? process.env.TSLG_AGENT_HOST,
	TSLG_AGENT_PORT:
		config.get<string>("TSLG_AGENT_PORT") ?? process.env.TSLG_AGENT_PORT,
	V2_FACTORY_CATALOG_SYNC_ON_START:
		config.get<string>("V2_FACTORY_CATALOG_SYNC_ON_START") ??
		process.env.V2_FACTORY_CATALOG_SYNC_ON_START,
});

export const startupLog = (message: string, extra?: unknown): void => {
	if (extra === undefined) {
		console.log(`${STARTUP_LOG_PREFIX} ${message}`);
		return;
	}
	console.log(`${STARTUP_LOG_PREFIX} ${message} ${JSON.stringify(extra)}`);
};

export const logStartupDiagnostics = (
	label: string,
	env: NodeJS.Dict<string | undefined> = process.env,
): void => {
	startupLog(label, collectStartupDiagnostics(env));
};
