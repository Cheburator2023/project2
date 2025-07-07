import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { QuestionnaireController } from "./controllers/questionnaire.controller";
import { CoefficientController } from "./controllers/coefficient.controller";
import { CoefficientEntity } from "./entities/coefficient.entity";
import { QuestionnaireItemEntity } from "./entities/questionnaire-item.entity";
import { CoefficientService } from "./services/coefficient.service";
import { QuestionnaireService } from "./services/questionnaire.service";
import { ReferenceDataService } from "./services/reference-data.service";
import {StreamAverageEntity} from "./entities/stream-average.entity";
import {ArtefactValueEntity} from "./entities/artefact-value.entity";


@Module({
    imports: [
        TypeOrmModule.forFeature([
            QuestionnaireItemEntity,
            CoefficientEntity,
            StreamAverageEntity,
            ArtefactValueEntity,
        ]),
    ],
    controllers: [
        QuestionnaireController,
        CoefficientController,
    ],
    providers: [
        QuestionnaireService,
        CoefficientService,
        ReferenceDataService,
    ],
    exports: [
        QuestionnaireService,
        CoefficientService,
    ],
})
export class QuestionnaireModule {}