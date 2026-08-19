import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
	ServiceUnavailableException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
	patchV2TypicalWorksLogicRules,
	buildV2QuestionnaireRegistryConfig,
	collectV2RegistryFormPaths,
	canUserCopyV2Questionnaire,
	canUserDeleteV2Questionnaire,
	collectForbiddenV2AnketaWorkflowChanges,
	expandV2QuestionnaireRegistrySeriesMembers,
	filterV2QuestionnairesByRegistryVersionMode,
	isV2UserStreamFilteredByGroups,
	projectAndDefaultFormDataOntoJsonSchema,
	resolveV2QuestionnaireDeleteAction,
	resolveV2UserAllowedStreamFilterValues,
	userCanCreateV2Questionnaire,
	V2_QUESTIONNAIRE_REGISTRY_PAGE_SIZE,
	type BulkDeleteV2QuestionnairesResultDto,
	type CreateV2QuestionnaireRequestDto,
	type CreateV2QuestionnaireVersionRequestDto,
	type PaginatedV2QuestionnaireResponseDto,
	type SeedV2TestQuestionnairesResultDto,
	type UpdateV2QuestionnaireRequestDto,
	type V2FormDataProjectionReportDto,
	type V2QuestionnaireFormPackageDto,
	type V2QuestionnaireDto,
	type V2QuestionnaireListQuery,
	type V2QuestionnaireRegistryConfigDto,
	type V2QuestionnaireStatus,
	pickV2QuestionnaireRegistryFormData,
} from "@smart-anketa/api-contract";
import { Writable } from "node:stream";
import { finished } from "node:stream/promises";
import { Repository, In, type SelectQueryBuilder } from "typeorm";
import { V2QuestionnaireEntity } from "../entities/v2-questionnaire.entity";
import { V2TemplateEntity } from "../entities/v2-template.entity";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";
import { V2TemplateService } from "./v2-template.service";
import { V2CalculationService } from "./v2-calculation.service";
import { V2RuntimeSettingsService } from "./v2-runtime-settings.service";
import { V2QuestionnaireRegistryReadCache } from "./v2-questionnaire-registry-read-cache.service";
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
import {
	buildRegistryExportColumnsFromSchemas,
	deriveRegistryColumnOptionsFromFormDataBatch,
	mergeDerivedRegistryColumnOptions,
	writeV2QuestionnaireRegistryXlsxToStream,
} from "../utils/v2-questionnaire-registry-export.util";
import { V2_DEFAULT_TEMPLATE_SNAPSHOT } from "../constants/v2-default-template-snapshot";
import { buildV2AnketaViewerAccessFromUser } from "../utils/v2-anketa-viewer-access.util";

type TUserLike = {
	given_name?: string;
	family_name?: string;
	preferred_username?: string;
	email?: string;
	groups?: string[];
};

export type V2QuestionnaireRegistryExportResult = {
	rowCount: number;
};

const DEFAULT_EXPORT_BATCH_SIZE = 40;
const DEFAULT_EXPORT_CONCURRENCY = 1;
const DEFAULT_EXPORT_HEAP_MB_MAX = 1200;

function resolvePositiveInt(envName: string, fallback: number, max: number): number {
	const raw = Number(process.env[envName]);
	if (Number.isInteger(raw) && raw > 0) return Math.min(raw, max);
	return fallback;
}

function chunkIds(ids: string[], size: number): string[][] {
	const chunks: string[][] = [];
	for (let index = 0; index < ids.length; index += size) {
		chunks.push(ids.slice(index, index + size));
	}
	return chunks;
}

@Injectable()
export class V2QuestionnaireService {
	private readonly logger = new Logger(V2QuestionnaireService.name);
	private exportInFlight = 0;
	private readonly exportWaiters: Array<() => void> = [];
	private readonly exportConcurrency = resolvePositiveInt(
		"V2_EXPORT_CONCURRENCY",
		DEFAULT_EXPORT_CONCURRENCY,
		4,
	);
	private readonly exportBatchSize = resolvePositiveInt(
		"V2_EXPORT_BATCH_SIZE",
		DEFAULT_EXPORT_BATCH_SIZE,
		200,
	);
	private readonly exportHeapMbMax = resolvePositiveInt(
		"V2_EXPORT_HEAP_MB_MAX",
		DEFAULT_EXPORT_HEAP_MB_MAX,
		4000,
	);
	private registryConfigLoad: Promise<{
		config: V2QuestionnaireRegistryConfigDto;
		formPaths: string[];
	}> | null = null;

