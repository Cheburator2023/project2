import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as express from "express";
import { AppModule } from "./app.module";
import { logger } from "./shared/logger/logger.config";
import { CustomLogger } from "./shared/services/logger.service";
import { RateLimiterMiddleware } from "./shared/middleware/rate-limiter.middleware";

async function bootstrap() {
    const customLogger = new CustomLogger();

    const app = await NestFactory.create(AppModule, {
        bodyParser: true,
        bufferLogs: true,
        logger: customLogger,
    });

	const rateLimiter = app.get(RateLimiterMiddleware);
    app.use(rateLimiter.use.bind(rateLimiter));

	app.enableCors({
		origin: "*",
		credentials: true,
	});

	app.use(express.json({ limit: "10mb" }));
	app.use(express.urlencoded({ limit: "10mb", extended: true }));

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
			exceptionFactory: (errors) => {
				const errorMessages = errors.map((error) => {
					const messages = error.constraints
						? Object.values(error.constraints).join(", ")
						: `Validation failed for field ${error.property}`;
					return {
						field: error.property,
						message: messages,
					};
				});
				return new BadRequestException({
					message: "Validation failed",
					errors: errorMessages,
				});
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
				name: "JWT",
				description: "Enter JWT token",
				in: "header",
			},
			"JWT-auth",
		)
		.build();

	const document = SwaggerModule.createDocument(app, config);

	SwaggerModule.setup("api", app, document);

	app.getHttpAdapter().get("/api-json", (_req, res) => {
		res.setHeader("Content-Type", "application/json");
		res.send(document);
	});

    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`🔄 Application is running on port ${port}`);

    process.on('SIGTERM', async () => {
        customLogger.onApplicationShutdown();
        await app.close();
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        customLogger.onApplicationShutdown();
        await app.close();
        process.exit(0);
    });
}
bootstrap();
