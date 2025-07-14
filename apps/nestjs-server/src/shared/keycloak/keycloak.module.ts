import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { KeycloakConnectModule } from "nest-keycloak-connect";
import { KeycloakConfigService } from "./keycloak.config.service";

@Module({
	imports: [
		ConfigModule.forRoot(),
		KeycloakConnectModule.registerAsync({
			useClass: KeycloakConfigService,
		}),
	],
	providers: [KeycloakConfigService],
	exports: [KeycloakConnectModule, KeycloakConfigService],
})
export class KeycloakModule {}
