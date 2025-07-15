import {Module} from "@nestjs/common";
import {ConfigModule} from "@nestjs/config";
import {APP_GUARD} from "@nestjs/core";
import {AuthGuard, ResourceGuard, RoleGuard} from "nest-keycloak-connect";
import {CalculationModule} from "./modules/calculation/calculation.module";
import {QuestionnaireModule} from "./modules/questionnaire/questionnaire.module";
import {KeycloakModule} from "./shared/keycloak/keycloak.module";
import {DatabaseModule} from "./shared/database/database.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [".env", `.env.${process.env.NODE_ENV}`],
        }),
        KeycloakModule,
        DatabaseModule,
        CalculationModule,
        QuestionnaireModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: AuthGuard,
        },
        {
            provide: APP_GUARD,
            useClass: ResourceGuard,
        },
        {
            provide: APP_GUARD,
            useClass: RoleGuard,
        },
    ],
})
export class AppModule {
}
