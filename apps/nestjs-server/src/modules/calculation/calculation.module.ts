import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CalculationController } from "./controllers/calculation.controller";
import { Calculation } from "./entities/calculation.entity";
import { CalculationService } from "./services/calculation.service";

@Module({
	imports: [TypeOrmModule.forFeature([Calculation])],
	controllers: [CalculationController],
	providers: [CalculationService],
	exports: [CalculationService],
})
export class CalculationModule {}
