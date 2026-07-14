import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { join } from "path";
import { DataSourceOptions } from "typeorm";

interface DatabaseConfig {
	host: string;
	port: number;
	username: string;
	password: string;
	database: string;
	schema?: string;
}

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

	return {
		type: "postgres",
		...connectionConfig,
		...(schema
			? {
					schema,
					extra: { options: `-c search_path=${schema},public` },
				}
			: {}),
		entities: [join(__dirname, "../../**/*.entity{.ts,.js}")],
		migrations: [join(__dirname, "../../migrations/*{.ts,.js}")],
		migrationsRun: readEnvFlag(configService, "DB_MIGRATIONS_RUN", true),
		synchronize: resolveSynchronize(configService),
		logging: readEnvFlag(configService, "LOGGING", true),
		autoLoadEntities: readEnvFlag(configService, "AUTO_LOAD_ENTITIES", false),
	};
};

export const getDataSourceOptions = (
	configService: ConfigService,
): DataSourceOptions => {
	const dbConfig = getDatabaseConfig(configService);
	const { schema, ...connectionConfig } = dbConfig;

	console.log(connectionConfig);

	return {
		type: "postgres",
		...connectionConfig,
		...(schema
			? {
					schema,
					extra: { options: `-c search_path=${schema},public` },
				}
			: {}),
		entities: [join(__dirname, "../../**/*.entity{.ts,.js}")],
		migrations: [join(__dirname, "../../migrations/*{.ts,.js}")],
		migrationsRun: readEnvFlag(configService, "DB_MIGRATIONS_RUN", true),
		synchronize: resolveSynchronize(configService),
		logging: readEnvFlag(configService, "LOGGING", true),
	};
};
