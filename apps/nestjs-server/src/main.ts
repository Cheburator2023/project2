import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as express from "express";
import { AppModule } from "./app.module";
import { runPostListenSeed } from "./shared/bootstrap/run-post-listen-seed";
import {
	envFromConfigService,
	logStartupDiagnostics,
	startupLog,
} from "./shared/bootstrap/startup-diagnostics";
import { logger } from "./shared/logger/logger.config";
import { CustomLogger } from "./shared/services/logger.service";
import { RateLimiterMiddleware } from "./shared/middleware/rate-limiter.middleware";

async function bootstrap() {
    startupLog(`process started pid=${process.pid}`);
    logStartupDiagnostics("container env (before NestFactory.create)");

    const customLogger = new CustomLogger();

    startupLog(
        "NestFactory.create starting — blocks on Postgres connect + migrations",
    );
    const createStarted = Date.now();
    const app = await NestFactory.create(AppModule, {
        bodyParser: true,
        bufferLogs: false,
        logger: customLogger,
    });
    startupLog(`NestFactory.create done in ${Date.now() - createStarted}ms`);
    logStartupDiagnostics(
        "resolved config (after ConfigModule)",
        envFromConfigService(app.get(ConfigService)),
    );

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
    startupLog(`listen() on port ${port}`);
    const server = await app.listen(port);
    // Заводская схема и bulk-reconcile могут выполняться несколько минут — не обрываем по HTTP-таймауту Node.
    if (typeof server.setTimeout === "function") {
        server.setTimeout(0);
    }
    startupLog(`port ${port} is open`);
    try {
        await runPostListenSeed(app);
    } catch (error) {
        startupLog("post-listen seed failed (server stays up)", {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
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
bootstrap().catch((error) => {
    console.error(
        "[startup] fatal",
        error instanceof Error ? error.stack || error.message : error,
    );
    process.exit(1);
});
