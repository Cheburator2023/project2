import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { existsSync, readFileSync } from "node:fs";
import { join } from "path";
import { DataSourceOptions, LoggerOptions } from "typeorm";

/** pg default 0 = wait forever; blackholed DB_HOST would hang NestFactory.create. */
export const DB_CONNECT_TIMEOUT_MS = 5000;

interface DatabaseConfig {
	host: string;
	port: number;
	username: string;
	password: string;
	database: string;
	schema?: string;
}

/**
 * Параметры TLS-подключения к PostgreSQL (node-postgres).
 * Передаются в `extra.ssl` DataSource/TypeORM.
 *
 * Соответствие с PostgreSQL sslmode:
 * - без TLS                                 — ssl: false / отсутствует (sslmode=disable)
 * - TLS с проверкой CA                       — { ca, rejectUnauthorized: true }  (verify-ca / verify-full)
 * - TLS без проверки (небезопасно, dev-only) — { rejectUnauthorized: false }
 * - mTLS                                     — плюс { cert, key } от клиента
 */
interface DatabaseTlsConfig {
    ca: string;
    cert?: string;
    key?: string;
    rejectUnauthorized: boolean;
}

/**
 * Читает содержимое файла, если он существует и доступен.
 * Возвращает `undefined` при любой ошибке — вызывающий код должен
 * трактовать это как «файл не задан / не найден» (обратная совместимость).
 */
function readFileIfExists(filePath: string | undefined): string | undefined {
    if (!filePath) return undefined;
    const trimmed = filePath.trim();
    if (!trimmed) return undefined;
    try {
        if (!existsSync(trimmed)) return undefined;
        return readFileSync(trimmed, "utf8");
    } catch {
        return undefined;
    }
}

/**
 * Резолвит TLS-конфигурацию для PostgreSQL.
 *
 * Правила (для обратной совместимости и безопасности):
 * 1. `TLS_ENABLED=false` (или не задан) → TLS выключен.
 * 2. `TLS_ENABLED=true`, но CA-сертификат не задан / нечитаем → TLS выключен
 *    (graceful fallback к обычному подключению).
 * 3. `TLS_ENABLED=true` и CA прочитан → включаем TLS:
 *    - `rejectUnauthorized` берётся из `TLS_REJECT_UNAUTHORIZED`
 *      (по умолчанию `true` — безопасно);
 *    - если заданы `TLS_CLIENT_CERT_PATH` + `TLS_CLIENT_KEY_PATH` — клиентские сертификаты (mTLS).
 */
function resolveDatabaseTlsConfig(
    configService: ConfigService,
): DatabaseTlsConfig | undefined {
    const tlsEnabled = readEnvFlag(configService, "TLS_ENABLED", false);
    if (!tlsEnabled) return undefined;

    const ca = readFileIfExists(configService.get<string>("TLS_CA_CERT_PATH"));
    if (!ca) return undefined;

    const cert = readFileIfExists(configService.get<string>("TLS_CLIENT_CERT_PATH"));
    const key = readFileIfExists(configService.get<string>("TLS_CLIENT_KEY_PATH"));

    return {
        ca,
        ...(cert ? { cert } : {}),
        ...(key ? { key } : {}),
        rejectUnauthorized:
            configService.get<string>("TLS_REJECT_UNAUTHORIZED") !== "false",
    };
}

const buildPostgresExtra = (
    schema: string | undefined,
    tls: DatabaseTlsConfig | undefined,
) => ({
    connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
    ...(schema ? { options: `-c search_path=${schema},public` } : {}),
    ...(tls ? { ssl: tls } : {}),
});

const resolveTypeOrmLogging = (configService: ConfigService): LoggerOptions => {
	if (resolveDbLogging(configService)) {
		return true;
	}
	return ["error", "warn", "migration"];
};

