import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StreamMappingService } from "../../shared/services/stream-mapping.service";
import { CalculationController } from "./controllers/calculation.controller";
import { Calculation } from "./entities/calculation.entity";
import { CalculationService } from "./services/calculation.service";
import { ExcelExportService } from "./services/excel-export.service";

@Module({
	imports: [TypeOrmModule.forFeature([Calculation])],
	controllers: [CalculationController],
	providers: [CalculationService, StreamMappingService, ExcelExportService],
	exports: [CalculationService],
})
export class CalculationModule {}
