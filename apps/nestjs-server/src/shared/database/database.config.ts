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
}

const getDatabaseConfig = (configService: ConfigService): DatabaseConfig => ({
	host: configService.get<string>("DB_HOST", "localhost"),
	port: configService.get<number>("DB_PORT", 5432),
	username: configService.get<string>("DB_USERNAME", "postgres"),
	password: configService.get<string>("DB_PASSWORD", "postgres"),
	database: configService.get<string>("DB_NAME", "calculation_db"),
});

export const getTypeOrmModuleOptions = (
	configService: ConfigService,
): TypeOrmModuleOptions => {
	const dbConfig = getDatabaseConfig(configService);

	return {
		type: "postgres",
		...dbConfig,
		entities: [join(__dirname, "../../**/*.entity{.ts,.js}")],
		synchronize: configService.get<string>("NODE_ENV") !== "production",
		logging: configService.get<string>("NODE_ENV") === "development",
		autoLoadEntities: true,
	};
};

export const getDataSourceOptions = (
	configService: ConfigService,
): DataSourceOptions => {
	const dbConfig = getDatabaseConfig(configService);

	return {
		type: "postgres",
		...dbConfig,
		entities: [join(__dirname, "../../**/*.entity{.ts,.js}")],
		migrations: [join(__dirname, "../../migrations/*{.ts,.js}")],
		migrationsRun: configService.get<string>("NODE_ENV") === "development",
		logging: configService.get<string>("NODE_ENV") === "development",
		synchronize: false,
	};
};
