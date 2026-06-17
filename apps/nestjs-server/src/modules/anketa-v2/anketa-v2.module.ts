import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { V2TemplateEntity } from "./entities/v2-template.entity";
import { V2TemplateVersionEntity } from "./entities/v2-template-version.entity";
import { V2TemplateAuditEntity } from "./entities/v2-template-audit.entity";
import { V2DictionaryEntity } from "./entities/v2-dictionary.entity";
import { V2DictionaryItemEntity } from "./entities/v2-dictionary-item.entity";
import { V2QuestionnaireEntity } from "./entities/v2-questionnaire.entity";
import { V2TemplateService } from "./services/v2-template.service";
import { V2TemplateVersionService } from "./services/v2-template-version.service";
import { V2DictionaryService } from "./services/v2-dictionary.service";
import { V2DictionarySeedService } from "./services/v2-dictionary-seed.service";
import { V2AuditService } from "./services/v2-audit.service";
import { V2TemplateController } from "./controllers/v2-template.controller";
import { V2TemplateVersionController } from "./controllers/v2-template-version.controller";
import { V2DictionaryController } from "./controllers/v2-dictionary.controller";
import { V2AuditController } from "./controllers/v2-audit.controller";
import { V2CalculationController } from "./controllers/v2-calculation.controller";
import { V2CalculationService } from "./services/v2-calculation.service";
import { V2QuestionnaireService } from "./services/v2-questionnaire.service";
import { V2QuestionnaireController } from "./controllers/v2-questionnaire.controller";
import { V2TypicalWorkEntity } from "./entities/v2-typical-work.entity";
import { V2TypicalWorkNormEntity } from "./entities/v2-typical-work-norm.entity";
import { V2TypicalWorkRuleEntity } from "./entities/v2-typical-work-rule.entity";
import { V2TypicalWorkLaborCoefficientEntity } from "./entities/v2-typical-work-labor-coefficient.entity";
import { V2TypicalWorkVersionConfigEntity } from "./entities/v2-typical-work-version-config.entity";
import {
	V2TypicalWorkSeedService,
	V2TypicalWorkService,
} from "./services/v2-typical-work.service";
import { V2TypicalWorkWriteService } from "./services/v2-typical-work-write.service";
import { V2TypicalWorkRuntimeService } from "./services/v2-typical-work-runtime.service";
import { V2TypicalWorkController } from "./controllers/v2-typical-work.controller";

@Module({
	imports: [
		TypeOrmModule.forFeature([
			V2TemplateEntity,
			V2TemplateVersionEntity,
			V2TemplateAuditEntity,
			V2DictionaryEntity,
			V2DictionaryItemEntity,
			V2QuestionnaireEntity,
			V2TypicalWorkEntity,
			V2TypicalWorkNormEntity,
			V2TypicalWorkRuleEntity,
			V2TypicalWorkLaborCoefficientEntity,
			V2TypicalWorkVersionConfigEntity,
		]),
	],
	controllers: [
		V2TemplateController,
		V2TemplateVersionController,
		V2DictionaryController,
		V2AuditController,
		V2CalculationController,
		V2QuestionnaireController,
		V2TypicalWorkController,
	],
	providers: [
		V2TemplateService,
		V2TemplateVersionService,
		V2DictionaryService,
		V2DictionarySeedService,
		V2AuditService,
		V2CalculationService,
		V2QuestionnaireService,
		V2TypicalWorkSeedService,
		V2TypicalWorkService,
		V2TypicalWorkWriteService,
		V2TypicalWorkRuntimeService,
	],
	exports: [
		V2TemplateService,
		V2TemplateVersionService,
		V2DictionaryService,
		V2AuditService,
		V2CalculationService,
		V2QuestionnaireService,
		V2TypicalWorkService,
		V2TypicalWorkRuntimeService,
	],
})
export class AnketaV2Module {}
