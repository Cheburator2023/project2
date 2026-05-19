import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { V2TemplateEntity } from "./entities/v2-template.entity";
import { V2TemplateVersionEntity } from "./entities/v2-template-version.entity";
import { V2TemplateAuditEntity } from "./entities/v2-template-audit.entity";
import { V2DictionaryEntity } from "./entities/v2-dictionary.entity";
import { V2DictionaryItemEntity } from "./entities/v2-dictionary-item.entity";
import { V2TemplateService } from "./services/v2-template.service";
import { V2TemplateVersionService } from "./services/v2-template-version.service";
import { V2DictionaryService } from "./services/v2-dictionary.service";
import { V2DictionarySeedService } from "./services/v2-dictionary-seed.service";
import { V2AuditService } from "./services/v2-audit.service";
import { V2TemplateController } from "./controllers/v2-template.controller";
import { V2TemplateVersionController } from "./controllers/v2-template-version.controller";
import { V2DictionaryController } from "./controllers/v2-dictionary.controller";
import { V2AuditController } from "./controllers/v2-audit.controller";

@Module({
	imports: [
		TypeOrmModule.forFeature([
			V2TemplateEntity,
			V2TemplateVersionEntity,
			V2TemplateAuditEntity,
			V2DictionaryEntity,
			V2DictionaryItemEntity,
		]),
	],
	controllers: [
		V2TemplateController,
		V2TemplateVersionController,
		V2DictionaryController,
		V2AuditController,
	],
	providers: [
		V2TemplateService,
		V2TemplateVersionService,
		V2DictionaryService,
		V2DictionarySeedService,
		V2AuditService,
	],
	exports: [
		V2TemplateService,
		V2TemplateVersionService,
		V2DictionaryService,
		V2AuditService,
	],
})
export class AnketaV2Module {}
