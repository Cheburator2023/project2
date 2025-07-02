import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.enableCors({
		origin: [
			"https://smart-anketa-frontend-ds1-lpad01-sumd-team-sumcore-system.apps.ds1-lpad01.corp.dev.vtb",
		],
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	});

	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			whitelist: true,
			forbidNonWhitelisted: true,
			transformOptions: {
				enableImplicitConversion: true,
			},
			disableErrorMessages: false,
			validationError: {
				target: false,
				value: false,
			},
		}),
	);

	const config = new DocumentBuilder()
		.setTitle("Smart Anketa API")
		.setDescription("API documentation for Smart Anketa application")
		.setVersion("1.0")
		.addBearerAuth(
			{
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
			},
			"JWT-auth",
		)
		.build();

	const document = SwaggerModule.createDocument(app, config);

	SwaggerModule.setup("api", app, document);

	app.getHttpAdapter().get("/api-json", (req, res) => {
		res.setHeader("Content-Type", "application/json");
		res.send(document);
	});

	await app.listen(3000);
}
bootstrap();
