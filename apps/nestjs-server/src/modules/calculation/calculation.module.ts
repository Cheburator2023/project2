import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StreamMappingService } from "../../shared/services/stream-mapping.service";
import { CalculationController } from "./controllers/calculation.controller";
import { Calculation } from "./entities/calculation.entity";
import { CalculationService } from "./services/calculation.service";
import { ExcelExportService } from "./services/excel-export.service";
import { JsonValidationPipe } from "./pipe/json-validation.pipe";
import { CustomLogger } from "src/shared/services/logger.service";

@Module({
	imports: [TypeOrmModule.forFeature([Calculation])],
	controllers: [CalculationController],
	providers: [CalculationService, StreamMappingService, CustomLogger, JsonValidationPipe, ExcelExportService],
	exports: [CalculationService],
})
export class CalculationModule {}
