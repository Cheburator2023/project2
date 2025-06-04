import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// Swagger configuration
	const config = new DocumentBuilder()
		.setTitle("Calculation System API")
		.setDescription("API for managing calculations")
		.setVersion("1.0")
		.build();
	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup("api", app, document);

	app.useGlobalPipes(new ValidationPipe());
	await app.listen(3000);
}
bootstrap();
