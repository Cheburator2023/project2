import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthGuard, ResourceGuard, RoleGuard } from "nest-keycloak-connect";
import { Calculation } from "./modules/calculation/entities/calculation.entity";
import { CalculationModule } from "./modules/calculation/calculation.module";
import { KeycloakModule } from "./shared/keycloak/keycloak.module";
import { QuestionnaireModule } from "./modules/questionnaire/questionnaire.module";
import { QuestionnaireItemEntity } from "./modules/questionnaire/entities/questionnaire-item.entity";
import { CoefficientEntity } from "./modules/questionnaire/entities/coefficient.entity";
import {StreamAverageEntity} from "./modules/questionnaire/entities/stream-average.entity";

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
					StreamAverageEntity
				],
				migrations: ["dist/migrations/*.js"],
				migrationsRun: true,
				synchronize: configService.get<string>("NODE_ENV") !== "production",
				logging: configService.get<string>("NODE_ENV") === "development",
			}),
		}),
		CalculationModule,
		QuestionnaireModule,
	],
	controllers: [],
	providers: [],
})
export class AppModule {}
