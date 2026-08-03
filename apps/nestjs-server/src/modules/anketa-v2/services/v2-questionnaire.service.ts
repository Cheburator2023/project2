import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
	patchV2TypicalWorksLogicRules,
	buildV2QuestionnaireRegistryConfig,
	canUserDeleteV2Questionnaire,
	collectForbiddenV2AnketaWorkflowChanges,
	resolveV2QuestionnaireDeleteAction,
	userCanCreateV2Questionnaire,
	type BulkDeleteV2QuestionnairesResultDto,
	type CreateV2QuestionnaireRequestDto,
	type CreateV2QuestionnaireVersionRequestDto,
	type SeedV2TestQuestionnairesResultDto,
	type UpdateV2QuestionnaireRequestDto,
	type V2QuestionnaireFormPackageDto,
	type V2QuestionnaireDto,
	type V2QuestionnaireRegistryConfigDto,
} from "@smart-anketa/api-contract";
import { Repository, In } from "typeorm";
import { V2QuestionnaireEntity } from "../entities/v2-questionnaire.entity";
import { V2TemplateEntity } from "../entities/v2-template.entity";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";
import { V2TemplateService } from "./v2-template.service";
import { V2CalculationService } from "./v2-calculation.service";
import {
	buildTestQuestionnaireFormData,
	V2_TEST_QUESTIONNAIRE_SEED_SPECS,
} from "../utils/v2-test-questionnaire-form-data.builder";
import {
	buildSchemaBinding,
	mapV2QuestionnaireToDto,
} from "../utils/v2-questionnaire-mapper.util";
import { mapV2TemplateVersionToDto } from "../utils/v2-template-mapper.util";
import {
	migrateV2AnketaFormData,
	resetWorkflowForCopy,
} from "../utils/v2-form-data-migration.util";
import {
	holdQuestionnaire,
	isAnketaGloballyLocked,
	normalizeV2AnketaWorkflow,
} from "../utils/v2-anketa-workflow.util";
import { buildV2QuestionnaireRegistryXlsx } from "../utils/v2-questionnaire-registry-export.util";
import { V2_DEFAULT_TEMPLATE_SNAPSHOT } from "../constants/v2-default-template-snapshot";
import { buildV2AnketaViewerAccessFromUser } from "../utils/v2-anketa-viewer-access.util";

type TUserLike = {
	given_name?: string;
	family_name?: string;
	preferred_username?: string;
	email?: string;
	groups?: string[];
};

@Injectable()
export class V2QuestionnaireService {
	private readonly logger = new Logger(V2QuestionnaireService.name);

	constructor(
		@InjectRepository(V2QuestionnaireEntity)
		private readonly questionnaireRepository: Repository<V2QuestionnaireEntity>,
		@InjectRepository(V2TemplateEntity)
		private readonly templateRepository: Repository<V2TemplateEntity>,
		@InjectRepository(V2TemplateVersionEntity)
		private readonly versionRepository: Repository<V2TemplateVersionEntity>,
		private readonly templateService: V2TemplateService,
		private readonly calculationService: V2CalculationService,
	) {}

	async findAll(): Promise<V2QuestionnaireDto[]> {
		const rows = await this.questionnaireRepository.find({
			relations: ["template", "boundTemplateVersion"],
			order: { createdAt: "DESC" },
		});
		return Promise.all(rows.map((row) => this.toDto(row)));
	}

	async getRegistryConfig(): Promise<V2QuestionnaireRegistryConfigDto> {
		const rows = await this.findAll();
		const versionIds = [
			...new Set(
				rows
					.map((row) => row.boundTemplateVersionId)
					.filter((id): id is string => Boolean(id)),
			),
		];
		const versions =
			versionIds.length > 0
				? await this.versionRepository.find({ where: { id: In(versionIds) } })
				: [];
		const schemas =
			versions.length > 0
				? versions.map((version) => ({
						jsonSchema: version.jsonSchema as Record<string, unknown>,
						uiSchema: version.uiSchema as Record<string, unknown>,
					}))
				: [
						{
							jsonSchema: V2_DEFAULT_TEMPLATE_SNAPSHOT.jsonSchema as Record<
								string,
								unknown
							>,
							uiSchema: V2_DEFAULT_TEMPLATE_SNAPSHOT.uiSchema as Record<
								string,
								unknown
							>,
						},
					];
		return buildV2QuestionnaireRegistryConfig(schemas, rows);
	}

