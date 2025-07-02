import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { QuestionnaireController } from "./controllers/questionnaire.controller";
import { CoefficientController } from "./controllers/coefficient.controller";
import { CoefficientEntity } from "./entities/coefficient.entity";
import { QuestionnaireItemEntity } from "./entities/questionnaire-item.entity";
import { CoefficientService } from "./services/coefficient.service";
import { QuestionnaireService } from "./services/questionnaire.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            QuestionnaireItemEntity,
            CoefficientEntity,
        ]),
    ],
    controllers: [
        QuestionnaireController,
        CoefficientController,
    ],
    providers: [
        QuestionnaireService,
        CoefficientService,
    ],
    exports: [
        QuestionnaireService,
        CoefficientService,
    ],
})
export class QuestionnaireModule {}