	constructor(
		@InjectRepository(V2QuestionnaireEntity)
		private readonly questionnaireRepository: Repository<V2QuestionnaireEntity>,
		@InjectRepository(V2TemplateEntity)
		private readonly templateRepository: Repository<V2TemplateEntity>,
		@InjectRepository(V2TemplateVersionEntity)
		private readonly versionRepository: Repository<V2TemplateVersionEntity>,
		private readonly templateService: V2TemplateService,
		private readonly calculationService: V2CalculationService,
		private readonly runtimeSettingsService: V2RuntimeSettingsService,
		private readonly registryReadCache: V2QuestionnaireRegistryReadCache,
	) {}

	async findAll(): Promise<V2QuestionnaireDto[]> {
		const rows = await this.questionnaireRepository.find({
			relations: ["template", "boundTemplateVersion"],
			order: { createdAt: "DESC" },
		});
		return Promise.all(rows.map((row) => this.toDto(row)));
	}

	/**
	 * Реестр: серверная пагинация + поиск (+ стрим / versionMode).
	 * versionMode: пагинация по сериям, в data — все версии серий страницы.
	 * Строки — slim formData под колонки; export идёт пачками в файл.
	 */
	async findAllPaginated(
		query: V2QuestionnaireListQuery,
		user?: TUserLike | null,
	): Promise<PaginatedV2QuestionnaireResponseDto> {
		const page = Math.max(1, Number(query.page) || 1);
		const limit = Math.min(
			100,
			Math.max(
				1,
				Number(query.limit) || V2_QUESTIONNAIRE_REGISTRY_PAGE_SIZE,
			),
		);
		const search = query.search?.trim() ?? "";
		const versionMode = query.versionMode;

		const empty = (): PaginatedV2QuestionnaireResponseDto => ({
			data: [],
			meta: { total: 0, page, limit, lastPage: 0 },
		});

		const allowedStreams = await this.resolveAllowedStreamsForList(user);
		if (allowedStreams && allowedStreams.length === 0) return empty();

		const cacheGeneration = this.registryReadCache.getGeneration();
		const cacheKey = this.registryReadCache.listKey({
			streams: allowedStreams,
			page,
			limit,
			search,
			versionMode,
		});
		const cached = this.registryReadCache.getList(cacheKey);
		if (cached) return cached;

		if (versionMode) {
			const leanQb = this.questionnaireRepository
				.createQueryBuilder("q")
				.select("q.id", "id")
				.addSelect("q.series_id", "seriesId")
				.addSelect("q.version", "version")
				.addSelect("q.status", "status")
				.addSelect("q.created_at", "createdAt")
				.addSelect(
					"q.form_data->'workflow'->>'globalStatus'",
					"workflowGlobalStatus",
				);
			this.applyRegistryListFilters(leanQb, search, allowedStreams);
			const leanRows = await leanQb.getRawMany<{
				id: string;
				seriesId: string;
				version: string;
				status: string | null;
				createdAt: Date | string;
				workflowGlobalStatus: string | null;
			}>();
			const picked = filterV2QuestionnairesByRegistryVersionMode(
				leanRows,
				versionMode,
			);
			picked.sort((a, b) => {
				const ta = new Date(a.createdAt).getTime();
				const tb = new Date(b.createdAt).getTime();
				return tb - ta;
			});
			const total = picked.length;
			const lastPage = total === 0 ? 0 : Math.ceil(total / limit);
			const slice = picked.slice((page - 1) * limit, page * limit);
			const pageRows = expandV2QuestionnaireRegistrySeriesMembers(
				leanRows,
				slice,
			);
			const data = await this.findAllByIds(pageRows.map((row) => row.id));
			const result = {
				data,
				meta: { total, page, limit, lastPage },
			};
			this.registryReadCache.setList(cacheKey, result, cacheGeneration);
			return result;
		}

		const qb = this.questionnaireRepository
			.createQueryBuilder("q")
			.leftJoinAndSelect("q.template", "template")
			.leftJoinAndSelect("q.boundTemplateVersion", "boundTemplateVersion");
		this.applyRegistryListFilters(qb, search, allowedStreams);
		qb.orderBy("q.createdAt", "DESC");

		const [rows, total] = await qb
			.skip((page - 1) * limit)
			.take(limit)
			.getManyAndCount();
		const lastPage = total === 0 ? 0 : Math.ceil(total / limit);
		const data = await this.toRegistryListDtos(rows);
		const result = {
			data,
			meta: { total, page, limit, lastPage },
		};
		this.registryReadCache.setList(cacheKey, result, cacheGeneration);
		return result;
	}

