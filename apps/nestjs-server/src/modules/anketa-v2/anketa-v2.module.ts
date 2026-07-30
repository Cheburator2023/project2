import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StreamMappingService } from "../../shared/services/stream-mapping.service";
import { StreamFilterInterceptor } from "../../shared/interceptors/stream-filter.interceptor";
import { V2FactorySnapshotSettingEntity } from "./entities/v2-factory-snapshot-setting.entity";
import { V2TemplateEntity } from "./entities/v2-template.entity";
import { V2TemplateVersionEntity } from "./entities/v2-template-version.entity";
import { V2TemplateAuditEntity } from "./entities/v2-template-audit.entity";
import { V2DictionaryEntity } from "./entities/v2-dictionary.entity";
import { V2DictionaryItemEntity } from "./entities/v2-dictionary-item.entity";
import { V2QuestionnaireEntity } from "./entities/v2-questionnaire.entity";
import { V2QuestionnaireCommentEntity } from "./entities/v2-questionnaire-comment.entity";
import { V2QuestionnaireEditLockEntity } from "./entities/v2-questionnaire-edit-lock.entity";
import { V2FactorySnapshotService } from "./services/v2-factory-snapshot.service";
import { V2FactoryTypicalWorksPublishService } from "./services/v2-factory-typical-works-publish.service";
import { V2TemplateService } from "./services/v2-template.service";
import { V2TemplateVersionService } from "./services/v2-template-version.service";
import { V2DictionaryService } from "./services/v2-dictionary.service";
import { V2DictionarySeedService } from "./services/v2-dictionary-seed.service";
import { V2TemplateSeedService } from "./services/v2-template-seed.service";
import { V2AuditService } from "./services/v2-audit.service";
import { V2FactorySnapshotController } from "./controllers/v2-factory-snapshot.controller";
import { V2TemplateController } from "./controllers/v2-template.controller";
import { V2TemplateVersionController } from "./controllers/v2-template-version.controller";
import { V2DictionaryController } from "./controllers/v2-dictionary.controller";
import { V2AuditController } from "./controllers/v2-audit.controller";
import { V2CalculationController } from "./controllers/v2-calculation.controller";
import { V2CalculationService } from "./services/v2-calculation.service";
import { V2QuestionnaireService } from "./services/v2-questionnaire.service";
import { V2QuestionnaireCommentService } from "./services/v2-questionnaire-comment.service";
import { V2QuestionnaireEditLockService } from "./services/v2-questionnaire-edit-lock.service";
import { V2QuestionnaireController } from "./controllers/v2-questionnaire.controller";
import { V2TypicalWorkEntity } from "./entities/v2-typical-work.entity";
import { V2TypicalWorkNormEntity } from "./entities/v2-typical-work-norm.entity";
import { V2TypicalWorkRuleEntity } from "./entities/v2-typical-work-rule.entity";
import { V2TypicalWorkLaborCoefficientEntity } from "./entities/v2-typical-work-labor-coefficient.entity";
import { V2TypicalWorkLaborParamEntity } from "./entities/v2-typical-work-labor-param.entity";
import { V2TypicalWorkAssignmentEntity } from "./entities/v2-typical-work-assignment.entity";
import { V2TypicalWorkVersionConfigEntity } from "./entities/v2-typical-work-version-config.entity";
import { V2TypicalWorkParamEntity } from "./entities/v2-typical-work-param.entity";
import { V2TypicalWorkParamValueEntity } from "./entities/v2-typical-work-param-value.entity";
import {
	V2TypicalWorkSeedService,
	V2TypicalWorkService,
} from "./services/v2-typical-work.service";
import { V2TypicalWorkWriteService } from "./services/v2-typical-work-write.service";
import { V2TypicalWorkRuntimeService } from "./services/v2-typical-work-runtime.service";
import { V2TypicalWorkParamCatalogService } from "./services/v2-typical-work-param-catalog.service";
import { V2TypicalWorkController } from "./controllers/v2-typical-work.controller";
import { V2DataTransferController } from "./controllers/v2-data-transfer.controller";
import { V2DataTransferService } from "./services/v2-data-transfer.service";
import { V2KeycloakRoleSyncController } from "./controllers/v2-keycloak-role-sync.controller";
import { V2KeycloakRoleSyncService } from "./services/v2-keycloak-role-sync.service";
import { V2RuntimeSettingsEntity } from "./entities/v2-runtime-settings.entity";
import { V2RuntimeSettingsService } from "./services/v2-runtime-settings.service";
import { V2RuntimeSettingsController } from "./controllers/v2-runtime-settings.controller";
import { V2StreamCatalogController } from "./controllers/v2-stream-catalog.controller";
import { V2StreamCatalogService } from "./services/v2-stream-catalog.service";

@Module({
	imports: [
		TypeOrmModule.forFeature([
			V2TemplateEntity,
			V2TemplateVersionEntity,
			V2TemplateAuditEntity,
			V2DictionaryEntity,
			V2DictionaryItemEntity,
			V2QuestionnaireEntity,
			V2QuestionnaireCommentEntity,
			V2QuestionnaireEditLockEntity,
			V2TypicalWorkEntity,
			V2TypicalWorkNormEntity,
			V2TypicalWorkRuleEntity,
			V2TypicalWorkLaborCoefficientEntity,
			V2TypicalWorkLaborParamEntity,
			V2TypicalWorkAssignmentEntity,
			V2TypicalWorkVersionConfigEntity,
			V2TypicalWorkParamEntity,
			V2TypicalWorkParamValueEntity,
			V2FactorySnapshotSettingEntity,
			V2RuntimeSettingsEntity,
		]),
	],
	controllers: [
		V2TemplateController,
		V2FactorySnapshotController,
		V2TemplateVersionController,
		V2DictionaryController,
		V2StreamCatalogController,
		V2AuditController,
		V2CalculationController,
		V2QuestionnaireController,
		V2TypicalWorkController,
		V2DataTransferController,
		V2KeycloakRoleSyncController,
		V2RuntimeSettingsController,
	],
	providers: [
		StreamMappingService,
		StreamFilterInterceptor,
		V2TemplateService,
		V2FactorySnapshotService,
		V2FactoryTypicalWorksPublishService,
		V2TemplateVersionService,
		V2DictionaryService,
		V2DictionarySeedService,
		V2StreamCatalogService,
		V2TemplateSeedService,
		V2AuditService,
		V2CalculationService,
		V2QuestionnaireService,
		V2QuestionnaireCommentService,
		V2QuestionnaireEditLockService,
		V2TypicalWorkSeedService,
		V2TypicalWorkService,
		V2TypicalWorkWriteService,
		V2TypicalWorkRuntimeService,
		V2TypicalWorkParamCatalogService,
		V2DataTransferService,
		V2KeycloakRoleSyncService,
		V2RuntimeSettingsService,
	],
	exports: [
		V2TemplateService,
		V2FactorySnapshotService,
		V2TemplateVersionService,
		V2DictionaryService,
		V2StreamCatalogService,
		V2AuditService,
		V2CalculationService,
		V2QuestionnaireService,
		V2TypicalWorkService,
		V2TypicalWorkRuntimeService,
		V2TypicalWorkParamCatalogService,
		V2RuntimeSettingsService,
	],
})
export class AnketaV2Module {}
