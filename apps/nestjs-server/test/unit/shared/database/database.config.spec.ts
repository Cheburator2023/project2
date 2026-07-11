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
		const opts: any = getTypeOrmModuleOptions(
			buildCfg({ DB_SCHEMA: "sumd" }),
		);
		expect(opts.type).toBe("postgres");
		expect(opts.host).toBe("h");
		expect(opts.schema).toBe("sumd");
		expect(opts.extra.options).toBe("-c search_path=sumd,public");
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

	it("disables synchronize in production even when DB_SYNCHRONIZE=true", () => {
		const opts: any = getTypeOrmModuleOptions(
			buildCfg({ NODE_ENV: "production", DB_SYNCHRONIZE: true }),
		);
		expect(opts.synchronize).toBe(false);
	});

	it("treats DB_SYNCHRONIZE=false string as disabled", () => {
		const opts: any = getTypeOrmModuleOptions(
			buildCfg({ DB_SYNCHRONIZE: "false" }),
		);
		expect(opts.synchronize).toBe(false);
	});
});