	invalidateRegistryReadCache(): void {
		this.registryReadCache.invalidateAll();
	}

	private applyRegistryListFilters(
		qb: SelectQueryBuilder<V2QuestionnaireEntity>,
		search: string,
		allowedStreams: string[] | null,
	): void {
		if (search) {
			const pattern = `%${escapeIlikePattern(search)}%`;
			qb.andWhere(
				`(q.calc_name ILIKE :search ESCAPE '\\'
					OR COALESCE(q.readable_id, '') ILIKE :search ESCAPE '\\'
					OR COALESCE(q.author, '') ILIKE :search ESCAPE '\\'
					OR CAST(q.id AS text) ILIKE :search ESCAPE '\\')`,
				{ search: pattern },
			);
		}
		if (allowedStreams) {
			qb.andWhere(
				`(q.form_data->'generalInfo'->>'implementationStream' IS NULL
					OR TRIM(q.form_data->'generalInfo'->>'implementationStream') = ''
					OR q.form_data->'generalInfo'->>'implementationStream' IN (:...allowedStreams))`,
				{ allowedStreams },
			);
		}
	}

	private async resolveAllowedStreamsForList(
		user?: TUserLike | null,
	): Promise<string[] | null> {
		const groups = Array.isArray(user?.groups) ? user.groups : [];
		const streamSetting =
			await this.runtimeSettingsService.getStreamFilterSetting();
		const streamFilterEnabled = streamSetting.enabled ?? true;
		const deModelopsViewAllStreams =
			streamSetting.deModelopsViewAllStreams ?? true;
		const streamOpts = { deModelopsViewAllStreams };
		if (
			streamFilterEnabled &&
			isV2UserStreamFilteredByGroups(groups, streamOpts)
		) {
			return resolveV2UserAllowedStreamFilterValues(groups, streamOpts);
		}
		return null;
	}

	private async withExportSlot<T>(fn: () => Promise<T>): Promise<T> {
		while (this.exportInFlight >= this.exportConcurrency) {
			await new Promise<void>((resolve) => this.exportWaiters.push(resolve));
		}
		this.exportInFlight += 1;
		try {
			return await fn();
		} finally {
			this.exportInFlight -= 1;
			this.exportWaiters.shift()?.();
		}
	}

	private assertExportHeapHeadroom(): void {
		const usedMb = process.memoryUsage().heapUsed / (1024 * 1024);
		if (usedMb > this.exportHeapMbMax) {
			throw new ServiceUnavailableException(
				`Экспорт прерван: heap ${Math.round(usedMb)}MB выше лимита ${this.exportHeapMbMax}MB. Выгрузите анкеты частями.`,
			);
		}
	}

	private async resolveExportQuestionnaireIds(
		ids: string[] | undefined,
		user?: TUserLike | null,
	): Promise<string[]> {
		if (ids && ids.length > 0) {
			return [...new Set(ids)];
		}
		const allowedStreams = await this.resolveAllowedStreamsForList(user);
		if (allowedStreams && allowedStreams.length === 0) return [];
		const qb = this.questionnaireRepository
			.createQueryBuilder("q")
			.select("q.id", "id")
			.orderBy("q.createdAt", "DESC");
		this.applyRegistryListFilters(qb, "", allowedStreams);
		const rows = await qb.getRawMany<{ id: string }>();
		return rows.map((row) => row.id);
	}

