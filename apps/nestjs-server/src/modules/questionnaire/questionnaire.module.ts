import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Coefficient } from "./entities/coefficient.entity";
import { QuestionnaireItem } from "./entities/questionnaire-item.entity";
import { CoefficientCalculatorService } from "./services/coefficient-calculator.service";
import { QuestionnaireService } from "./services/questionnaire.service";

@Module({
	imports: [TypeOrmModule.forFeature([QuestionnaireItem, Coefficient])],
	providers: [QuestionnaireService, CoefficientCalculatorService],
	exports: [QuestionnaireService, CoefficientCalculatorService],
})
export class QuestionnaireModule {}
