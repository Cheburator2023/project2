import { INestApplication } from "@nestjs/common";
import { V2DictionarySeedService } from "../../modules/anketa-v2/services/v2-dictionary-seed.service";
import { V2StreamCatalogService } from "../../modules/anketa-v2/services/v2-stream-catalog.service";
import { V2TemplateSeedService } from "../../modules/anketa-v2/services/v2-template-seed.service";
import { V2TypicalWorkSeedService } from "../../modules/anketa-v2/services/v2-typical-work.service";
import { startupLog } from "./startup-diagnostics";

/**
 * Factory seed/sync раньше жил в onModuleInit и блокировал listen().
 * После listen TCP :PORT уже открыт (OpenShift readiness), данные догоняем здесь.
 */
export const runPostListenSeed = async (app: INestApplication): Promise<void> => {
	const started = Date.now();
	startupLog("post-listen seed starting");
	await app.get(V2DictionarySeedService).runStartupSeed();
	await app.get(V2StreamCatalogService).runStartupSeed();
	await app.get(V2TypicalWorkSeedService).runStartupSeed();
	await app.get(V2TemplateSeedService).ensureFactoryTemplateIfEmpty();
	startupLog(`post-listen seed done in ${Date.now() - started}ms`);
};