	private async exportRegistryXlsxUncapped(
		ids?: string[],
		user?: Record<string, unknown>,
		onProgress?: (done: number, total: number) => void | Promise<void>,
		dest?: Writable,
	): Promise<V2QuestionnaireRegistryExportResult> {
		this.logger.log(
			`Registry export: resolving questionnaire ids (${ids?.length ?? "all"})`,
		);
		const exportIds = await this.resolveExportQuestionnaireIds(
			ids,
			user as TUserLike | undefined,
		);
		this.logger.log(`Registry export: ${exportIds.length} questionnaires`);
		if (onProgress) await onProgress(0, exportIds.length);
		const viewerAccess = buildV2AnketaViewerAccessFromUser(
			user as { groups?: string[] } | undefined,
		);
		const columnOptionsAcc = {
			arrayIndicesByPath: {} as Record<string, number[]>,
			arrayGroupLabelsByPath: {} as Record<string, Record<number, string>>,
		};
		const versionIds = new Set<string>();
		const templateIds = new Set<string>();

		for (const batchIds of chunkIds(exportIds, this.exportBatchSize)) {
			this.assertExportHeapHeadroom();
			const lean = await this.questionnaireRepository.find({
				where: { id: In(batchIds) },
				select: ["id", "formData", "boundTemplateVersionId", "templateId"],
			});
			for (const row of lean) {
				if (row.boundTemplateVersionId) {
					versionIds.add(row.boundTemplateVersionId);
				}
				if (row.templateId) templateIds.add(row.templateId);
			}
			Object.assign(
				columnOptionsAcc,
				mergeDerivedRegistryColumnOptions(
					columnOptionsAcc,
					deriveRegistryColumnOptionsFromFormDataBatch(
						lean.map((row) => row.formData ?? {}),
					),
				),
			);
			await new Promise<void>((resolve) => setImmediate(resolve));
		}

		const templates =
			templateIds.size > 0
				? await this.templateRepository.find({
						where: { id: In([...templateIds]) },
						select: ["id", "code", "name", "currentVersionId"],
					})
				: [];
		for (const template of templates) {
			if (template.currentVersionId) {
				versionIds.add(template.currentVersionId);
			}
		}

		const versions =
			versionIds.size > 0
				? await this.versionRepository.find({
						where: { id: In([...versionIds]) },
						select: [
							"id",
							"versionNumber",
							"status",
							"createdAt",
							"updatedAt",
							"jsonSchema",
							"uiSchema",
						],
					})
				: [];
		const templateById = new Map(templates.map((row) => [row.id, row]));
		const versionById = new Map(versions.map((row) => [row.id, row]));

		const columns = buildRegistryExportColumnsFromSchemas(
			versions.map((version) => ({
				jsonSchema: version.jsonSchema as Record<string, unknown>,
				uiSchema: version.uiSchema as Record<string, unknown>,
			})),
			{
				...columnOptionsAcc,
				viewerAccess,
				applyAccessRules: Boolean(viewerAccess),
			},
		);

		const self = this;
		async function* dtoRows(): AsyncGenerator<V2QuestionnaireDto> {
			for (const batchIds of chunkIds(exportIds, self.exportBatchSize)) {
				self.assertExportHeapHeadroom();
				const entities = await self.questionnaireRepository.find({
					where: { id: In(batchIds) },
				});
				const byId = new Map(entities.map((row) => [row.id, row]));
				for (const id of batchIds) {
					const entity = byId.get(id);
					if (!entity) continue;
					const template = templateById.get(entity.templateId);
					const bound = versionById.get(entity.boundTemplateVersionId);
					const current = template?.currentVersionId
						? versionById.get(template.currentVersionId)
						: undefined;
					yield mapV2QuestionnaireToDto(
						{ ...entity, template: template ?? undefined },
						buildSchemaBinding(template, bound, current),
					);
				}
				await new Promise<void>((resolve) => setImmediate(resolve));
			}
		}

		const sink =
			dest ??
			new Writable({
				write(_chunk, _encoding, callback) {
					callback();
				},
			});
		const sinkFinished = finished(sink);
		const rowCount = await writeV2QuestionnaireRegistryXlsxToStream(
			{ stream: sink },
			columns,
			dtoRows(),
			async (done) => {
				if (onProgress && (done % 100 === 0 || done === exportIds.length)) {
					await onProgress(done, exportIds.length);
				}
			},
		);
		if (!sink.writableEnded) sink.end();
		await sinkFinished;
		return { rowCount };
	}

	async getRegistryConfig(): Promise<V2QuestionnaireRegistryConfigDto> {
		const cached = await this.getRegistryConfigCached();
		return cached.config;
	}

	private async getRegistryConfigCached(): Promise<{
		config: V2QuestionnaireRegistryConfigDto;
		formPaths: string[];
	}> {
		const hit = this.registryReadCache.getConfig();
		if (hit) return hit;
		if (this.registryConfigLoad) return this.registryConfigLoad;
		const generation = this.registryReadCache.getGeneration();
		this.registryConfigLoad = this.loadRegistryConfig()
			.then((entry) => {
				this.registryReadCache.setConfig(entry, generation);
				return this.registryReadCache.getConfig() ?? entry;
			})
			.finally(() => {
				this.registryConfigLoad = null;
			});
		return this.registryConfigLoad;
	}

