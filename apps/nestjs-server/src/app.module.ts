import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthGuard, ResourceGuard, RoleGuard } from "nest-keycloak-connect";
import { CalculationModule } from "./modules/calculation/calculation.module";
import { Calculation } from "./modules/calculation/entities/calculation.entity";
import { ArtefactValueEntity } from "./modules/questionnaire/entities/artefact-value.entity";
import { CoefficientEntity } from "./modules/questionnaire/entities/coefficient.entity";
import { QuestionnaireItemEntity } from "./modules/questionnaire/entities/questionnaire-item.entity";
import { StreamAverageEntity } from "./modules/questionnaire/entities/stream-average.entity";
import { QuestionnaireModule } from "./modules/questionnaire/questionnaire.module";
import { DatabaseModule } from "./shared/database/database.module";
import { GodModeGuard } from "./shared/keycloak/god-mode.guard";
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
				host: configService.get<string>("DB_HOST", "localhost"),
				port: configService.get<number>("DB_PORT", 5430),
				username: configService.get<string>("DB_USERNAME"),
				password: configService.get<string>("DB_PASSWORD"),
				database: configService.get<string>("DB_NAME"),
				entities: [
					Calculation,
					QuestionnaireItemEntity,
					CoefficientEntity,
					StreamAverageEntity,
					ArtefactValueEntity,
				],
				migrations: ["dist/migrations/*.js"],
				migrationsRun: true,
				synchronize: configService.get<string>("NODE_ENV") !== "production",
				logging: configService.get<string>("NODE_ENV") === "development",
			}),
		}),
		CalculationModule,
		QuestionnaireModule,
		DatabaseModule,
	],
	providers: [
		// AuthGuard
		{
			provide: "DELEGATE_GUARD_AUTH",
			useClass: AuthGuard,
		},
		{
			provide: APP_GUARD,
			useFactory: (reflector: Reflector, delegateGuard: AuthGuard) =>
				new GodModeGuard(reflector, delegateGuard),
			inject: [Reflector, "DELEGATE_GUARD_AUTH"],
		},
		// ResourceGuard
		{
			provide: "DELEGATE_GUARD_RESOURCE",
			useClass: ResourceGuard,
		},
		{
			provide: APP_GUARD,
			useFactory: (reflector: Reflector, delegateGuard: ResourceGuard) =>
				new GodModeGuard(reflector, delegateGuard),
			inject: [Reflector, "DELEGATE_GUARD_RESOURCE"],
		},
		// RoleGuard
		{
			provide: "DELEGATE_GUARD_ROLE",
			useClass: RoleGuard,
		},
		{
			provide: APP_GUARD,
			useFactory: (reflector: Reflector, delegateGuard: RoleGuard) =>
				new GodModeGuard(reflector, delegateGuard),
			inject: [Reflector, "DELEGATE_GUARD_ROLE"],
		},
	],
})
export class AppModule {}
