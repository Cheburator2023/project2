import { ConfigService } from "@nestjs/config";
import {
	getTypeOrmModuleOptions,
	getDataSourceOptions,
} from "../../../../src/shared/database/database.config";

describe("database.config", () => {
	const buildCfg = (over: Record<string, any> = {}) => {
		return new ConfigService({
			DB_HOST: "h",
			DB_PORT: 5555,
			DB_USERNAME: "u",
			DB_PASSWORD: "p",
			DB_NAME: "db",
			DB_MIGRATIONS_RUN: false,
			DB_SYNCHRONIZE: true,
			LOGGING: false,
			AUTO_LOAD_ENTITIES: true,
			...over,
		});
	};

	it("getTypeOrmModuleOptions returns full options", () => {
		const opts: any = getTypeOrmModuleOptions(buildCfg());
		expect(opts.type).toBe("postgres");
		expect(opts.host).toBe("h");
		expect(opts.synchronize).toBe(true);
		expect(opts.autoLoadEntities).toBe(true);
	});

	it("getDataSourceOptions returns DataSource-compatible options", () => {
		const opts: any = getDataSourceOptions(buildCfg());
		expect(opts.type).toBe("postgres");
		expect(Array.isArray(opts.entities)).toBe(true);
	});

	it("falls back to default values when env unset", () => {
		const opts: any = getTypeOrmModuleOptions(new ConfigService({}));
		expect(opts.host).toBe("localhost");
		expect(opts.port).toBe(5432);
	});
});
