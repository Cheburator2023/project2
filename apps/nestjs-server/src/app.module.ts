import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { AuthGuard, ResourceGuard, RoleGuard } from "nest-keycloak-connect";
import { AppInfoModule } from "./modules/app-info/app-info.module";
import { CalculationModule } from "./modules/calculation/calculation.module";
import { DocsModule } from "./modules/docs/docs.module";
import { QuestionnaireModule } from "./modules/questionnaire/questionnaire.module";
import { AnketaV2Module } from "./modules/anketa-v2/anketa-v2.module";
import { KanbanBoardModule } from "./modules/kanban-board/kanban-board.module";
import { DatabaseModule } from "./shared/database/database.module";
import { GodModeGuard } from "./shared/keycloak/god-mode.guard";
import { KeycloakModule } from "./shared/keycloak/keycloak.module";
import { CustomLogger } from "./shared/services/logger.service";
import { AbortInterceptor } from "./shared/interceptors/abort.interceptor";
import { MiddlewareModule } from "./shared/middleware/middleware.module";
import { LoggingInterceptor } from "./shared/interceptors/logging.interceptor";
import { RetryInterceptor } from "./shared/interceptors/retry.interceptor";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: [".env", `.env.${process.env.NODE_ENV}`],
		}),
		DatabaseModule,
		KeycloakModule,
		AppInfoModule,
		CalculationModule,
		DocsModule,
		QuestionnaireModule,
		AnketaV2Module,
		KanbanBoardModule,
		MiddlewareModule,
	],
	providers: [
		CustomLogger,
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
		{
			provide: APP_INTERCEPTOR,
			useClass: AbortInterceptor,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: LoggingInterceptor,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: RetryInterceptor,
		},
	],
})
export class AppModule {}
