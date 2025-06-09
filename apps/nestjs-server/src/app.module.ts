import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthGuard, ResourceGuard, RoleGuard } from "nest-keycloak-connect";

import { CalculationModule } from "./modules/calculation/calculation.module";
import { KeycloakModule } from "./shared/keycloak/keycloak.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: [".env", `.env.${process.env.NODE_ENV}`],
		}),
		KeycloakModule,
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				type: "postgres",
				host: configService.get<string>("DB_HOST"),
				port: configService.get<number>("DB_PORT"),
				username: configService.get<string>("DB_USERNAME"),
				password: configService.get<string>("DB_PASSWORD"),
				database: configService.get<string>("DB_NAME"),
				entities: ["dist/**/*.entity.js"],
				synchronize: false,
				logging: configService.get<string>("NODE_ENV") === "development",
			}),
		}),
		CalculationModule,
	],
	providers: [
		{ provide: APP_GUARD, useClass: AuthGuard },
		{ provide: APP_GUARD, useClass: ResourceGuard },
		{ provide: APP_GUARD, useClass: RoleGuard },
	],
})
export class AppModule {}