	async exportRegistryXlsx(
		ids?: string[],
		user?: Record<string, unknown>,
	): Promise<Buffer> {
		const rows =
			ids && ids.length > 0
				? await this.findAllByIds(ids)
				: await this.findAll();
		const versionIds = [
			...new Set(
				rows
					.map((row) => row.boundTemplateVersionId)
					.filter((id): id is string => Boolean(id)),
			),
		];
		const versions =
			versionIds.length > 0
				? await this.versionRepository.find({ where: { id: In(versionIds) } })
				: [];
		const viewerAccess = buildV2AnketaViewerAccessFromUser(
			user as { groups?: string[] } | undefined,
		);
		return buildV2QuestionnaireRegistryXlsx(
			rows,
			versions.map((version) => ({
				jsonSchema: version.jsonSchema as Record<string, unknown>,
				uiSchema: version.uiSchema as Record<string, unknown>,
			})),
			{
				viewerAccess,
				applyAccessRules: Boolean(viewerAccess),
			},
		);
	}

	async findAllByIds(ids: string[]): Promise<V2QuestionnaireDto[]> {
		const uniqueIds = [...new Set(ids)];
		const rows = await this.questionnaireRepository.find({
			where: { id: In(uniqueIds) },
			relations: ["template", "boundTemplateVersion"],
			order: { createdAt: "DESC" },
		});
		const byId = new Map(
			await Promise.all(
				rows.map(async (row) => [row.id, await this.toDto(row)] as const),
			),
		);
		return uniqueIds
			.map((id) => byId.get(id))
			.filter((dto): dto is V2QuestionnaireDto => dto != null);
	}

	async findOne(id: string): Promise<V2QuestionnaireDto> {
		const row = await this.loadWithRelations(id);
		return this.toDto(row);
	}

	async getFormPackage(id: string): Promise<V2QuestionnaireFormPackageDto> {
		const row = await this.loadWithRelations(id);
		const dto = await this.toDto(row);
		const bound = row.boundTemplateVersion;
		if (!bound) {
			throw new NotFoundException("Привязанная версия схемы не найдена");
		}
		const versionDto = mapV2TemplateVersionToDto(bound);
		const workflow = normalizeV2AnketaWorkflow(dto.formData.workflow);
		const readOnly =
			dto.schemaBinding.status === "unavailable" ||
			isAnketaGloballyLocked(workflow);

		return {
			questionnaire: dto,
			jsonSchema: versionDto.jsonSchema,
			uiSchema: versionDto.uiSchema,
			logic: versionDto.logic,
			readOnly,
		};
	}

	private assertCanCreateQuestionnaire(user?: TUserLike | null): void {
		const groups = Array.isArray(user?.groups) ? user.groups : [];
		if (!userCanCreateV2Questionnaire(groups, true)) {
			throw new ForbiddenException(
				"Создание анкет недоступно для роли представителя стрима (sarep) в первой итерации",
			);
		}
	}

	async create(
		dto: CreateV2QuestionnaireRequestDto,
		user?: TUserLike | null,
	): Promise<V2QuestionnaireDto> {
		this.assertCanCreateQuestionnaire(user);
		const { template, version } = await this.resolveTemplateForCreate(
			dto.templateId,
		);
		const seriesId = this.generateSeriesId();
		const versionLabel = "1";
		const readableId = `V2-${seriesId}-v${versionLabel}`;

		const calcName = dto.calcName?.trim();
		if (!calcName) {
			throw new ConflictException({
				errors: [
					{
						path: "calcName",
						message: "Название анкеты обязательно",
					},
				],
			});
		}

		const entity = this.questionnaireRepository.create({
			calcName,
			status: "active",
			version: versionLabel,
			seriesId,
			parentQuestionnaireId: null,
			readableId,
			templateId: template.id,
			boundTemplateVersionId: version.id,
			formData: migrateV2AnketaFormData(dto.formData ?? {}),
			finalCoefficient: dto.finalCoefficient ?? null,
			author: this.authorName(user),
		});

		const saved = await this.questionnaireRepository.save(entity);
		return this.findOne(saved.id);
	}

