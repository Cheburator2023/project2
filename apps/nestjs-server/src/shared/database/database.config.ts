import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
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

const buildPostgresExtra = (schema?: string) => ({
	connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
	...(schema ? { options: `-c search_path=${schema},public` } : {}),
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
): void => {
	if (process.env.JEST_WORKER_ID) {
		return;
	}
	console.log(
		`[startup] TypeORM connect ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}` +
			` schema=${dbConfig.schema || "-"}` +
			` timeout=${DB_CONNECT_TIMEOUT_MS}ms` +
			` migrationsRun=${migrationsRun}`,
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
	logTypeOrmConnectTarget(dbConfig, migrationsRun);

	return {
		type: "postgres",
		...connectionConfig,
		...(schema ? { schema } : {}),
		extra: buildPostgresExtra(schema),
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

	return {
		type: "postgres",
		...connectionConfig,
		...(schema ? { schema } : {}),
		extra: buildPostgresExtra(schema),
		entities: [join(__dirname, "../../**/*.entity{.ts,.js}")],
		migrations: [join(__dirname, "../../migrations/*{.ts,.js}")],
		migrationsRun,
		synchronize: resolveSynchronize(configService),
		logging: resolveTypeOrmLogging(configService),
	};
};
