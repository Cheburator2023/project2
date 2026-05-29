import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { V2_QUESTIONNAIRE_DEMO_SEEDS } from "../constants/v2-questionnaire-demo-seeds";
import { V2QuestionnaireEntity } from "../entities/v2-questionnaire.entity";
import { V2TemplateEntity } from "../entities/v2-template.entity";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";

@Injectable()
export class V2QuestionnaireSeedService implements OnModuleInit {
	private readonly logger = new Logger(V2QuestionnaireSeedService.name);

	constructor(
		@InjectRepository(V2QuestionnaireEntity)
		private readonly questionnaireRepository: Repository<V2QuestionnaireEntity>,
		@InjectRepository(V2TemplateEntity)
		private readonly templateRepository: Repository<V2TemplateEntity>,
		@InjectRepository(V2TemplateVersionEntity)
		private readonly versionRepository: Repository<V2TemplateVersionEntity>,
	) {}

	async onModuleInit(): Promise<void> {
		await this.ensureDemoQuestionnaires();
	}

	async ensureDemoQuestionnaires(): Promise<void> {
		const existingDemo = await this.questionnaireRepository.count({
			where: { seriesId: "DEMO-KMZ01" },
		});
		if (existingDemo > 0) {
			return;
		}

		const templates = await this.templateRepository.find({
			order: { createdAt: "ASC" },
		});
		const template =
			templates.find((item) => item.currentVersionId) ?? templates[0];
		if (!template?.currentVersionId) {
			this.logger.warn(
				"Демо-анкеты V2 не созданы: нет шаблона с актуальной версией схемы",
			);
			return;
		}

		const version = await this.versionRepository.findOne({
			where: { id: template.currentVersionId },
		});
		if (!version) {
			this.logger.warn(
				"Демо-анкеты V2 не созданы: актуальная версия схемы не найдена",
			);
			return;
		}

		let created = 0;
		for (const seed of V2_QUESTIONNAIRE_DEMO_SEEDS) {
			const parent = await this.questionnaireRepository.save(
				this.questionnaireRepository.create({
					calcName: seed.calcName,
					status: "active",
					version: "1",
					seriesId: seed.seriesId,
					parentQuestionnaireId: null,
					readableId: seed.readableId,
					templateId: template.id,
					boundTemplateVersionId: version.id,
					formData: seed.formData,
					finalCoefficient: seed.finalCoefficient,
					author: seed.author,
				}),
			);
			created++;

			for (const extra of seed.extraVersions ?? []) {
				await this.questionnaireRepository.save(
					this.questionnaireRepository.create({
						calcName: seed.calcName,
						status: "active",
						version: extra.version,
						seriesId: seed.seriesId,
						parentQuestionnaireId: parent.id,
						readableId: extra.readableId,
						templateId: template.id,
						boundTemplateVersionId: version.id,
						formData: extra.formData,
						finalCoefficient: extra.finalCoefficient,
						author: extra.author,
					}),
				);
				created++;
			}
		}

		this.logger.log(`Демо-анкеты V2 для реестра: создано ${created} записей`);
	}
}