const logTypeOrmConnectTarget = (
	dbConfig: DatabaseConfig,
	migrationsRun: boolean,
    tlsEnabled: boolean,
): void => {
	if (process.env.JEST_WORKER_ID) {
		return;
	}
	console.log(
		`[startup] TypeORM connect ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}` +
			` schema=${dbConfig.schema || "-"}` +
			` timeout=${DB_CONNECT_TIMEOUT_MS}ms` +
            ` migrationsRun=${migrationsRun}` +
            ` tls=${tlsEnabled ? "on" : "off"}`,
	);
};

const getDatabaseConfig = (configService: ConfigService): DatabaseConfig => {
	const schema = configService.get<string>("DB_SCHEMA");
	return {
		host: configService.get<string>("DB_HOST", "localhost"),
		port: configService.get<number>("DB_PORT", 5432),
		username: configService.get<string>("DB_USERNAME", "postgres"),
		password: configService.get<string>("DB_PASSWORD", "postgres"),
		database: configService.get<string>("DB_NAME", "calculation_db"),
		...(schema ? { schema } : {}),
	};
};

const readEnvFlag = (
	configService: ConfigService,
	key: string,
	defaultValue: boolean,
): boolean => {
	const raw = configService.get<string | boolean | undefined>(key);
	if (raw === undefined || raw === null || raw === "") {
		return defaultValue;
	}
	if (typeof raw === "boolean") {
		return raw;
	}
	return raw === "true" || raw === "1";
};

const resolveDbLogging = (configService: ConfigService): boolean => {
	if (configService.get<string | undefined>("DB_LOGGING") !== undefined) {
		return readEnvFlag(configService, "DB_LOGGING", false);
	}
	// LOGGING — legacy alias (раньше включал все SQL-запросы по умолчанию)
	return readEnvFlag(configService, "LOGGING", false);
};

const resolveSynchronize = (configService: ConfigService): boolean => {
	if (configService.get<string>("NODE_ENV") === "production") {
		return false;
	}
	return readEnvFlag(configService, "DB_SYNCHRONIZE", false);
};

export const getTypeOrmModuleOptions = (
	configService: ConfigService,
): TypeOrmModuleOptions => {
	const dbConfig = getDatabaseConfig(configService);
	const { schema, ...connectionConfig } = dbConfig;
	const migrationsRun = readEnvFlag(configService, "DB_MIGRATIONS_RUN", true);
    const tls = resolveDatabaseTlsConfig(configService);
    logTypeOrmConnectTarget(dbConfig, migrationsRun, Boolean(tls));

	return {
		type: "postgres",
		...connectionConfig,
		...(schema ? { schema } : {}),
		extra: buildPostgresExtra(schema, tls),
		entities: [join(__dirname, "../../**/*.entity{.ts,.js}")],
		migrations: [join(__dirname, "../../migrations/*{.ts,.js}")],
		migrationsRun,
		synchronize: resolveSynchronize(configService),
		logging: resolveTypeOrmLogging(configService),
		autoLoadEntities: readEnvFlag(configService, "AUTO_LOAD_ENTITIES", false),
		retryAttempts: 3,
		retryDelay: 2000,
		verboseRetryLog: true,
	};
};

export const getDataSourceOptions = (
	configService: ConfigService,
): DataSourceOptions => {
	const dbConfig = getDatabaseConfig(configService);
	const { schema, ...connectionConfig } = dbConfig;
	const migrationsRun = readEnvFlag(configService, "DB_MIGRATIONS_RUN", true);
    const tls = resolveDatabaseTlsConfig(configService);

	return {
		type: "postgres",
		...connectionConfig,
		...(schema ? { schema } : {}),
        extra: buildPostgresExtra(schema, tls),
		entities: [join(__dirname, "../../**/*.entity{.ts,.js}")],
		migrations: [join(__dirname, "../../migrations/*{.ts,.js}")],
		migrationsRun,
		synchronize: resolveSynchronize(configService),
		logging: resolveTypeOrmLogging(configService),
	};
};
