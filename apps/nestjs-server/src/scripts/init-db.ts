import { ConfigService } from "@nestjs/config";
import { config } from "dotenv";
import { resolve } from "path";
import { DataSource } from "typeorm";

config({ path: resolve(__dirname, "../../.env") });

const configService = new ConfigService();

const dataSource = new DataSource({
	type: "postgres",
	host: configService.get<string>("DB_HOST", "localhost"),
	port: configService.get<number>("DB_PORT", 5430),
	username: configService.get<string>("DB_USERNAME", "postgres"),
	password: configService.get<string>("DB_PASSWORD", "postgres"),
	database: configService.get<string>("DB_NAME", "calculation_db"),
	entities: ["src/**/*.entity.ts"],
	migrations: ["src/migrations/*.ts"],
	synchronize: false,
});

async function runMigrations() {
	try {
		await dataSource.initialize();
		console.log("Data Source has been initialized!");

		await dataSource.runMigrations();
		console.log("Migrations have been run successfully!");

		await dataSource.destroy();
		console.log("Connection closed.");
	} catch (error) {
		console.error("Error during migration:", error);
		process.exit(1);
	}
}

runMigrations();
