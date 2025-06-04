import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CalculationModule } from "./modules/calculation/calculation.module";
import { Calculation } from "./modules/calculation/entities/calculation.entity";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ".env",
		}),
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				type: "postgres",
				host: configService.get<string>("DB_HOST", "localhost"),
				port: configService.get<number>("DB_PORT", 5432),
				username: configService.get<string>("DB_USERNAME", "postgres"),
				password: configService.get<string>("DB_PASSWORD", "postgres"),
				database: configService.get<string>("DB_NAME", "calculation_db"),
				entities: [Calculation],
				synchronize: configService.get<string>("NODE_ENV") !== "production",
				logging: configService.get<string>("NODE_ENV") === "development",
			}),
		}),
		CalculationModule,
	],
	controllers: [],
	providers: [],
})
export class AppModule {}