	async update(
		id: string,
		dto: UpdateV2QuestionnaireRequestDto,
		user?: TUserLike | null,
	): Promise<V2QuestionnaireDto> {
		const row = await this.loadWithRelations(id);
		const currentFormData = migrateV2AnketaFormData(row.formData ?? {});
		const currentWorkflow = normalizeV2AnketaWorkflow(currentFormData.workflow);
		if (
			currentWorkflow.globalStatus === "Утверждена" &&
			(dto.formData !== undefined || dto.finalCoefficient !== undefined)
		) {
			throw new ConflictException(
				"Утверждённая анкета неизменяема. Создайте новую версию копированием.",
			);
		}
		if (dto.calcName !== undefined) {
			row.calcName = dto.calcName.trim() || row.calcName;
		}
		if (dto.formData !== undefined) {
			const nextFormData = migrateV2AnketaFormData(dto.formData);
			this.logForbiddenWorkflowChanges(
				id,
				row,
				currentFormData.workflow,
				nextFormData.workflow,
				user,
			);
			row.formData = nextFormData;
		}
		if (dto.finalCoefficient !== undefined) {
			row.finalCoefficient = dto.finalCoefficient;
		}
		if (dto.status !== undefined) {
			row.status = dto.status;
		}
		await this.questionnaireRepository.save(row);
		return this.findOne(id);
	}

	/**
	 * §1–§4: представитель стрима закрывает только раздел своего стрима.
	 * Первая итерация — наблюдение: нарушение пишем в лог, сохранение не блокируем.
	 */
	private logForbiddenWorkflowChanges(
		id: string,
		row: V2QuestionnaireEntity,
		previousWorkflow: unknown,
		nextWorkflow: unknown,
		user?: TUserLike | null,
	): void {
		const viewer = buildV2AnketaViewerAccessFromUser(user ?? undefined);
		const bound = row.boundTemplateVersion;
		if (!viewer || !bound) return;

		const forbidden = collectForbiddenV2AnketaWorkflowChanges(
			viewer,
			mapV2TemplateVersionToDto(bound).uiSchema,
			previousWorkflow,
			nextWorkflow,
		);
		if (forbidden.length === 0) return;

		this.logger.warn(
			`Анкета ${id}: пользователь (роли ${viewer.roles.join(", ") || "—"}, ` +
				`стримы ${viewer.streams.join(", ") || "—"}) изменил статусы вне своего стрима: ` +
				forbidden.map((change) => `${change.path} (${change.reason})`).join(", "),
		);
	}

	/** Фиксация среза (§3.13): Заполнено → Утверждена. */
	async hold(id: string): Promise<V2QuestionnaireDto> {
		const row = await this.loadWithRelations(id);
		const formData = migrateV2AnketaFormData(row.formData ?? {});
		const workflow = normalizeV2AnketaWorkflow(formData.workflow);
		if (workflow.globalStatus !== "Заполнено") {
			throw new ConflictException(
				"Фиксация среза доступна только для анкеты в статусе «Заполнено»",
			);
		}
		const next = holdQuestionnaire(workflow);
		if (next === workflow) {
			throw new ConflictException("Не удалось зафиксировать срез анкеты");
		}
		row.formData = { ...formData, workflow: next };
		await this.questionnaireRepository.save(row);
		return this.findOne(id);
	}

