import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { V2TemplateEntity } from "../entities/v2-template.entity";
import { V2TemplateService } from "./v2-template.service";
import { V2TemplateVersionService } from "./v2-template-version.service";

/** Стабильный code первой автосозданной схемы (идемпотентность при гонке инстансов). */
export const V2_FACTORY_BOOTSTRAP_TEMPLATE_CODE = "factory-default";

/**
 * При первом запуске (нет ни одной схемы) создаёт полную заводскую схему
 * из committed snapshot + публикует + черновик для редактора.
 */
@Injectable()
export class V2TemplateSeedService implements OnModuleInit {
	private readonly logger = new Logger(V2TemplateSeedService.name);

	constructor(
		@InjectRepository(V2TemplateEntity)
		private readonly templateRepository: Repository<V2TemplateEntity>,
		private readonly templateService: V2TemplateService,
		private readonly versionService: V2TemplateVersionService,
	) {}

	async onModuleInit(): Promise<void> {
		await this.ensureFactoryTemplateIfEmpty();
	}

	async ensureFactoryTemplateIfEmpty(): Promise<void> {
		const count = await this.templateRepository.count();
		if (count > 0) {
			this.logger.log(`V2 templates: ${count} (bootstrap skipped)`);
			return;
		}

		this.logger.log(
			"No v2 templates — seeding full factory schema from snapshot",
		);

		try {
			const template = await this.templateService.create(
				{
					code: V2_FACTORY_BOOTSTRAP_TEMPLATE_CODE,
					name: "Заводская схема",
					description:
						"Автоинициализация при первом запуске из заводского снимка",
				},
				null,
			);

			const published = await this.versionService.resetToDefault(
				template.id,
				null,
			);

			this.logger.log(
				`Seeded factory template id=${template.id} code=${template.code} publishedVersion=${published.id}`,
			);
		} catch (error) {
			const again = await this.templateRepository.count();
			if (again > 0) {
				this.logger.warn(
					`Factory template bootstrap raced with another instance; templates now=${again}`,
				);
				return;
			}
			this.logger.error(
				"Failed to bootstrap factory template on empty DB",
				error instanceof Error ? error.stack : String(error),
			);
			throw error;
		}
	}
}
