import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as session from "express-session";
import * as KeycloakConnect from "keycloak-connect";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	const memoryStore = new session.MemoryStore();
	app.use(
		session({
			secret: "my-secret",
			resave: false,
			saveUninitialized: true,
			store: memoryStore,
		}),
	);

	const keycloak = new KeycloakConnect(
		{ store: memoryStore },
		{
			"confidential-port": 0,
			realm: process.env.KEYCLOAK_REALMS || "",
			"auth-server-url": process.env.KEYCLOAK_URL || "",
			resource: process.env.KEYCLOAK_CLIENT || "",
			"ssl-required": "none",
			"bearer-only": true,
		},
	);
	app.use(keycloak.middleware());

	app.useGlobalPipes(new ValidationPipe());

	const config = new DocumentBuilder()
		.setTitle("Calculation System API")
		.setDescription("API for managing calculations")
		.setVersion("1.0")
		.build();
	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup("api", app, document);

	await app.listen(3000);
}
bootstrap();