	async createNewVersion(
		parentId: string,
		dto: CreateV2QuestionnaireVersionRequestDto,
		user?: TUserLike | null,
	): Promise<V2QuestionnaireDto> {
		this.assertCanCreateQuestionnaire(user);
		const parent = await this.loadWithRelations(parentId);
		const siblings = await this.questionnaireRepository.find({
			where: { seriesId: parent.seriesId },
			select: ["version"],
		});
		const maxVersion = siblings.reduce((max, s) => {
			const n = Number.parseInt(s.version, 10);
			return Number.isFinite(n) && n > max ? n : max;
		}, 0);
		const nextVersion = String(maxVersion + 1);
		const readableId = `V2-${parent.seriesId}-v${nextVersion}`;

		const entity = this.questionnaireRepository.create({
			calcName: dto.calcName?.trim() || parent.calcName,
			status: "active",
			version: nextVersion,
			seriesId: parent.seriesId,
			parentQuestionnaireId: parent.id,
			readableId,
			templateId: parent.templateId,
			boundTemplateVersionId: parent.boundTemplateVersionId,
			formData: migrateV2AnketaFormData(
				resetWorkflowForCopy(dto.formData ?? { ...parent.formData }),
			),
			finalCoefficient:
				dto.finalCoefficient !== undefined
					? dto.finalCoefficient
					: parent.finalCoefficient,
			author: this.authorName(user),
		});

		const saved = await this.questionnaireRepository.save(entity);
		return this.findOne(saved.id);
	}

	async bulkDelete(
		ids: string[],
		user?: TUserLike | null,
	): Promise<BulkDeleteV2QuestionnairesResultDto> {
		const uniqueIds = [...new Set(ids)];
		const deletedIds: string[] = [];
		const deactivatedIds: string[] = [];
		const failed: BulkDeleteV2QuestionnairesResultDto["failed"] = [];
		const groups = Array.isArray(user?.groups) ? user.groups : [];

		for (const id of uniqueIds) {
			try {
				const row = await this.questionnaireRepository.findOne({
					where: { id },
				});
				if (!row) {
					failed.push({
						id,
						reason: "not_found",
						message: "Анкета не найдена",
					});
					continue;
				}

				const access = canUserDeleteV2Questionnaire(groups, row.formData);
				if (!access.ok) {
					failed.push({
						id,
						reason: access.reason,
						message:
							access.reason === "wrong_stream"
								? "Удаление доступно только для анкет своего стрима"
								: "Недостаточно прав для удаления анкеты",
					});
					continue;
				}

				const workflow = normalizeV2AnketaWorkflow(
					migrateV2AnketaFormData(row.formData ?? {}).workflow,
				);
				const resolved = resolveV2QuestionnaireDeleteAction(
					workflow.globalStatus,
					row.status,
				);
				if (resolved.action === "deny") {
					failed.push({
						id,
						reason: resolved.reason,
						message:
							resolved.reason === "already_inactive"
								? "Анкета уже неактивна"
								: "Удаление недоступно",
					});
					continue;
				}

				if (resolved.action === "hard_delete") {
					await this.questionnaireRepository.remove(row);
					deletedIds.push(id);
					continue;
				}

				row.status = "inactive";
				await this.questionnaireRepository.save(row);
				deactivatedIds.push(id);
			} catch {
				failed.push({
					id,
					reason: "delete_failed",
					message: "Не удалось удалить анкету",
				});
			}
		}

		return { deletedIds, deactivatedIds, failed };
	}

