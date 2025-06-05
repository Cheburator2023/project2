import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";

const configService = new ConfigService();

export default new DataSource({
	type: "postgres",
	host: configService.get<string>("DB_HOST", "localhost"),
	port: Number.parseInt(configService.get<string>("DB_PORT", "5432"), 10),
	username: configService.get<string>("DB_USERNAME", "postgres"),
	password: configService.get<string>("DB_PASSWORD", "postgres") || "postgres",
	database: configService.get<string>("DB_NAME", "calculation_db"),
	entities: ["src/**/*.entity{.ts,.js}"],
	migrations: ["migrations/*{.ts,.js}"],
	synchronize: false,
	logging: configService.get<string>("NODE_ENV") === "development",
});
