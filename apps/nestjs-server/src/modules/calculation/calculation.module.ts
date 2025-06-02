import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { CalculationController } from "./controllers/calculation.controller";
import { Calculation } from "./entities/calculation.entity";
import { CalculationService } from "./services/calculation.service";

@Module({
	imports: [TypeOrmModule.forFeature([Calculation]), AuthModule],
	controllers: [CalculationController],
	providers: [CalculationService],
	exports: [CalculationService],
})
export class CalculationModule {}