	async seedTestQuestionnaires(
		templateId: string | undefined,
		user?: TUserLike | null,
	): Promise<SeedV2TestQuestionnairesResultDto> {
		const { template, version } = await this.resolveTemplateForCreate(templateId);
		const logic = version.logic as { rules?: unknown[] };
		const jsonSchema = version.jsonSchema;
		const created: V2QuestionnaireDto[] = [];
		const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");

		for (const spec of V2_TEST_QUESTIONNAIRE_SEED_SPECS) {
			const raw = buildTestQuestionnaireFormData(jsonSchema, spec.variant);
			const evaluated = await this.calculationService.evaluate(
				patchV2TypicalWorksLogicRules(
					{ rules: logic?.rules ?? [] } as never,
					{ jsonSchema: version.jsonSchema, uiSchema: version.uiSchema },
				),
				raw,
				{
					templateVersionId: version.id,
					templateId: version.templateId,
					jsonSchema: version.jsonSchema,
					uiSchema: version.uiSchema,
				},
			);
			const formData = migrateV2AnketaFormData(evaluated.formData);
			const dto = await this.create(
				{
					templateId: template.id,
					calcName: `[seed ${stamp}] ${spec.calcNameSuffix}`,
					formData,
				},
				user,
			);
			created.push(dto);
		}

		return { created };
	}

	private async loadWithRelations(id: string): Promise<V2QuestionnaireEntity> {
		const row = await this.questionnaireRepository.findOne({
			where: { id },
			relations: ["template", "boundTemplateVersion"],
		});
		if (!row) {
			throw new NotFoundException(`Анкета ${id} не найдена`);
		}
		return row;
	}

	private async toDto(row: V2QuestionnaireEntity): Promise<V2QuestionnaireDto> {
		const template =
			row.template ??
			(await this.templateRepository.findOne({
				where: { id: row.templateId },
			}));
		const boundVersion =
			row.boundTemplateVersion ??
			(await this.versionRepository.findOne({
				where: { id: row.boundTemplateVersionId },
			}));
		let currentVersion: V2TemplateVersionEntity | null = null;
		if (template?.currentVersionId) {
			currentVersion = await this.versionRepository.findOne({
				where: { id: template.currentVersionId },
			});
		}
		const binding = buildSchemaBinding(template, boundVersion, currentVersion);
		return mapV2QuestionnaireToDto(
			{ ...row, template: template ?? undefined },
			binding,
		);
	}

	private async resolveTemplateForCreate(templateId?: string): Promise<{
		template: V2TemplateEntity;
		version: V2TemplateVersionEntity;
	}> {
		let template: V2TemplateEntity | null = null;

		if (templateId) {
			template = await this.templateRepository.findOne({
				where: { id: templateId },
			});
			if (!template) {
				throw new NotFoundException(`Шаблон ${templateId} не найден`);
			}
		} else {
			const templates = await this.templateService.findAll();
			const withCurrent = templates.filter((t) => t.currentVersionId);
			if (withCurrent.length === 0) {
				throw new BadRequestException(
					"Нет шаблона с актуальной схемой. Укажите templateId или назначьте currentVersion в админке.",
				);
			}
			if (withCurrent.length > 1) {
				throw new BadRequestException(
					"Несколько шаблонов с актуальной схемой. Укажите templateId явно.",
				);
			}
			template = withCurrent[0];
		}

		const version = await this.resolvePublishedVersionForTemplate(template);

		return { template, version };
	}

	/** Опубликованная версия шаблона: актуальная системная или последняя published. */
	private async resolvePublishedVersionForTemplate(
		template: V2TemplateEntity,
	): Promise<V2TemplateVersionEntity> {
		if (template.currentVersionId) {
			const current = await this.versionRepository.findOne({
				where: { id: template.currentVersionId, templateId: template.id },
			});
			if (current?.status === "published") {
				return current;
			}
		}

		const latestPublished = await this.versionRepository.findOne({
			where: { templateId: template.id, status: "published" },
			order: { versionNumber: "DESC" },
		});
		if (!latestPublished) {
			throw new BadRequestException(
				"У выбранного шаблона нет опубликованной версии. Опубликуйте черновик или назначьте версию актуальной.",
			);
		}

		return latestPublished;
	}

	private generateSeriesId(): string {
		const ts = Date.now().toString(36).toUpperCase();
		const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
		return `${ts}${rnd}`;
	}

	private authorName(user?: TUserLike | null): string {
		if (!user) return "Система";
		const name =
			`${user.given_name ?? ""} ${user.family_name ?? ""}`.trim() ||
			user.preferred_username ||
			user.email;
		return name || "Система";
	}
}