	private async loadRegistryConfig(): Promise<{
		config: V2QuestionnaireRegistryConfigDto;
		formPaths: string[];
	}> {
		const versionIdRows = await this.questionnaireRepository
			.createQueryBuilder("q")
			.select("DISTINCT q.bound_template_version_id", "id")
			.getRawMany<{ id: string }>();
		const versionIds = versionIdRows
			.map((row) => row.id)
			.filter((id): id is string => Boolean(id));
		const versions =
			versionIds.length > 0
				? await this.versionRepository.find({
						where: { id: In(versionIds) },
						select: ["id", "jsonSchema", "uiSchema"],
					})
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
		const formDataRows = await this.questionnaireRepository.find({
			select: ["id", "formData"],
		});
		const config = buildV2QuestionnaireRegistryConfig(
			schemas,
			formDataRows.map((row) => ({
				formData: migrateV2AnketaFormData(row.formData ?? {}),
			})),
		);
		return {
			config,
			formPaths: collectV2RegistryFormPaths(config.columnTree),
		};
	}

	async exportRegistryXlsx(
		ids?: string[],
		user?: Record<string, unknown>,
		onProgress?: (done: number, total: number) => void | Promise<void>,
		dest?: Writable,
	): Promise<V2QuestionnaireRegistryExportResult> {
		return this.withExportSlot(() =>
			this.exportRegistryXlsxUncapped(ids, user, onProgress, dest),
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
			(await this.toRegistryListDtos(rows)).map((dto) => [dto.id, dto]),
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
		const dadmEnabled =
			await this.runtimeSettingsService.isDadmProgramManagerEnabled();
		const readOnly =
			(dadmEnabled && row.status === "inactive") ||
			row.status === "archived" ||
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
				"Создание анкет доступно только ролям ds_lead, modelops_lead и sacfg",
			);
		}
	}

	private async assertDadmProgramManagerEnabled(): Promise<void> {
		if (await this.runtimeSettingsService.isDadmProgramManagerEnabled()) {
			return;
		}
		throw new ForbiddenException(
			"Функционал менеджера программ ДАДМ выключен",
		);
	}

	private assertCanCopyQuestionnaire(
		user: TUserLike | null | undefined,
		formData: unknown,
	): void {
		const groups = Array.isArray(user?.groups) ? user.groups : [];
		const access = canUserCopyV2Questionnaire(groups, formData, {
			hasCreatePermission: true,
			hasEditPermission: true,
		});
		if (access.ok) return;
		if (access.reason === "model_anketa_for_sarep") {
			throw new ForbiddenException(
				"Представитель стрима может создавать копию только немодельных анкет",
			);
		}
		throw new ForbiddenException(
			"Копирование анкет доступно ролям ds_lead, modelops_lead, sacfg и представителю стрима (только немодельные)",
		);
	}

	async create(
		dto: CreateV2QuestionnaireRequestDto,
		user?: TUserLike | null,
	): Promise<V2QuestionnaireDto> {
		const saved = await this.createEntity(dto, user);
		this.registryReadCache.invalidateAll();
		return this.findOne(saved.id);
	}

	/**
	 * Создание без повторной загрузки DTO/схемы — для массового импорта.
	 * Не вызывает findOne (иначе OOM на больших файлах: schema × N строк).
	 */
	async createWithoutHydration(
		dto: CreateV2QuestionnaireRequestDto,
		user?: TUserLike | null,
		resolved?: {
			template: V2TemplateEntity;
			version: V2TemplateVersionEntity;
		},
	): Promise<{ id: string; calcName: string }> {
		const saved = await this.createEntity(dto, user, resolved);
		return { id: saved.id, calcName: saved.calcName };
	}

	resolveTemplateForCreatePublic(templateId?: string) {
		return this.resolveTemplateForCreate(templateId);
	}

	private async createEntity(
		dto: CreateV2QuestionnaireRequestDto,
		user?: TUserLike | null,
		resolved?: {
			template: V2TemplateEntity;
			version: V2TemplateVersionEntity;
		},
	): Promise<V2QuestionnaireEntity> {
		this.assertCanCreateQuestionnaire(user);
		const { template, version } =
			resolved ?? (await this.resolveTemplateForCreate(dto.templateId));
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

		return this.questionnaireRepository.save(entity);
	}

	async update(
		id: string,
		dto: UpdateV2QuestionnaireRequestDto,
		user?: TUserLike | null,
	): Promise<V2QuestionnaireDto> {
		const row = await this.loadWithRelations(id);
		const dadmEnabled =
			await this.runtimeSettingsService.isDadmProgramManagerEnabled();
		if (
			row.status === "archived" ||
			(dadmEnabled && row.status === "inactive")
		) {
			throw new ConflictException(
				"Историческая (неактивная) версия анкеты неизменяема. Создайте новую версию.",
			);
		}
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
		if (dto.calcName !== undefined || dto.status !== undefined) {
			this.registryReadCache.invalidateList();
		}
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

	/** Утверждение оценки: любой статус → Утверждена (независимо от готовности разделов). */
	async hold(id: string): Promise<V2QuestionnaireDto> {
		await this.assertDadmProgramManagerEnabled();
		const row = await this.loadWithRelations(id);
		if (row.status === "inactive" || row.status === "archived") {
			throw new ConflictException(
				"Нельзя утвердить неактивную или архивную анкету",
			);
		}
		const formData = migrateV2AnketaFormData(row.formData ?? {});
		const workflow = normalizeV2AnketaWorkflow(formData.workflow);
		if (workflow.globalStatus === "Утверждена") {
			throw new ConflictException("Анкета уже утверждена");
		}
		const next = holdQuestionnaire(workflow);
		if (next === workflow) {
			throw new ConflictException("Не удалось утвердить оценку по анкете");
		}
		row.formData = { ...formData, workflow: next };
		await this.questionnaireRepository.save(row);
		this.registryReadCache.invalidateList();
		return this.findOne(id);
	}

	async bulkHold(
		ids: string[],
	): Promise<{
		heldIds: string[];
		failed: Array<{ id: string; reason: string; message: string }>;
	}> {
		const uniqueIds = [...new Set(ids)];
		const heldIds: string[] = [];
		const failed: Array<{ id: string; reason: string; message: string }> = [];
		for (const id of uniqueIds) {
			try {
				await this.hold(id);
				heldIds.push(id);
			} catch (error) {
				failed.push({
					id,
					reason: "hold_failed",
					message:
						error instanceof Error
							? error.message
							: "Не удалось утвердить оценку",
				});
			}
		}
		return { heldIds, failed };
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
		});
		const maxVersion = siblings.reduce((max, s) => {
			const n = Number.parseInt(s.version, 10);
			return Number.isFinite(n) && n > max ? n : max;
		}, 0);
		const nextVersion = String(maxVersion + 1);
		const readableId = `V2-${parent.seriesId}-v${nextVersion}`;

		/**
		 * Режим менеджера программ ДАДМ: в серии активна только одна версия —
		 * предыдущие уходят в исторический срез.
		 */
		if (await this.runtimeSettingsService.isDadmProgramManagerEnabled()) {
			const toDeactivate = siblings.filter((s) => s.status === "active");
			for (const row of toDeactivate) {
				row.status = "inactive";
			}
			if (toDeactivate.length > 0) {
				await this.questionnaireRepository.save(toDeactivate);
			}
		}

		const { boundVersion, formData, formDataProjection } =
			await this.prepareVersionFormDataFromParent(parent, dto);

		const entity = this.questionnaireRepository.create({
			calcName: dto.calcName?.trim() || parent.calcName,
			status: "active",
			version: nextVersion,
			seriesId: parent.seriesId,
			parentQuestionnaireId: parent.id,
			readableId,
			templateId: parent.templateId,
			boundTemplateVersionId: boundVersion.id,
			formData,
			finalCoefficient:
				dto.finalCoefficient !== undefined
					? dto.finalCoefficient
					: parent.finalCoefficient,
			author: this.authorName(user),
		});

		const saved = await this.questionnaireRepository.save(entity);
		this.registryReadCache.invalidateAll();
		const result = await this.findOne(saved.id);
		return { ...result, formDataProjection };
	}

	/**
	 * Копия для похожей инициативы: новая серия, версия 1, данные с сбросом
	 * статусов разделов.
	 */
	async createCopy(
		parentId: string,
		dto: CreateV2QuestionnaireVersionRequestDto,
		user?: TUserLike | null,
	): Promise<V2QuestionnaireDto> {
		const parent = await this.loadWithRelations(parentId);
		const sourceFormData = migrateV2AnketaFormData(
			dto.formData ?? { ...parent.formData },
		);
		this.assertCanCopyQuestionnaire(user, sourceFormData);
		const seriesId = this.generateSeriesId();
		const versionLabel = "1";
		const readableId = `V2-${seriesId}-v${versionLabel}`;
		const calcName = dto.calcName?.trim() || parent.calcName;
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

		const { boundVersion, formData, formDataProjection } =
			await this.prepareVersionFormDataFromParent(parent, {
				...dto,
				formData: sourceFormData,
			});

		const entity = this.questionnaireRepository.create({
			calcName,
			status: "active",
			version: versionLabel,
			seriesId,
			parentQuestionnaireId: parent.id,
			readableId,
			templateId: parent.templateId,
			boundTemplateVersionId: boundVersion.id,
			formData,
			finalCoefficient:
				dto.finalCoefficient !== undefined
					? dto.finalCoefficient
					: parent.finalCoefficient,
			author: this.authorName(user),
		});

		const saved = await this.questionnaireRepository.save(entity);
		this.registryReadCache.invalidateAll();
		const result = await this.findOne(saved.id);
		return { ...result, formDataProjection };
	}

	/**
	 * Выбор целевой схемы + проекция formData (prune/defaults) + сброс workflow.
	 */
	private async prepareVersionFormDataFromParent(
		parent: V2QuestionnaireEntity,
		dto: CreateV2QuestionnaireVersionRequestDto,
	): Promise<{
		boundVersion: V2TemplateVersionEntity;
		formData: Record<string, unknown>;
		formDataProjection: V2FormDataProjectionReportDto;
	}> {
		const boundVersion = await this.resolveBoundVersionForVersionCreate(
			parent,
			dto.useCurrentSchema === true,
		);
		const sourceFormData = migrateV2AnketaFormData(
			dto.formData ?? { ...(parent.formData as Record<string, unknown>) },
		);
		/** Prune только при смене схемы; иначе runtime-ключи (groupActivation, типовые работы) теряются. */
		const projected =
			dto.useCurrentSchema === true
				? projectAndDefaultFormDataOntoJsonSchema(
						sourceFormData,
						boundVersion.jsonSchema,
					)
				: {
						formData: sourceFormData,
						report: {
							droppedPaths: [],
							defaultedPaths: [],
							summary: null,
						},
					};
		const formData = migrateV2AnketaFormData(
			resetWorkflowForCopy(projected.formData),
		);
		return {
			boundVersion,
			formData,
			formDataProjection: projected.report,
		};
	}

	private async resolveBoundVersionForVersionCreate(
		parent: V2QuestionnaireEntity,
		useCurrentSchema: boolean,
	): Promise<V2TemplateVersionEntity> {
		if (useCurrentSchema) {
			const template =
				parent.template ??
				(await this.templateRepository.findOne({
					where: { id: parent.templateId },
				}));
			if (!template) {
				throw new NotFoundException(
					`Шаблон ${parent.templateId} не найден`,
				);
			}
			return this.resolvePublishedVersionForTemplate(template);
		}

		const bound =
			parent.boundTemplateVersion ??
			(await this.versionRepository.findOne({
				where: { id: parent.boundTemplateVersionId },
			}));
		if (!bound) {
			throw new NotFoundException(
				"Привязанная версия схемы исходной анкеты не найдена",
			);
		}
		return bound;
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

		if (uniqueIds.length === 0) {
			return { deletedIds, deactivatedIds, failed };
		}

		let dadmEnabled = false;
		try {
			dadmEnabled =
				await this.runtimeSettingsService.isDadmProgramManagerEnabled();
		} catch (error) {
			this.logger.warn(
				`bulkDelete: не удалось прочитать флаг ДАДМ (${(error as Error).message})`,
			);
		}

		type LeanDeleteRow = {
			id: string;
			status: string | null;
			workflowGlobalStatus: string | null;
			implementationStream: string | null;
		};
		const leanRows = await this.questionnaireRepository
			.createQueryBuilder("q")
			.select("q.id", "id")
			.addSelect("q.status", "status")
			.addSelect(
				"q.form_data->'workflow'->>'globalStatus'",
				"workflowGlobalStatus",
			)
			.addSelect(
				"q.form_data->'generalInfo'->>'implementationStream'",
				"implementationStream",
			)
			.where("q.id IN (:...ids)", { ids: uniqueIds })
			.getRawMany<LeanDeleteRow>();
		const byId = new Map(leanRows.map((row) => [row.id, row]));

		const hardDeleteIds: string[] = [];
		const deactivateIds: string[] = [];

		for (const id of uniqueIds) {
			const row = byId.get(id);
			if (!row) {
				failed.push({
					id,
					reason: "not_found",
					message: "Анкета не найдена",
				});
				continue;
			}

			const access = canUserDeleteV2Questionnaire(groups, {
				generalInfo: {
					implementationStream: row.implementationStream ?? "",
				},
				workflow: { globalStatus: row.workflowGlobalStatus },
			});
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

			const resolved = resolveV2QuestionnaireDeleteAction(
				row.workflowGlobalStatus,
				(row.status as V2QuestionnaireStatus) || "active",
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

			/** Без фичи ДАДМ — всегда hard-delete (старое поведение). */
			if (!dadmEnabled || resolved.action === "hard_delete") {
				hardDeleteIds.push(id);
			} else {
				deactivateIds.push(id);
			}
		}

		try {
			await this.applyBulkDeleteMutations(hardDeleteIds, deactivateIds);
			deletedIds.push(...hardDeleteIds);
			deactivatedIds.push(...deactivateIds);
		} catch (error) {
			const message =
				error instanceof Error && error.message.trim()
					? error.message
					: "Не удалось удалить анкету";
			this.logger.error(`bulkDelete: ${message}`);
			for (const id of [...hardDeleteIds, ...deactivateIds]) {
				failed.push({ id, reason: "delete_failed", message });
			}
		}

		if (deletedIds.length > 0 || deactivatedIds.length > 0) {
			this.registryReadCache.invalidateAll();
		}
		return { deletedIds, deactivatedIds, failed };
	}

	/**
	 * SQL DELETE без TypeORM `remove()`: не грузит jsonb form_data и не упирается
	 * в FK parent_questionnaire_id у следующих версий серии (ДАДМ).
	 */
	private async applyBulkDeleteMutations(
		hardDeleteIds: string[],
		deactivateIds: string[],
	): Promise<void> {
		if (hardDeleteIds.length === 0 && deactivateIds.length === 0) return;

		await this.questionnaireRepository.manager.transaction(async (em) => {
			if (hardDeleteIds.length > 0) {
				await em
					.createQueryBuilder()
					.update(V2QuestionnaireEntity)
					.set({ parentQuestionnaireId: null })
					.where("parent_questionnaire_id IN (:...ids)", {
						ids: hardDeleteIds,
					})
					.execute();
				await em.delete(V2QuestionnaireEntity, hardDeleteIds);
			}
			if (deactivateIds.length > 0) {
				await em
					.createQueryBuilder()
					.update(V2QuestionnaireEntity)
					.set({ status: "inactive" })
					.where("id IN (:...ids)", { ids: deactivateIds })
					.execute();
			}
		});
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

	private async toRegistryListDtos(
		rows: V2QuestionnaireEntity[],
	): Promise<V2QuestionnaireDto[]> {
		if (rows.length === 0) return [];
		const { formPaths } = await this.getRegistryConfigCached();
		const extraVersionIds = [
			...new Set(
				rows.flatMap((row) => {
					const currentId = row.template?.currentVersionId;
					const boundId =
						row.boundTemplateVersion?.id ?? row.boundTemplateVersionId;
					if (currentId && currentId !== boundId) return [currentId];
					return [];
				}),
			),
		];
		const extraVersions =
			extraVersionIds.length > 0
				? await this.versionRepository.find({
						where: { id: In(extraVersionIds) },
						select: ["id", "versionNumber", "status"],
					})
				: [];
		const extraById = new Map(
			extraVersions.map((version) => [version.id, version]),
		);
		return rows.map((row) => {
			const template = row.template;
			const boundVersion = row.boundTemplateVersion;
			let currentVersion: Pick<
				V2TemplateVersionEntity,
				"id" | "versionNumber" | "status"
			> | null = null;
			if (template?.currentVersionId) {
				if (boundVersion?.id === template.currentVersionId) {
					currentVersion = boundVersion;
				} else {
					currentVersion =
						extraById.get(template.currentVersionId) ?? null;
				}
			}
			const binding = buildSchemaBinding(
				template,
				boundVersion,
				currentVersion,
			);
			const formData = pickV2QuestionnaireRegistryFormData(
				migrateV2AnketaFormData(row.formData ?? {}),
				formPaths,
			);
			return mapV2QuestionnaireToDto(
				{ ...row, template: template ?? undefined },
				binding,
				formData,
			);
		});
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
		let currentVersion: Pick<
			V2TemplateVersionEntity,
			"id" | "versionNumber" | "status"
		> | null = null;
		if (template?.currentVersionId) {
			if (boundVersion?.id === template.currentVersionId) {
				currentVersion = boundVersion;
			} else {
				currentVersion = await this.versionRepository.findOne({
					where: { id: template.currentVersionId },
					select: ["id", "versionNumber", "status"],
				});
			}
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

/** Экранирование `%` `_` `\` для ILIKE … ESCAPE '\\'. */
function escapeIlikePattern(raw: string): string {
	return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
