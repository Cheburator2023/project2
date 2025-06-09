import { Injectable } from "@nestjs/common";
import {
	KeycloakConnectOptions,
	KeycloakConnectOptionsFactory,
	TokenValidation,
} from "nest-keycloak-connect";

@Injectable()
export class KeycloakConfigService implements KeycloakConnectOptionsFactory {
	createKeycloakConnectOptions(): KeycloakConnectOptions {
		if (process.env.NODE_ENV === "development") {
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
		}

		return {
			authServerUrl: process.env.KEYCLOAK_URL,
			realm: process.env.KEYCLOAK_REALMS,
			resource: process.env.KEYCLOAK_CLIENT,
			tokenValidation: TokenValidation.OFFLINE,
			secret: "",
		};
	}
}
