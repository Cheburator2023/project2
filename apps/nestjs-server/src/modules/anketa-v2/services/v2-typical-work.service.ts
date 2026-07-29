import {
	Injectable,
	Logger,
	NotFoundException,
	OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Not, In, Repository } from "typeorm";
import { randomUUID } from "node:crypto";
import type {
	V2TypicalWorkCardDto,
	V2TypicalWorkLaborCoefficientDto,
	V2TypicalWorkListItemDto,
	V2TypicalWorkListResponseDto,
	V2TypicalWorkAssignmentListResponseDto,
	V2TypicalWorkAssignmentListItemDto,
	V2TypicalWorkAssignmentStatusDto,
	V2TypicalWorkFormulaBadgeDto,
	V2TypicalWorkCatalogListResponseDto,
	V2TypicalWorkNormDto,
	V2TypicalWorkRuleDto,
	V2WorkTriggerStatus,
	WorkTriggerStatusCatalogParam,
	V2FormulaRegistryListResponseDto,
	V2TemplateVersionEditorSnapshotDto,
} from "@smart-anketa/api-contract";
import {
	defaultWorkFormula,
	defaultWorkRounding,
	computeWorkTriggerStatus,
	compileCalculationLogicFromVersionConfig,
	needsCalculationLogicBackfill,
	parseStoredTypicalWorkCalculationLogic,
	backfillTypicalWorkBoundWorkIdsInUiSchema,
	remapBoundWorkIdsInUiSchema,
	syncTypicalWorksCatalogLogicSnapshot,
	resolveActiveNormOnDate,
	compileStoredTypicalWorkResultLogic,
	defaultTriggerArchCount,
	defaultTriggerFormula,
	defaultLaborArchCounts,
	extractLaborArchCountsFromFormula,
	splitCatalogLaborArchCounts,
	isArchCountLaborParamName,
	resolveArchCountLaborFromCatalog,
	tokensToText,
	parseWorkFormulaText,
	computeFormulaBadge,
	normalizeStoredFormula,
	resolveCatalogTriggerStoredValue,
	resolveVersionConfigTokenFormula,
	extractFormulaRegistryLinks,
	assessFormulaRegistryLinks,
	normalizeWorkFormulaLaborParamTokens,
	reconcileFormulaLaborParamTokens,
	dedupeLaborCoefficientsByStoredValue,
	formatParamNameWithSourceKeys,
	normalizeParamLabel,
	stripParamNameSourceKeys,
	isTriggerArchCountConfigured,
	isAlwaysShownTriggerParam,
	V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_NAME,
	type WorkFormulaLaborParamRef,
} from "@smart-anketa/api-contract";
import { V2QuestionnaireEntity } from "../entities/v2-questionnaire.entity";
import { V2TemplateEntity } from "../entities/v2-template.entity";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";
import { V2TypicalWorkEntity } from "../entities/v2-typical-work.entity";
import { V2TypicalWorkNormEntity } from "../entities/v2-typical-work-norm.entity";
import { V2TypicalWorkRuleEntity } from "../entities/v2-typical-work-rule.entity";
import { V2TypicalWorkLaborCoefficientEntity } from "../entities/v2-typical-work-labor-coefficient.entity";
import { V2TypicalWorkLaborParamEntity } from "../entities/v2-typical-work-labor-param.entity";
import { V2TypicalWorkAssignmentEntity } from "../entities/v2-typical-work-assignment.entity";
import { V2TypicalWorkVersionConfigEntity } from "../entities/v2-typical-work-version-config.entity";
import {
	canonicalizeWorkStream,
	DEFAULT_NORM_VALID_FROM,
	findCatalogRowsForRegistryWork,
	findCatalogFormulaForStream,
	findCatalogLaborParamGroup,
	groupCatalogWorks,
	inferTriggerValueLabel,
	normalizeArchComponentType,
	resolveCatalogApplyStreams,
	resolveCatalogTriggerParamCode,
	resolveCatalogWorkComponent,
	slugParamCode,
} from "../utils/v2-typical-work-catalog.util";
import { V2_FACTORY_TEMPLATE_TYPICAL_WORKS_REGISTRY } from "../constants/v2-factory-template-typical-works-registry";
import { V2FactorySnapshotService } from "./v2-factory-snapshot.service";

const LEGACY_FACTORY_BOUND_WORK_NAMES = new Set([
	"Этап 212. Реализация процесса загрузки внутренних данных в Платформу данных для целей моделирования",
	"Этап 214. Сбор и анализ требований",
	"Этап 215. Согласование пилота / разовой загрузки с ИБ и ЮБ",
	"Этап 216. Согласование интеграции с ИБ и ЮБ",
	"Этап 217. Составление ТР",
	"Этап 218. Составление модели данных s2t",
	"Этап 220. Тестирование и отладка Решения",
	"Этап 230. Постановка источника на мониторинг",
]);

const LEGACY_ROOT_ATYPICAL_WORK_KEY = "field_V6wVCAX9";

function removeLegacyRootAtypicalWork(
	jsonSchema: Record<string, unknown>,
	uiSchema: Record<string, unknown>,
): {
	jsonSchema: Record<string, unknown>;
	uiSchema: Record<string, unknown>;
	changed: boolean;
} {
	const properties =
		jsonSchema.properties &&
		typeof jsonSchema.properties === "object" &&
		!Array.isArray(jsonSchema.properties)
			? (jsonSchema.properties as Record<string, unknown>)
			: undefined;
	if (!properties?.[LEGACY_ROOT_ATYPICAL_WORK_KEY]) {
		return { jsonSchema, uiSchema, changed: false };
	}

	const nextJsonSchema = structuredClone(jsonSchema);
	const nextProperties = nextJsonSchema.properties as Record<string, unknown>;
	delete nextProperties[LEGACY_ROOT_ATYPICAL_WORK_KEY];

	const nextUiSchema = structuredClone(uiSchema);
	delete nextUiSchema[LEGACY_ROOT_ATYPICAL_WORK_KEY];
	if (Array.isArray(nextUiSchema["ui:order"])) {
		nextUiSchema["ui:order"] = nextUiSchema["ui:order"].filter(
			(key) => key !== LEGACY_ROOT_ATYPICAL_WORK_KEY,
		);
	}

	return {
		jsonSchema: nextJsonSchema,
		uiSchema: nextUiSchema,
		changed: true,
	};
}
import type { V2FactoryTypicalWork } from "../constants/v2-factory-typical-works-catalog";
import { V2TypicalWorkParamCatalogService } from "./v2-typical-work-param-catalog.service";

function decimalToNumber(value: string | number | null | undefined): number {
	if (value === null || value === undefined) return 0;
	return typeof value === "number" ? value : Number(value);
}

function normalizeFactoryLaborLabel(value: string | null | undefined): string {
	return stripParamNameSourceKeys(value ?? "")
		.trim()
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/\s+/g, "");
}

function resolveCardTokenFormula(
	termsFormula: ReturnType<typeof normalizeStoredFormula>,
	formulaText: string | null | undefined,
	formulaRaw?: unknown,
): ReturnType<typeof defaultWorkFormula> {
	return resolveVersionConfigTokenFormula(
		formulaRaw ?? termsFormula,
		formulaText,
	);
}

function todayIsoDate(): string {
	return new Date().toISOString().slice(0, 10);
}

function resolveSeedVersionConfigFormula(
	catalogRows: V2FactoryTypicalWork[],
	streamExecutor: string,
	registryStreams?: readonly string[],
): {
	formula: ReturnType<typeof defaultWorkFormula>;
	rounding: ReturnType<typeof defaultWorkRounding>;
} {
	const catalogFormula = findCatalogFormulaForStream(
		catalogRows,
		streamExecutor,
		registryStreams,
	);
	if (!catalogFormula) {
		return {
			formula: defaultWorkFormula(),
			rounding: defaultWorkRounding(),
		};
	}

	const parsed = parseWorkFormulaText(catalogFormula.formulaText);
	if (parsed.error) {
		throw new Error(
			`Invalid factory formula for stream "${streamExecutor}": ${parsed.error}`,
		);
	}

	return {
		formula: {
			tokens: parsed.tokens,
			text: catalogFormula.formulaText,
		},
		rounding: {
			mode: catalogFormula.roundingMode,
			step:
				catalogFormula.roundingMode === "NONE"
					? null
					: (catalogFormula.roundingStep ?? 0.1),
		},
	};
}

@Injectable()
export class V2TypicalWorkSeedService implements OnModuleInit {
	private readonly logger = new Logger(V2TypicalWorkSeedService.name);
	/** In-flight seed по templateVersionId — чтобы bulk schema-sync не гонялся с фоновым сидом. */
	private readonly seedInFlight = new Map<string, Promise<number>>();

	constructor(
		@InjectRepository(V2TypicalWorkEntity)
		private readonly workRepository: Repository<V2TypicalWorkEntity>,
		@InjectRepository(V2TypicalWorkNormEntity)
		private readonly normRepository: Repository<V2TypicalWorkNormEntity>,
		@InjectRepository(V2TypicalWorkRuleEntity)
		private readonly ruleRepository: Repository<V2TypicalWorkRuleEntity>,
		@InjectRepository(V2TypicalWorkLaborCoefficientEntity)
		private readonly laborRepository: Repository<V2TypicalWorkLaborCoefficientEntity>,
		@InjectRepository(V2TypicalWorkLaborParamEntity)
		private readonly laborParamRepository: Repository<V2TypicalWorkLaborParamEntity>,
		@InjectRepository(V2TypicalWorkAssignmentEntity)
		private readonly assignmentRepository: Repository<V2TypicalWorkAssignmentEntity>,
		@InjectRepository(V2TypicalWorkVersionConfigEntity)
		private readonly versionConfigRepository: Repository<V2TypicalWorkVersionConfigEntity>,
		@InjectRepository(V2TemplateVersionEntity)
		private readonly templateVersionRepository: Repository<V2TemplateVersionEntity>,
		@InjectRepository(V2TemplateEntity)
		private readonly templateRepository: Repository<V2TemplateEntity>,
		private readonly paramCatalogService: V2TypicalWorkParamCatalogService,
		private readonly factorySnapshotService: V2FactorySnapshotService,
	) {}

	async onModuleInit(): Promise<void> {
		await this.paramCatalogService.ensureSeededFromFactorySnapshot();
		await this.purgeLegacyCatalogSeededWorks();
		const count = await this.workRepository.count();
		if (count > 0) {
			this.logger.log(
				`Typical works catalog: ${count} works (factory snapshot seed on template create only)`,
			);
			await this.ensureFactoryVersionConfigs();
			if (process.env.V2_FACTORY_CATALOG_SYNC_ON_START === "true") {
				await this.syncFactoryLaborCoefficients();
				await this.syncFactoryCatalogTriggers();
				await this.syncFactoryParamBindings();
				await this.syncFactoryLaborArchCounts();
			} else {
				this.logger.log(
					"Factory catalog DB sync skipped (static snapshot; set V2_FACTORY_CATALOG_SYNC_ON_START=true to repair dev DB)",
				);
			}
			return;
		}
		this.logger.log(
			"Typical works catalog is empty — add works via constructor Logic or admin panel",
		);
	}

	/** Удаляет работы с legacy catalog_key (старый auto-seed). */
	async purgeLegacyCatalogSeededWorks(): Promise<void> {
		const legacy = await this.workRepository.find({
			where: { catalogKey: Not(IsNull()) },
		});
		if (legacy.length === 0) return;

		const ids = legacy.map((row) => row.id);
		await this.workRepository.delete(ids);
		this.logger.log(
			`Purged ${legacy.length} legacy catalog typical works — use constructor Logic to add works`,
		);
	}

	/** @deprecated Use purgeLegacyCatalogSeededWorks */
	async purgeDocCatalogSeededWorks(): Promise<void> {
		return this.purgeLegacyCatalogSeededWorks();
	}

	/** @deprecated Global seed removed — works seed per template from factory snapshot */
	async seedFromDocCatalog(): Promise<void> {
		await this.paramCatalogService.ensureSeededFromFactorySnapshot();
		const paramCatalog = await this.paramCatalogService.listParameters();
		const paramsByName = new Map(paramCatalog.items.map((p) => [p.name, p]));
		const groups = groupCatalogWorks();
		let created = 0;

		for (const [catalogKey, rows] of groups) {
			const first = rows[0];
			if (!first) continue;

			const work = await this.workRepository.save(
				this.workRepository.create({
					name: first.name.trim(),
					archComponentType: normalizeArchComponentType(
						resolveCatalogWorkComponent(first),
					),
					workType: first.workType?.trim() || null,
					catalogKey,
				}),
			);

			const seenNormKeys = new Set<string>();
			const seenRuleKeys = new Set<string>();
			const seenLaborKeys = new Set<string>();

			for (const row of rows) {
				const originalStream = row.stream.trim();
				const stream = canonicalizeWorkStream(originalStream);

				if (row.norm !== null) {
					const normKey = `${stream}|${row.norm}`;
					if (!seenNormKeys.has(normKey)) {
						seenNormKeys.add(normKey);
						await this.normRepository.save(
							this.normRepository.create({
								workId: work.id,
								streamExecutor: stream,
								normValue: String(row.norm),
								validFrom: DEFAULT_NORM_VALID_FROM,
								validTo: null,
							}),
						);
					}
				}

				for (const paramName of row.triggerParams) {
					const trimmed = paramName.trim();
					if (!trimmed) continue;
					const paramCode = slugParamCode(trimmed);
					const ruleKey = `${stream}|${paramCode}`;
					if (seenRuleKeys.has(ruleKey)) continue;
					seenRuleKeys.add(ruleKey);

					const valueLabel = inferTriggerValueLabel(trimmed, originalStream);
					await this.ruleRepository.save(
						this.ruleRepository.create({
							workId: work.id,
							streamExecutor: stream,
							paramCode,
							paramName: trimmed,
							operator: "=",
							valueCode: valueLabel ? slugParamCode(valueLabel) : null,
							valueLabel,
						}),
					);
				}

				for (const paramName of row.laborParams) {
					const trimmed = paramName.trim();
					if (!trimmed) continue;
					const paramCode = slugParamCode(trimmed);
					const dictValues = paramsByName.get(trimmed)?.values ?? [];

					if (dictValues.length === 0) {
						const laborKey = `${stream}|${paramCode}|`;
						if (seenLaborKeys.has(laborKey)) continue;
						seenLaborKeys.add(laborKey);
						await this.laborRepository.save(
							this.laborRepository.create({
								workId: work.id,
								streamExecutor: stream,
								paramCode,
								paramName: trimmed,
								valueCode: null,
								valueLabel: null,
								coefficient: "1",
							}),
						);
						continue;
					}

					for (const value of dictValues) {
						const laborKey = `${stream}|${paramCode}|${value.label}`;
						if (seenLaborKeys.has(laborKey)) continue;
						seenLaborKeys.add(laborKey);
						await this.laborRepository.save(
							this.laborRepository.create({
								workId: work.id,
								streamExecutor: stream,
								paramCode,
								paramName: trimmed,
								valueCode: slugParamCode(value.label),
								valueLabel: value.label,
								coefficient: String(value.coefficient ?? 1),
							}),
						);
					}
				}
			}

			created++;
		}

		this.logger.log(`Seeded ${created} typical works from doc catalog`);
	}

	/** Дождаться завершения фонового seed для версии (если сейчас идёт). */
	async waitForSeedInFlight(templateVersionId: string): Promise<void> {
		const key = templateVersionId.trim();
		if (!key) return;
		const pending = this.seedInFlight.get(key);
		if (pending) await pending;
	}

	/**
	 * При создании схемы из заводского снимка — копирует типовые работы
	 * из `v2-factory-template-typical-works.registry.json` (prod эталон)
	 * с триггерами/трудоёмкостью из CSV-каталога по базовому имени работы.
	 */
	async seedTemplateTypicalWorksFromFactorySnapshot(
		templateId: string,
		templateVersionId: string,
	): Promise<number> {
		const trimmedTemplateId = templateId.trim();
		const trimmedVersionId = templateVersionId.trim();
		if (!trimmedTemplateId || !trimmedVersionId) return 0;

		const existing = this.seedInFlight.get(trimmedVersionId);
		if (existing) return existing;

		const run = this.runSeedTemplateTypicalWorksFromFactorySnapshot(
			trimmedTemplateId,
			trimmedVersionId,
		).finally(() => {
			if (this.seedInFlight.get(trimmedVersionId) === run) {
				this.seedInFlight.delete(trimmedVersionId);
			}
		});
		this.seedInFlight.set(trimmedVersionId, run);
		return run;
	}

	private async runSeedTemplateTypicalWorksFromFactorySnapshot(
		trimmedTemplateId: string,
		trimmedVersionId: string,
	): Promise<number> {
		const setting = await this.factorySnapshotService.getSettingDto();
		if (
			setting.source === "template" &&
			setting.templateId &&
			setting.versionId
		) {
			return this.cloneTypicalWorksFromTemplate(
				setting.templateId,
				setting.versionId,
				trimmedTemplateId,
				trimmedVersionId,
			);
		}

		const existingCount = await this.workRepository.count({
			where: { templateId: trimmedTemplateId },
		});
		if (existingCount > 0) {
			await this.ensureTemplateVersionConfigs(
				trimmedTemplateId,
				trimmedVersionId,
			);
			await this.backfillTypicalWorkBindingsInVersionUiSchema(
				trimmedTemplateId,
				trimmedVersionId,
			);
			return 0;
		}

		await this.paramCatalogService.ensureSeededFromFactorySnapshot();
		const paramCatalog = await this.paramCatalogService.listParameters();
		const paramsByName = new Map(paramCatalog.items.map((p) => [p.name, p]));
		const catalogGroups = groupCatalogWorks();
		const workIdMap = new Map<string, string>();
		let created = 0;

		const registryIds = V2_FACTORY_TEMPLATE_TYPICAL_WORKS_REGISTRY.works.map(
			(entry) => entry.id.trim(),
		);
		const existingWorksById = new Map(
			(
				await this.workRepository.find({
					where: { id: In(registryIds) },
				})
			).map((work) => [work.id, work]),
		);
		const existingVersionConfigs = await this.versionConfigRepository.find({
			where: { templateVersionId: trimmedVersionId },
		});
		const versionConfigKeys = new Set(
			existingVersionConfigs.map(
				(row) => `${row.workId}|${row.streamExecutor.trim()}`,
			),
		);

		for (const entry of V2_FACTORY_TEMPLATE_TYPICAL_WORKS_REGISTRY.works) {
			let workId = entry.id.trim();
			const existingById = existingWorksById.get(workId);
			if (existingById && existingById.templateId !== trimmedTemplateId) {
				const nextId = randomUUID();
				workIdMap.set(entry.id, nextId);
				workId = nextId;
			}

			const work = await this.workRepository.save(
				this.workRepository.create({
					id: workId,
					name: entry.name.trim(),
					archComponentType: normalizeArchComponentType(
						entry.archComponentType,
					),
					workType: entry.workType?.trim() || null,
					catalogKey: null,
					templateId: trimmedTemplateId,
				}),
			);

			const catalogRows = findCatalogRowsForRegistryWork(entry, catalogGroups);

			const streams = await this.seedRegistryWorkNormsAndCatalog(
				work.id,
				entry,
				catalogRows,
				paramsByName,
			);

			for (const stream of streams) {
				await this.ensureWorkVersionConfig(
					work.id,
					trimmedVersionId,
					stream,
					catalogRows,
					versionConfigKeys,
					entry.streams,
				);
			}

			created++;
		}

		if (created > 0) {
			this.logger.log(
				`Seeded ${created} template typical works for template ${trimmedTemplateId} from factory registry`,
			);
		}

		if (workIdMap.size > 0) {
			await this.remapWorkIdsInVersionUiSchema(trimmedVersionId, workIdMap);
		}

		await this.backfillTypicalWorkBindingsInVersionUiSchema(
			trimmedTemplateId,
			trimmedVersionId,
		);
		return created;
	}

	/** @deprecated Use seedTemplateTypicalWorksFromFactorySnapshot */
	async seedTemplateTypicalWorksFromDocCatalog(
		templateId: string,
		templateVersionId: string,
	): Promise<number> {
		return this.seedTemplateTypicalWorksFromFactorySnapshot(
			templateId,
			templateVersionId,
		);
	}

	/**
	 * Клонирует типовые работы с UI-эталона (source=template).
	 * - тот же template: только version configs с эталонной версии;
	 * - новый пустой template: deep-copy works + связанные сущности;
	 * - существующий template: sync rules/labor/assignments/version configs по имени.
	 */
	async cloneTypicalWorksFromTemplate(
		sourceTemplateId: string,
		sourceVersionId: string,
		targetTemplateId: string,
		targetVersionId: string,
	): Promise<number> {
		if (sourceTemplateId === targetTemplateId) {
			const copied = await this.copyVersionConfigsBetweenVersions(
				targetTemplateId,
				sourceVersionId,
				targetVersionId,
			);
			this.logger.log(
				`Cloned ${copied} version configs within template ${targetTemplateId} (${sourceVersionId} → ${targetVersionId})`,
			);
			return copied;
		}

		const existingCount = await this.workRepository.count({
			where: { templateId: targetTemplateId },
		});
		if (existingCount === 0) {
			return this.deepCloneWorksFromTemplate(
				sourceTemplateId,
				sourceVersionId,
				targetTemplateId,
				targetVersionId,
			);
		}

		return this.syncWorksFromEtalonTemplate(
			sourceTemplateId,
			sourceVersionId,
			targetTemplateId,
			targetVersionId,
		);
	}

	private async copyVersionConfigsBetweenVersions(
		templateId: string,
		sourceVersionId: string,
		targetVersionId: string,
	): Promise<number> {
		const works = await this.workRepository.find({ where: { templateId } });
		const workIds = works.map((work) => work.id);
		if (workIds.length === 0) return 0;

		const parentConfigs = await this.versionConfigRepository.find({
			where: { templateVersionId: sourceVersionId, workId: In(workIds) },
		});

		let copied = 0;
		for (const parent of parentConfigs) {
			const existing = await this.versionConfigRepository.findOne({
				where: {
					templateVersionId: targetVersionId,
					workId: parent.workId,
					streamExecutor: parent.streamExecutor,
				},
			});
			if (existing) {
				existing.formula = parent.formula;
				existing.formulaText = parent.formulaText;
				existing.roundingMode = parent.roundingMode;
				existing.roundingStep = parent.roundingStep;
				existing.calculationLogic = parent.calculationLogic;
				await this.versionConfigRepository.save(existing);
				copied += 1;
				continue;
			}

			await this.versionConfigRepository.save(
				this.versionConfigRepository.create({
					workId: parent.workId,
					templateVersionId: targetVersionId,
					streamExecutor: parent.streamExecutor,
					formula: parent.formula,
					formulaText: parent.formulaText,
					roundingMode: parent.roundingMode,
					roundingStep: parent.roundingStep,
					calculationLogic: parent.calculationLogic,
				}),
			);
			copied += 1;
		}
		return copied;
	}

	private async deepCloneWorksFromTemplate(
		sourceTemplateId: string,
		sourceVersionId: string,
		targetTemplateId: string,
		targetVersionId: string,
	): Promise<number> {
		const sourceWorks = await this.workRepository.find({
			where: { templateId: sourceTemplateId },
			order: { name: "ASC" },
		});
		if (sourceWorks.length === 0) {
			return 0;
		}

		const sourceIds = sourceWorks.map((work) => work.id);
		const [
			assignments,
			norms,
			rules,
			laborRows,
			laborParams,
			versionConfigs,
		] = await Promise.all([
			this.assignmentRepository.find({ where: { workId: In(sourceIds) } }),
			this.normRepository.find({ where: { workId: In(sourceIds) } }),
			this.ruleRepository.find({ where: { workId: In(sourceIds) } }),
			this.laborRepository.find({ where: { workId: In(sourceIds) } }),
			this.laborParamRepository.find({ where: { workId: In(sourceIds) } }),
			this.versionConfigRepository.find({
				where: {
					workId: In(sourceIds),
					templateVersionId: sourceVersionId,
				},
			}),
		]);

		const workIdMap = new Map<string, string>();
		for (const source of sourceWorks) {
			const nextId = randomUUID();
			workIdMap.set(source.id, nextId);
			await this.workRepository.save(
				this.workRepository.create({
					id: nextId,
					name: source.name,
					archComponentType: source.archComponentType,
					workType: source.workType,
					catalogKey: null,
					templateId: targetTemplateId,
				}),
			);
		}

		const strip = <
			T extends { id?: string; createdAt?: Date; updatedAt?: Date },
		>(
			row: T,
		): Omit<T, "id" | "createdAt" | "updatedAt"> => {
			const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = row;
			return rest;
		};

		for (const row of assignments) {
			const workId = workIdMap.get(row.workId);
			if (!workId) continue;
			await this.assignmentRepository.save(
				this.assignmentRepository.create({
					...strip(row),
					workId,
				}),
			);
		}
		for (const row of norms) {
			const workId = workIdMap.get(row.workId);
			if (!workId) continue;
			await this.normRepository.save(
				this.normRepository.create({ ...strip(row), workId }),
			);
		}
		for (const row of rules) {
			const workId = workIdMap.get(row.workId);
			if (!workId) continue;
			await this.ruleRepository.save(
				this.ruleRepository.create({ ...strip(row), workId }),
			);
		}
		for (const row of laborRows) {
			const workId = workIdMap.get(row.workId);
			if (!workId) continue;
			await this.laborRepository.save(
				this.laborRepository.create({ ...strip(row), workId }),
			);
		}
		for (const row of laborParams) {
			const workId = workIdMap.get(row.workId);
			if (!workId) continue;
			await this.laborParamRepository.save(
				this.laborParamRepository.create({ ...strip(row), workId }),
			);
		}
		for (const row of versionConfigs) {
			const workId = workIdMap.get(row.workId);
			if (!workId) continue;
			await this.versionConfigRepository.save(
				this.versionConfigRepository.create({
					...strip(row),
					workId,
					templateVersionId: targetVersionId,
				}),
			);
		}

		await this.remapWorkIdsInVersionUiSchema(targetVersionId, workIdMap);
		/**
		 * Только remap boundWorkIds. backfill/syncTypicalWorksCatalogLogicSnapshot
		 * переписывает logic/ui и даёт ложный дифф vs эталон сразу после создания.
		 */

		this.logger.log(
			`Deep-cloned ${sourceWorks.length} typical works from template ${sourceTemplateId} → ${targetTemplateId}`,
		);
		return sourceWorks.length;
	}

	private async syncWorksFromEtalonTemplate(
		sourceTemplateId: string,
		sourceVersionId: string,
		targetTemplateId: string,
		targetVersionId: string,
	): Promise<number> {
		const [sourceWorks, targetWorks] = await Promise.all([
			this.workRepository.find({ where: { templateId: sourceTemplateId } }),
			this.workRepository.find({ where: { templateId: targetTemplateId } }),
		]);
		if (sourceWorks.length === 0) {
			return 0;
		}

		const workKey = (work: {
			archComponentType: string;
			name: string;
		}) =>
			`${normalizeArchComponentType(work.archComponentType)}|${work.name.trim()}`;

		const targetByKey = new Map(
			targetWorks.map((work) => [workKey(work), work] as const),
		);
		const workIdMap = new Map<string, string>();
		let touched = 0;

		const sourceIds = sourceWorks.map((work) => work.id);
		const [
			sourceAssignments,
			sourceNorms,
			sourceRules,
			sourceLabor,
			sourceLaborParams,
			sourceConfigs,
		] = await Promise.all([
			this.assignmentRepository.find({ where: { workId: In(sourceIds) } }),
			this.normRepository.find({ where: { workId: In(sourceIds) } }),
			this.ruleRepository.find({ where: { workId: In(sourceIds) } }),
			this.laborRepository.find({ where: { workId: In(sourceIds) } }),
			this.laborParamRepository.find({ where: { workId: In(sourceIds) } }),
			this.versionConfigRepository.find({
				where: {
					workId: In(sourceIds),
					templateVersionId: sourceVersionId,
				},
			}),
		]);

		const groupByWork = <T extends { workId: string }>(rows: T[]) => {
			const map = new Map<string, T[]>();
			for (const row of rows) {
				const list = map.get(row.workId) ?? [];
				list.push(row);
				map.set(row.workId, list);
			}
			return map;
		};

		const assignmentsByWork = groupByWork(sourceAssignments);
		const normsByWork = groupByWork(sourceNorms);
		const rulesByWork = groupByWork(sourceRules);
		const laborByWork = groupByWork(sourceLabor);
		const laborParamsByWork = groupByWork(sourceLaborParams);
		const configsByWork = groupByWork(sourceConfigs);

		const strip = <
			T extends { id?: string; createdAt?: Date; updatedAt?: Date },
		>(
			row: T,
		): Omit<T, "id" | "createdAt" | "updatedAt"> => {
			const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = row;
			return rest;
		};

		for (const source of sourceWorks) {
			const key = workKey(source);
			let target = targetByKey.get(key);
			if (!target) {
				const nextId = randomUUID();
				target = await this.workRepository.save(
					this.workRepository.create({
						id: nextId,
						name: source.name,
						archComponentType: source.archComponentType,
						workType: source.workType,
						catalogKey: null,
						templateId: targetTemplateId,
					}),
				);
				targetByKey.set(key, target);
			} else {
				if (target.workType !== source.workType) {
					target.workType = source.workType;
					await this.workRepository.save(target);
				}
			}
			workIdMap.set(source.id, target.id);

			await this.ruleRepository.delete({ workId: target.id });
			await this.laborRepository.delete({ workId: target.id });
			await this.laborParamRepository.delete({ workId: target.id });
			await this.normRepository.delete({ workId: target.id });
			await this.assignmentRepository.delete({ workId: target.id });

			for (const row of assignmentsByWork.get(source.id) ?? []) {
				await this.assignmentRepository.save(
					this.assignmentRepository.create({
						...strip(row),
						workId: target.id,
					}),
				);
			}
			for (const row of normsByWork.get(source.id) ?? []) {
				await this.normRepository.save(
					this.normRepository.create({
						...strip(row),
						workId: target.id,
					}),
				);
			}
			for (const row of rulesByWork.get(source.id) ?? []) {
				await this.ruleRepository.save(
					this.ruleRepository.create({
						...strip(row),
						workId: target.id,
					}),
				);
			}
			for (const row of laborByWork.get(source.id) ?? []) {
				await this.laborRepository.save(
					this.laborRepository.create({
						...strip(row),
						workId: target.id,
					}),
				);
			}
			for (const row of laborParamsByWork.get(source.id) ?? []) {
				await this.laborParamRepository.save(
					this.laborParamRepository.create({
						...strip(row),
						workId: target.id,
					}),
				);
			}

			for (const row of configsByWork.get(source.id) ?? []) {
				const existing = await this.versionConfigRepository.findOne({
					where: {
						workId: target.id,
						templateVersionId: targetVersionId,
						streamExecutor: row.streamExecutor,
					},
				});
				if (existing) {
					existing.formula = row.formula;
					existing.formulaText = row.formulaText;
					existing.roundingMode = row.roundingMode;
					existing.roundingStep = row.roundingStep;
					existing.calculationLogic = row.calculationLogic;
					await this.versionConfigRepository.save(existing);
				} else {
					await this.versionConfigRepository.save(
						this.versionConfigRepository.create({
							...strip(row),
							workId: target.id,
							templateVersionId: targetVersionId,
						}),
					);
				}
			}
			touched += 1;
		}

		await this.remapWorkIdsInVersionUiSchema(targetVersionId, workIdMap);

		this.logger.log(
			`Synced ${touched} typical works from etalon template ${sourceTemplateId} → ${targetTemplateId}`,
		);
		return touched;
	}

	/** Записывает boundWorkIds на legacy-блоки typicalWork по назначениям работ на стрим. */
	async backfillTypicalWorkBindingsInVersionUiSchema(
		templateId: string,
		templateVersionId: string,
	): Promise<void> {
		const version = await this.templateVersionRepository.findOne({
			where: { id: templateVersionId },
		});
		if (!version?.uiSchema || typeof version.uiSchema !== "object") return;

		const works = await this.workRepository.find({ where: { templateId } });
		if (works.length === 0) return;

		const workIds = works.map((work) => work.id);
		const assignments = await this.assignmentRepository.find({
			where: { workId: In(workIds), isActive: true },
		});
		const streamsByWork = new Map<string, string[]>();
		for (const row of assignments) {
			const list = streamsByWork.get(row.workId) ?? [];
			list.push(row.streamExecutor);
			streamsByWork.set(row.workId, list);
		}
		const catalog = works.map((work) => ({
			id: work.id,
			streams: streamsByWork.get(work.id) ?? [],
		}));
		const workNameById = new Map(
			works.map((work) => [work.id, work.name.trim()] as const),
		);

		const cleaned = removeLegacyRootAtypicalWork(
			(version.jsonSchema ?? {}) as Record<string, unknown>,
			version.uiSchema as Record<string, unknown>,
		);
		const uiSchema = cleaned.uiSchema;
		const next = backfillTypicalWorkBoundWorkIdsInUiSchema(uiSchema, catalog, {
			replaceExisting: (boundWorkIds) =>
				boundWorkIds.length === LEGACY_FACTORY_BOUND_WORK_NAMES.size &&
				boundWorkIds.every((id) =>
					LEGACY_FACTORY_BOUND_WORK_NAMES.has(workNameById.get(id) ?? ""),
				),
		});
		if (!cleaned.changed && JSON.stringify(next) === JSON.stringify(uiSchema)) {
			const syncedLogic = syncTypicalWorksCatalogLogicSnapshot(
				version.logic ?? { rules: [] },
				{
					jsonSchema: version.jsonSchema,
					uiSchema: next,
				},
			);
			if (JSON.stringify(syncedLogic) !== JSON.stringify(version.logic ?? { rules: [] })) {
				version.logic = syncedLogic;
				await this.templateVersionRepository.save(version);
			}
			return;
		}

		version.jsonSchema = cleaned.jsonSchema;
		version.uiSchema = next;
		version.logic = syncTypicalWorksCatalogLogicSnapshot(
			version.logic ?? { rules: [] },
			{
				jsonSchema: version.jsonSchema,
				uiSchema: next,
			},
		);
		await this.templateVersionRepository.save(version);
	}

	private async ensureWorkStreamAssignment(
		workId: string,
		streamExecutor: string,
	): Promise<void> {
		const stream = streamExecutor.trim();
		if (!stream) return;

		const existing = await this.assignmentRepository.findOne({
			where: { workId, streamExecutor: stream },
		});
		if (existing) return;

		await this.assignmentRepository.save(
			this.assignmentRepository.create({
				workId,
				streamExecutor: stream,
				isActive: true,
			}),
		);
	}

	private async ensureWorkVersionConfig(
		workId: string,
		templateVersionId: string,
		streamExecutor: string,
		catalogRows: V2FactoryTypicalWork[] = [],
		existingConfigKeys?: Set<string>,
		registryStreams?: readonly string[],
	): Promise<void> {
		const stream = streamExecutor.trim();
		const configKey = `${workId}|${stream}`;
		if (existingConfigKeys?.has(configKey)) return;

		if (!existingConfigKeys) {
			const existing = await this.versionConfigRepository.findOne({
				where: { workId, templateVersionId, streamExecutor: stream },
			});
			if (existing) {
				const isPlaceholderFormula =
					!existing.formulaText?.trim() ||
					existing.formulaText.trim() === "N";
				const catalogFormula = findCatalogFormulaForStream(
					catalogRows,
					stream,
					registryStreams,
				);
				if (isPlaceholderFormula && catalogFormula?.formulaText?.trim()) {
					const { formula, rounding } = resolveSeedVersionConfigFormula(
						catalogRows,
						stream,
						registryStreams,
					);
					const compiled = compileStoredTypicalWorkResultLogic(
						formula,
						rounding,
					);
					existing.formula = formula.tokens;
					existing.formulaText =
						formula.text || tokensToText(formula.tokens);
					existing.roundingMode = rounding.mode;
					existing.roundingStep =
						rounding.mode === "NONE"
							? null
							: String(rounding.step ?? 0.1);
					existing.calculationLogic = compiled;
					await this.versionConfigRepository.save(existing);
				}
				return;
			}
		}

		const { formula, rounding } = resolveSeedVersionConfigFormula(
			catalogRows,
			stream,
			registryStreams,
		);
		const compiled = compileStoredTypicalWorkResultLogic(formula, rounding);

		await this.versionConfigRepository.save(
			this.versionConfigRepository.create({
				workId,
				templateVersionId,
				streamExecutor: stream,
				formula: formula.tokens,
				formulaText: formula.text || tokensToText(formula.tokens),
				roundingMode: rounding.mode,
				roundingStep:
					rounding.mode === "NONE" ? null : String(rounding.step ?? 0.1),
				calculationLogic: compiled,
			}),
		);
		existingConfigKeys?.add(configKey);
	}

	private async remapWorkIdsInVersionUiSchema(
		templateVersionId: string,
		workIdMap: Map<string, string>,
	): Promise<void> {
		if (workIdMap.size === 0) return;

		const version = await this.templateVersionRepository.findOne({
			where: { id: templateVersionId },
		});
		if (!version?.uiSchema || typeof version.uiSchema !== "object") return;

		const uiSchema = version.uiSchema as Record<string, unknown>;
		const next = remapBoundWorkIdsInUiSchema(uiSchema, workIdMap);
		if (JSON.stringify(next) === JSON.stringify(uiSchema)) return;

		version.uiSchema = next;
		await this.templateVersionRepository.save(version);
	}

	private async seedRegistryWorkNormsAndCatalog(
		workId: string,
		entry: {
			streams: string[];
			normsByStream: Record<string, number | null>;
		},
		catalogRows: V2FactoryTypicalWork[],
		paramsByName: Map<
			string,
			{ values?: Array<{ label: string; coefficient?: number | null }> }
		>,
	): Promise<Set<string>> {
		const seenNormKeys = new Set<string>();
		const seenRuleKeys = new Set<string>();
		const seenLaborKeys = new Set<string>();
		const seenLaborParamKeys = new Set<string>();
		const streams = new Set<string>();
		const pendingAssignments: Array<{
			workId: string;
			streamExecutor: string;
			isActive: boolean;
		}> = [];
		const pendingNorms: Array<{
			workId: string;
			streamExecutor: string;
			normValue: string;
			validFrom: string;
			validTo: null;
		}> = [];
		const pendingRules: Array<{
			workId: string;
			streamExecutor: string;
			schemaFieldUid: string | null;
			paramCode: string;
			paramName: string;
			operator: string;
			valueCode: string | null;
			valueLabel: string | null;
			valueCodes: Array<{ code: string; label: string }> | null;
		}> = [];
		const pendingLaborParams: Array<{
			workId: string;
			streamExecutor: string;
			schemaFieldUid: string | null;
			paramCode: string;
			paramName: string;
			kind: string;
			anyOfValueCodes: string[] | null;
			anyOfValueLabels: string[] | null;
			coeffOn: string | null;
			coeffOff: string | null;
		}> = [];
		const pendingLaborRows: Array<{
			workId: string;
			streamExecutor: string;
			paramCode: string;
			paramName: string;
			valueCode: string | null;
			valueLabel: string | null;
			coefficient: string;
		}> = [];
		const pendingLaborArchCounts = new Map<
			string,
			NonNullable<V2TypicalWorkCardDto["laborArchCounts"]>
		>();
		const pendingTriggerArchCounts = new Map<
			string,
			NonNullable<V2TypicalWorkCardDto["triggerArchCount"]>
		>();

		const existingAssignments = await this.assignmentRepository.find({
			where: { workId },
		});
		const assignmentKeys = new Set(
			existingAssignments.map(
				(row) => `${row.workId}|${row.streamExecutor.trim()}`,
			),
		);

		const queueAssignment = (stream: string) => {
			const key = `${workId}|${stream}`;
			if (assignmentKeys.has(key)) return;
			assignmentKeys.add(key);
			pendingAssignments.push({
				workId,
				streamExecutor: stream,
				isActive: true,
			});
		};

		for (const rawStream of entry.streams) {
			const stream = canonicalizeWorkStream(rawStream.trim());
			if (!stream) continue;
			streams.add(stream);
			queueAssignment(stream);

			const registryNorm =
				entry.normsByStream[rawStream] ?? entry.normsByStream[stream];
			if (registryNorm != null) {
				const normKey = `${stream}|${registryNorm}`;
				if (!seenNormKeys.has(normKey)) {
					seenNormKeys.add(normKey);
					pendingNorms.push({
						workId,
						streamExecutor: stream,
						normValue: String(registryNorm),
						validFrom: DEFAULT_NORM_VALID_FROM,
						validTo: null,
					});
				}
			}
		}

		for (const row of catalogRows) {
			const originalStream = row.stream.trim();
			const applyStreams = resolveCatalogApplyStreams(
				originalStream,
				entry.streams,
			);
			for (const stream of applyStreams) {
				streams.add(stream);
				queueAssignment(stream);
			}

			const catalogStream = canonicalizeWorkStream(originalStream);
			if (row.norm !== null) {
				const normKey = `${catalogStream}|${row.norm}`;
				if (!seenNormKeys.has(normKey)) {
					seenNormKeys.add(normKey);
					pendingNorms.push({
						workId,
						streamExecutor: catalogStream,
						normValue: String(row.norm),
						validFrom: DEFAULT_NORM_VALID_FROM,
						validTo: null,
					});
				}
			}

			const triggerRules = row.triggerRules?.length
				? row.triggerRules
				: row.triggerParams.map((paramName) => ({
						paramName,
						operator: "exists" as const,
						values: [] as string[],
					}));
			const laborSplit = splitCatalogLaborArchCounts({
				laborParams: row.laborParams,
				laborCoefficients: row.laborCoefficients,
			});
			const catalogLaborArch =
				row.laborArchCounts?.map((arch) => ({
					kind: arch.kind as NonNullable<
						V2TypicalWorkCardDto["laborArchCounts"]
					>[number]["kind"],
					steps: arch.steps,
					paramName: arch.paramName ?? null,
				})) ?? laborSplit.laborArchCounts;

			for (const stream of applyStreams) {
				for (const triggerRule of triggerRules) {
					if (triggerRule.operator === "unresolved") continue;
					const trimmed = triggerRule.paramName.trim();
					if (!trimmed) continue;
					if (isArchCountLaborParamName(trimmed)) {
						const arch =
							row.triggerArchCount ??
							resolveArchCountLaborFromCatalog(trimmed);
						if (arch?.kind && arch.steps.length > 0) {
							pendingTriggerArchCounts.set(stream, {
								kind: arch.kind as NonNullable<
									V2TypicalWorkCardDto["triggerArchCount"]
								>["kind"],
								steps: arch.steps,
								combinator: row.triggerArchCount?.combinator ?? "and",
							});
						}
						continue;
					}
					const coefficientGroup = findCatalogLaborParamGroup(row, trimmed);
					const paramCode = resolveCatalogTriggerParamCode(row, trimmed);
					const ruleKey = `${stream}|${paramCode}`;
					if (seenRuleKeys.has(ruleKey)) continue;
					seenRuleKeys.add(ruleKey);

					const stored = resolveCatalogTriggerRuleStoredValues(
						triggerRule,
						trimmed,
						originalStream,
					);
					const alwaysTrigger = isAlwaysShownTriggerParam(paramCode, trimmed);
					pendingRules.push({
						workId,
						streamExecutor: stream,
						schemaFieldUid: alwaysTrigger
							? null
							: (("schemaFieldUid" in triggerRule
									? triggerRule.schemaFieldUid?.trim()
									: null) ??
								coefficientGroup?.schemaFieldUid?.trim() ??
								null),
						paramCode,
						paramName: alwaysTrigger
							? V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_NAME
							: trimmed,
						operator: stored.operator,
						valueCode: alwaysTrigger ? null : stored.valueCode,
						valueLabel: alwaysTrigger ? null : stored.valueLabel,
						valueCodes: alwaysTrigger ? null : stored.valueCodes,
					});
				}

				if (
					row.triggerArchCount?.kind &&
					row.triggerArchCount.steps.length > 0
				) {
					pendingTriggerArchCounts.set(stream, {
						kind: row.triggerArchCount.kind as NonNullable<
							V2TypicalWorkCardDto["triggerArchCount"]
						>["kind"],
						steps: row.triggerArchCount.steps,
						combinator: row.triggerArchCount.combinator ?? "and",
					});
				}

				if (catalogLaborArch.length > 0) {
					const merged = pendingLaborArchCounts.get(stream) ?? [];
					for (const arch of catalogLaborArch) {
						if (merged.some((item) => item.kind === arch.kind)) continue;
						merged.push(arch);
					}
					pendingLaborArchCounts.set(stream, merged);
				}

				for (const paramName of laborSplit.laborParams) {
					const trimmed = paramName.trim();
					if (!trimmed) continue;
					if (isArchCountLaborParamName(trimmed)) continue;
					const coefficientGroup = findCatalogLaborParamGroup(row, trimmed);
					const paramCode =
						coefficientGroup?.paramCode?.trim() || slugParamCode(trimmed);
					const isAnyOf =
						coefficientGroup?.kind === "any_of" &&
						coefficientGroup.anyOf != null;
					const laborParamKey = `${stream}|${paramCode}`;
					if (!seenLaborParamKeys.has(laborParamKey)) {
						seenLaborParamKeys.add(laborParamKey);
						pendingLaborParams.push({
							workId,
							streamExecutor: stream,
							schemaFieldUid: coefficientGroup?.schemaFieldUid?.trim() || null,
							paramCode,
							paramName: trimmed,
							kind: isAnyOf ? "any_of" : "by_value",
							anyOfValueCodes: isAnyOf
								? [...(coefficientGroup?.anyOf?.valueCodes ?? [])]
								: null,
							anyOfValueLabels: isAnyOf
								? [...(coefficientGroup?.anyOf?.valueLabels ?? [])]
								: null,
							coeffOn: isAnyOf
								? String(coefficientGroup?.anyOf?.coeffOn ?? 1)
								: null,
							coeffOff: isAnyOf
								? String(coefficientGroup?.anyOf?.coeffOff ?? 1)
								: null,
						});
					}

					if (isAnyOf) {
						continue;
					}

					const rowValues = coefficientGroup?.values ?? [];
					const dictValues =
						rowValues.length > 0
							? rowValues
							: (paramsByName.get(trimmed)?.values ?? []);

					if (dictValues.length === 0) {
						const laborKey = `${stream}|${paramCode}|`;
						if (seenLaborKeys.has(laborKey)) continue;
						seenLaborKeys.add(laborKey);
						pendingLaborRows.push({
							workId,
							streamExecutor: stream,
							paramCode,
							paramName: trimmed,
							valueCode: null,
							valueLabel: null,
							coefficient: "1",
						});
						continue;
					}

					for (const value of dictValues) {
						const laborKey = `${stream}|${paramCode}|${value.label}`;
						if (seenLaborKeys.has(laborKey)) continue;
						seenLaborKeys.add(laborKey);
						const valueCode =
							("code" in value &&
							typeof value.code === "string" &&
							value.code.trim()) ||
							slugParamCode(value.label);
						pendingLaborRows.push({
							workId,
							streamExecutor: stream,
							paramCode,
							paramName: trimmed,
							valueCode,
							valueLabel: value.label,
							coefficient: String(value.coefficient ?? 1),
						});
					}
				}
			}
		}

		if (pendingAssignments.length > 0) {
			await this.assignmentRepository.insert(pendingAssignments);
		}
		if (pendingNorms.length > 0) {
			await this.normRepository.insert(pendingNorms);
		}
		if (pendingRules.length > 0) {
			await this.ruleRepository.insert(pendingRules);
		}
		if (pendingLaborParams.length > 0) {
			await this.laborParamRepository.insert(pendingLaborParams);
		}
		if (pendingLaborRows.length > 0) {
			await this.laborRepository.insert(pendingLaborRows);
		}
		for (const [stream, laborArchCounts] of pendingLaborArchCounts) {
			if (laborArchCounts.length === 0) continue;
			const assignment = await this.assignmentRepository.findOne({
				where: { workId, streamExecutor: stream },
			});
			if (!assignment) continue;
			assignment.laborArchCounts = laborArchCounts.map((arch) => ({
				kind: arch.kind,
				paramName: arch.paramName ?? null,
				steps: arch.steps,
			}));
			await this.assignmentRepository.save(assignment);
		}
		for (const [stream, triggerArchCount] of pendingTriggerArchCounts) {
			if (!triggerArchCount.kind || triggerArchCount.steps.length === 0) {
				continue;
			}
			const assignment = await this.assignmentRepository.findOne({
				where: { workId, streamExecutor: stream },
			});
			if (!assignment) continue;
			assignment.triggerArchCountKind = triggerArchCount.kind;
			assignment.triggerArchCountSteps = triggerArchCount.steps;
			assignment.triggerArchCountCombinator =
				triggerArchCount.combinator ?? "and";
			await this.assignmentRepository.save(assignment);
		}

		return streams;
	}

	/**
	 * Обновляет коэффициенты уже созданных из factory registry работ.
	 *
	 * Раньше `seedTemplateTypicalWorksFromFactorySnapshot` прекращал работу,
	 * если у шаблона уже были типовые работы. Поэтому добавленные позднее в
	 * snapshot коэффициенты (включая компонентные исключения) оставались в БД
	 * равными 1. Сопоставление идёт по
	 * заводскому имени работы, компоненту, стриму, параметру и значению; коды
	 * параметров схемы при этом сохраняются.
	 */
	async syncFactoryLaborCoefficients(): Promise<number> {
		const registryByWorkKey = new Map(
			V2_FACTORY_TEMPLATE_TYPICAL_WORKS_REGISTRY.works.map((entry) => [
				`${normalizeArchComponentType(entry.archComponentType)}|${entry.name.trim()}`,
				entry,
			]),
		);
		const works = await this.workRepository.find({
			where: { templateId: Not(IsNull()) },
		});
		if (works.length === 0) return 0;

		const catalogGroups = groupCatalogWorks();
		const workIds = works.map((work) => work.id);
		const existingRows = await this.laborRepository.find({
			where: { workId: In(workIds) },
		});
		const rowsByWorkId = new Map<
			string,
			V2TypicalWorkLaborCoefficientEntity[]
		>();
		for (const row of existingRows) {
			const rows = rowsByWorkId.get(row.workId) ?? [];
			rows.push(row);
			rowsByWorkId.set(row.workId, rows);
		}

		let synchronized = 0;
		for (const work of works) {
			const registry = registryByWorkKey.get(
				`${normalizeArchComponentType(work.archComponentType)}|${work.name.trim()}`,
			);
			if (!registry) continue;

			const catalogRows = findCatalogRowsForRegistryWork(
				registry,
				catalogGroups,
			);
			if (catalogRows.length === 0) continue;

			const workRows = rowsByWorkId.get(work.id) ?? [];
			for (const catalogRow of catalogRows) {
				const applyStreams = resolveCatalogApplyStreams(
					catalogRow.stream,
					registry.streams,
				);
				for (const stream of applyStreams) {
					for (const group of catalogRow.laborCoefficients ?? []) {
						if (isArchCountLaborParamName(group.paramName)) continue;
						const normalizedParam = normalizeFactoryLaborLabel(group.paramName);
						const paramCode =
							group.paramCode?.trim() ?? slugParamCode(group.paramName);
						const sameParamRows = workRows.filter(
							(row) =>
								row.streamExecutor === stream &&
								(row.paramCode === paramCode ||
									normalizeFactoryLaborLabel(
										row.paramName ?? row.paramCode,
									) === normalizedParam),
						);

						for (const value of group.values) {
							const normalizedValue = normalizeFactoryLaborLabel(value.label);
							const valueCode =
								(typeof value.code === "string" && value.code.trim()) ||
								slugParamCode(value.label);
							const matches = sameParamRows.filter(
								(row) =>
									row.paramCode === paramCode &&
									(row.valueCode === valueCode ||
										normalizeFactoryLaborLabel(
											row.valueLabel ?? row.valueCode,
										) === normalizedValue),
							);
							const coefficient = String(value.coefficient ?? 1);

							if (matches.length === 0) {
								const duplicateByKey = workRows.find(
									(row) =>
										row.streamExecutor === stream &&
										row.paramCode === paramCode &&
										row.valueCode === valueCode,
								);
								if (duplicateByKey) {
									let changed = false;
									if (
										Number(duplicateByKey.coefficient) !== Number(coefficient)
									) {
										duplicateByKey.coefficient = coefficient;
										changed = true;
									}
									if (duplicateByKey.paramName !== group.paramName) {
										duplicateByKey.paramName = group.paramName;
										changed = true;
									}
									if (duplicateByKey.valueLabel !== value.label) {
										duplicateByKey.valueLabel = value.label;
										changed = true;
									}
									if (changed) {
										await this.laborRepository.save(duplicateByKey);
										synchronized++;
									}
									continue;
								}
								const created = await this.laborRepository.save(
									this.laborRepository.create({
										workId: work.id,
										streamExecutor: stream,
										paramCode,
										paramName: group.paramName,
										valueCode,
										valueLabel: value.label,
										coefficient,
									}),
								);
								workRows.push(created);
								synchronized++;
								continue;
							}

							for (const row of matches) {
								let changed = false;
								if (row.paramCode !== paramCode) {
									row.paramCode = paramCode;
									changed = true;
								}
								if (row.paramName !== group.paramName) {
									row.paramName = group.paramName;
									changed = true;
								}
								if (Number(row.coefficient) !== Number(coefficient)) {
									row.coefficient = coefficient;
									changed = true;
								}
								if (!changed) continue;
								await this.laborRepository.save(row);
								synchronized++;
							}
						}
					}
				}
			}
		}

		if (synchronized > 0) {
			this.logger.log(
				`Synchronized ${synchronized} factory typical-work labor coefficients`,
			);
		}
		return synchronized;
	}

	private async upsertFactoryCatalogTriggerRule(params: {
		work: V2TypicalWorkEntity;
		catalogRow: V2FactoryTypicalWork;
		triggerRule: CatalogTriggerRuleLike;
		stream: string;
		originalStream: string;
		workRules: V2TypicalWorkRuleEntity[];
	}): Promise<number> {
		const { work, catalogRow, triggerRule, stream, originalStream, workRules } =
			params;
		if (triggerRule.operator === "unresolved") return 0;
		const trimmed = triggerRule.paramName.trim();
		if (!trimmed) return 0;
		if (isArchCountLaborParamName(trimmed)) return 0;

		const coefficientGroup = findCatalogLaborParamGroup(catalogRow, trimmed);
		const paramCode = resolveCatalogTriggerParamCode(catalogRow, trimmed);
		const alwaysTrigger = isAlwaysShownTriggerParam(paramCode, trimmed);
		const existing = findExistingFactoryTriggerRule(
			workRules,
			stream,
			paramCode,
			trimmed,
		);
		const stored = resolveCatalogTriggerRuleStoredValues(
			triggerRule,
			trimmed,
			originalStream,
		);
		const schemaFieldUid = alwaysTrigger
			? null
			: (triggerRule.schemaFieldUid?.trim() ??
				coefficientGroup?.schemaFieldUid?.trim() ??
				null);
		const paramName = alwaysTrigger
			? V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_NAME
			: trimmed;
		const valueCode = alwaysTrigger ? null : stored.valueCode;
		const valueLabel = alwaysTrigger ? null : stored.valueLabel;
		const valueCodes = alwaysTrigger ? null : stored.valueCodes;

		if (existing) {
			const catalogValues =
				triggerRule.values.length > 0 ? triggerRule.values : [];
			const valueChanged =
				!alwaysTrigger &&
				catalogValues.length > 0 &&
				(existing.valueLabel !== valueLabel ||
					existing.valueCode !== valueCode ||
					JSON.stringify(existing.valueCodes ?? null) !==
						JSON.stringify(valueCodes ?? null));
			const operatorChanged = existing.operator !== stored.operator;
			const paramCodeChanged = existing.paramCode !== paramCode;
			const paramNameChanged = existing.paramName !== paramName;
			const schemaFieldChanged = existing.schemaFieldUid !== schemaFieldUid;
			if (
				!valueChanged &&
				!operatorChanged &&
				!paramCodeChanged &&
				!paramNameChanged &&
				!schemaFieldChanged
			) {
				return 0;
			}

			existing.operator = stored.operator;
			existing.paramName = paramName;
			existing.valueCode = valueCode;
			existing.valueLabel = valueLabel;
			existing.valueCodes = valueCodes;
			if (paramCodeChanged) existing.paramCode = paramCode;
			existing.schemaFieldUid = schemaFieldUid;
			await this.ruleRepository.save(existing);
			return 1;
		}

		const created = await this.ruleRepository.save(
			this.ruleRepository.create({
				workId: work.id,
				streamExecutor: stream,
				schemaFieldUid,
				paramCode,
				paramName,
				operator: stored.operator,
				valueCode,
				valueLabel,
				valueCodes,
			}),
		);
		workRules.push(created);
		return 1;
	}

	/**
	 * Добавляет недостающие триггеры из factory snapshot для работ реестра.
	 * Нужно для шаблонов, созданных до исправления сопоставления E2E-этапов.
	 */
	async syncFactoryCatalogTriggers(): Promise<number> {
		const registryByWorkKey = new Map(
			V2_FACTORY_TEMPLATE_TYPICAL_WORKS_REGISTRY.works.map((entry) => [
				`${normalizeArchComponentType(entry.archComponentType)}|${entry.name.trim()}`,
				entry,
			]),
		);
		const works = await this.workRepository.find({
			where: { templateId: Not(IsNull()) },
		});
		if (works.length === 0) return 0;

		const catalogGroups = groupCatalogWorks();
		const workIds = works.map((work) => work.id);
		const existingRules = await this.ruleRepository.find({
			where: { workId: In(workIds) },
		});
		const rulesByWorkId = new Map<string, V2TypicalWorkRuleEntity[]>();
		for (const row of existingRules) {
			const rows = rulesByWorkId.get(row.workId) ?? [];
			rows.push(row);
			rulesByWorkId.set(row.workId, rows);
		}

		let synchronized = 0;
		for (const work of works) {
			const registry = registryByWorkKey.get(
				`${normalizeArchComponentType(work.archComponentType)}|${work.name.trim()}`,
			);
			if (!registry) continue;

			const catalogRows = findCatalogRowsForRegistryWork(
				registry,
				catalogGroups,
			);
			if (catalogRows.length === 0) continue;

			const workRules = rulesByWorkId.get(work.id) ?? [];
			for (const catalogRow of catalogRows) {
				const originalStream = catalogRow.stream.trim();
				const applyStreams = resolveCatalogApplyStreams(
					originalStream,
					registry.streams,
				);
				const triggerRules = catalogRow.triggerRules?.length
					? catalogRow.triggerRules
					: catalogRow.triggerParams.map((paramName) => ({
							paramName,
							operator: "exists" as const,
							values: [] as string[],
						}));

				for (const stream of applyStreams) {
					for (const triggerRule of triggerRules) {
						const changed = await this.upsertFactoryCatalogTriggerRule({
							work,
							catalogRow,
							triggerRule,
							stream,
							originalStream,
							workRules,
						});
						synchronized += changed;
					}
				}
			}
		}

		if (synchronized > 0) {
			this.logger.log(
				`Synchronized ${synchronized} factory typical-work trigger rules`,
			);
		}
		return synchronized;
	}

	/** Исправляет paramCode/schemaFieldUid и triggerArchCount по factory snapshot. */
	async syncFactoryParamBindings(): Promise<number> {
		const registryByWorkKey = new Map(
			V2_FACTORY_TEMPLATE_TYPICAL_WORKS_REGISTRY.works.map((entry) => [
				`${normalizeArchComponentType(entry.archComponentType)}|${entry.name.trim()}`,
				entry,
			]),
		);
		const works = await this.workRepository.find({
			where: { templateId: Not(IsNull()) },
		});
		if (works.length === 0) return 0;

		const catalogGroups = groupCatalogWorks();
		const workIds = works.map((work) => work.id);
		const [existingRules, existingLaborParams, existingLaborRows, assignments] =
			await Promise.all([
				this.ruleRepository.find({ where: { workId: In(workIds) } }),
				this.laborParamRepository.find({ where: { workId: In(workIds) } }),
				this.laborRepository.find({ where: { workId: In(workIds) } }),
				this.assignmentRepository.find({ where: { workId: In(workIds) } }),
			]);

		let synchronized = 0;
		for (const work of works) {
			const registry = registryByWorkKey.get(
				`${normalizeArchComponentType(work.archComponentType)}|${work.name.trim()}`,
			);
			if (!registry) continue;

			const catalogRows = findCatalogRowsForRegistryWork(
				registry,
				catalogGroups,
			);
			if (catalogRows.length === 0) continue;

			for (const catalogRow of catalogRows) {
				const applyStreams = resolveCatalogApplyStreams(
					catalogRow.stream,
					registry.streams,
				);

				for (const stream of applyStreams) {
					for (const rule of existingRules.filter(
						(row) => row.workId === work.id && row.streamExecutor === stream,
					)) {
						if (isArchCountLaborParamName(rule.paramName ?? "")) {
							await this.ruleRepository.delete(rule.id);
							synchronized++;
							continue;
						}
						const paramCode = resolveCatalogTriggerParamCode(
							catalogRow,
							rule.paramName ?? rule.paramCode,
						);
						const coefficientGroup = findCatalogLaborParamGroup(
							catalogRow,
							rule.paramName ?? rule.paramCode,
						);
						const schemaFieldUid =
							coefficientGroup?.schemaFieldUid?.trim() ?? rule.schemaFieldUid;
						if (rule.paramCode !== paramCode) {
							const duplicate = existingRules.find(
								(row) =>
									row.id !== rule.id &&
									row.workId === work.id &&
									row.streamExecutor === stream &&
									row.paramCode === paramCode,
							);
							if (duplicate) {
								if (
									!duplicate.valueLabel &&
									!duplicate.valueCode &&
									(rule.valueLabel || rule.valueCode)
								) {
									duplicate.valueCode = rule.valueCode;
									duplicate.valueLabel = rule.valueLabel;
									duplicate.valueCodes = rule.valueCodes;
									duplicate.operator = rule.operator;
									await this.ruleRepository.save(duplicate);
									synchronized++;
								}
								await this.ruleRepository.delete(rule.id);
								synchronized++;
								continue;
							}
						}
						if (
							rule.paramCode !== paramCode ||
							rule.schemaFieldUid !== schemaFieldUid
						) {
							rule.paramCode = paramCode;
							rule.schemaFieldUid = schemaFieldUid ?? null;
							await this.ruleRepository.save(rule);
							synchronized++;
						}
					}

					for (const laborParam of existingLaborParams.filter(
						(row) => row.workId === work.id && row.streamExecutor === stream,
					)) {
						if (isArchCountLaborParamName(laborParam.paramName ?? "")) continue;
						const coefficientGroup = findCatalogLaborParamGroup(
							catalogRow,
							laborParam.paramName ?? laborParam.paramCode,
						);
						const paramCode =
							coefficientGroup?.paramCode?.trim() ??
							resolveCatalogTriggerParamCode(
								catalogRow,
								laborParam.paramName ?? laborParam.paramCode,
							);
						const schemaFieldUid =
							coefficientGroup?.schemaFieldUid?.trim() ??
							laborParam.schemaFieldUid;
						if (laborParam.paramCode !== paramCode) {
							const duplicate = existingLaborParams.find(
								(row) =>
									row.id !== laborParam.id &&
									row.workId === work.id &&
									row.streamExecutor === stream &&
									row.paramCode === paramCode,
							);
							if (duplicate) {
								await this.laborParamRepository.delete(laborParam.id);
								if (
									schemaFieldUid &&
									duplicate.schemaFieldUid !== schemaFieldUid
								) {
									duplicate.schemaFieldUid = schemaFieldUid;
									await this.laborParamRepository.save(duplicate);
								}
								synchronized++;
								continue;
							}
						}
						if (
							laborParam.paramCode !== paramCode ||
							laborParam.schemaFieldUid !== schemaFieldUid
						) {
							laborParam.paramCode = paramCode;
							laborParam.schemaFieldUid = schemaFieldUid ?? null;
							await this.laborParamRepository.save(laborParam);
							synchronized++;
						}
					}

					for (const laborRow of existingLaborRows.filter(
						(row) => row.workId === work.id && row.streamExecutor === stream,
					)) {
						if (isArchCountLaborParamName(laborRow.paramName ?? "")) continue;
						const paramCode = resolveCatalogTriggerParamCode(
							catalogRow,
							laborRow.paramName ?? laborRow.paramCode,
						);
						if (laborRow.paramCode === paramCode) continue;
						const duplicate = existingLaborRows.find(
							(row) =>
								row.id !== laborRow.id &&
								row.workId === work.id &&
								row.streamExecutor === stream &&
								row.paramCode === paramCode &&
								row.valueCode === laborRow.valueCode,
						);
						if (duplicate) {
							await this.laborRepository.delete(laborRow.id);
							synchronized++;
							continue;
						}
						laborRow.paramCode = paramCode;
						await this.laborRepository.save(laborRow);
						synchronized++;
					}

					if (
						catalogRow.triggerArchCount?.kind &&
						catalogRow.triggerArchCount.steps.length > 0
					) {
						const assignment = assignments.find(
							(row) =>
								row.workId === work.id && row.streamExecutor === stream,
						);
						if (
							assignment &&
							(assignment.triggerArchCountKind !==
								catalogRow.triggerArchCount.kind ||
								JSON.stringify(assignment.triggerArchCountSteps) !==
									JSON.stringify(catalogRow.triggerArchCount.steps) ||
								(assignment.triggerArchCountCombinator ?? "and") !==
									(catalogRow.triggerArchCount.combinator ?? "and"))
						) {
							assignment.triggerArchCountKind =
								catalogRow.triggerArchCount.kind;
							assignment.triggerArchCountSteps =
								catalogRow.triggerArchCount.steps;
							assignment.triggerArchCountCombinator =
								catalogRow.triggerArchCount.combinator ?? "and";
							await this.assignmentRepository.save(assignment);
							synchronized++;
						}
					} else {
						const assignment = assignments.find(
							(row) =>
								row.workId === work.id && row.streamExecutor === stream,
						);
						if (assignment?.triggerArchCountKind) {
							assignment.triggerArchCountKind = null;
							assignment.triggerArchCountSteps = null;
							assignment.triggerArchCountCombinator = "and";
							await this.assignmentRepository.save(assignment);
							synchronized++;
						}
					}
				}
			}
		}

		if (synchronized > 0) {
			this.logger.log(
				`Synchronized ${synchronized} factory typical-work param bindings`,
			);
		}
		return synchronized;
	}

	async syncFactoryLaborArchCounts(): Promise<number> {
		const registryByWorkKey = new Map(
			V2_FACTORY_TEMPLATE_TYPICAL_WORKS_REGISTRY.works.map((entry) => [
				`${normalizeArchComponentType(entry.archComponentType)}|${entry.name.trim()}`,
				entry,
			]),
		);
		const works = await this.workRepository.find({
			where: { templateId: Not(IsNull()) },
		});
		if (works.length === 0) return 0;

		const catalogGroups = groupCatalogWorks();
		const workIds = works.map((work) => work.id);
		const assignments = await this.assignmentRepository.find({
			where: { workId: In(workIds) },
		});
		const assignmentsByWorkId = new Map<string, V2TypicalWorkAssignmentEntity[]>();
		for (const row of assignments) {
			const list = assignmentsByWorkId.get(row.workId) ?? [];
			list.push(row);
			assignmentsByWorkId.set(row.workId, list);
		}

		let synchronized = 0;
		for (const work of works) {
			const registry = registryByWorkKey.get(
				`${normalizeArchComponentType(work.archComponentType)}|${work.name.trim()}`,
			);
			if (!registry) continue;

			const catalogRows = findCatalogRowsForRegistryWork(
				registry,
				catalogGroups,
			);
			if (catalogRows.length === 0) continue;

			for (const catalogRow of catalogRows) {
				const applyStreams = resolveCatalogApplyStreams(
					catalogRow.stream,
					registry.streams,
				);
				const split = splitCatalogLaborArchCounts({
					laborParams: catalogRow.laborParams,
					laborCoefficients: catalogRow.laborCoefficients,
				});
				const catalogLaborArch =
					catalogRow.laborArchCounts?.map((arch) => ({
						kind: arch.kind,
						paramName: arch.paramName ?? null,
						steps: arch.steps,
					})) ??
					split.laborArchCounts.map((arch) => ({
						kind: arch.kind,
						paramName: arch.paramName ?? null,
						steps: arch.steps,
					}));
				if (catalogLaborArch.length === 0) continue;

				for (const stream of applyStreams) {
					const assignment = assignmentsByWorkId
						.get(work.id)
						?.find((row) => row.streamExecutor === stream);
					if (!assignment) continue;

					if (!assignment.laborArchCounts?.length) {
						assignment.laborArchCounts = catalogLaborArch;
						await this.assignmentRepository.save(assignment);
						synchronized++;
					}

					for (const archParamName of catalogRow.laborParams) {
						if (!isArchCountLaborParamName(archParamName)) continue;
						await this.laborRepository.delete({
							workId: work.id,
							streamExecutor: stream,
							paramName: archParamName.trim(),
						});
						await this.laborParamRepository.delete({
							workId: work.id,
							streamExecutor: stream,
							paramName: archParamName.trim(),
						});
					}
				}
			}
		}

		if (synchronized > 0) {
			this.logger.log(
				`Synchronized ${synchronized} factory typical-work labor arch counts`,
			);
		}
		return synchronized;
	}

	private async ensureTemplateVersionConfigs(
		templateId: string,
		templateVersionId: string,
	): Promise<void> {
		const works = await this.workRepository.find({ where: { templateId } });
		if (works.length === 0) return;

		const workIds = works.map((work) => work.id);
		const assignments = await this.assignmentRepository.find({
			where: { workId: In(workIds) },
		});
		const assignmentsByWork = new Map<string, string[]>();
		for (const assignment of assignments) {
			const list = assignmentsByWork.get(assignment.workId) ?? [];
			list.push(assignment.streamExecutor);
			assignmentsByWork.set(assignment.workId, list);
		}

		const catalogGroups = groupCatalogWorks();

		for (const work of works) {
			const catalogRows = findCatalogRowsForRegistryWork(
				{
					name: work.name,
					archComponentType: work.archComponentType,
				},
				catalogGroups,
			);
			const streams = assignmentsByWork.get(work.id) ?? [];
			for (const stream of streams) {
				await this.ensureWorkVersionConfig(
					work.id,
					templateVersionId,
					stream,
					catalogRows,
				);
			}
		}
	}

	/** Создаёт недостающие конфиги текущей заводской версии по assignments и snapshot. */
	async ensureFactoryVersionConfigs(): Promise<void> {
		const activeTemplate = await this.templateRepository.findOne({
			where: { currentVersionId: Not(IsNull()) },
			order: { updatedAt: "DESC" },
		});
		const templateVersionId = activeTemplate?.currentVersionId;
		if (!activeTemplate?.id || !templateVersionId) return;
		await this.ensureTemplateVersionConfigs(
			activeTemplate.id,
			templateVersionId,
		);
	}
}

@Injectable()
export class V2TypicalWorkService {
	constructor(
		@InjectRepository(V2TypicalWorkEntity)
		private readonly workRepository: Repository<V2TypicalWorkEntity>,
		@InjectRepository(V2TypicalWorkNormEntity)
		private readonly normRepository: Repository<V2TypicalWorkNormEntity>,
		@InjectRepository(V2TypicalWorkRuleEntity)
		private readonly ruleRepository: Repository<V2TypicalWorkRuleEntity>,
		@InjectRepository(V2TypicalWorkLaborCoefficientEntity)
		private readonly laborRepository: Repository<V2TypicalWorkLaborCoefficientEntity>,
		@InjectRepository(V2TypicalWorkLaborParamEntity)
		private readonly laborParamRepository: Repository<V2TypicalWorkLaborParamEntity>,
		@InjectRepository(V2TypicalWorkAssignmentEntity)
		private readonly assignmentRepository: Repository<V2TypicalWorkAssignmentEntity>,
		@InjectRepository(V2QuestionnaireEntity)
		private readonly questionnaireRepository: Repository<V2QuestionnaireEntity>,
		@InjectRepository(V2TypicalWorkVersionConfigEntity)
		private readonly versionConfigRepository: Repository<V2TypicalWorkVersionConfigEntity>,
		@InjectRepository(V2TemplateVersionEntity)
		private readonly templateVersionRepository: Repository<V2TemplateVersionEntity>,
		@InjectRepository(V2TemplateEntity)
		private readonly templateRepository: Repository<V2TemplateEntity>,
		private readonly paramCatalogService: V2TypicalWorkParamCatalogService,
	) {}

	private async resolveTemplateIdFilter(query: {
		templateId?: string;
		templateVersionId?: string;
	}): Promise<string | undefined> {
		if (query.templateId?.trim()) return query.templateId.trim();
		if (!query.templateVersionId?.trim()) return undefined;
		const version = await this.templateVersionRepository.findOne({
			where: { id: query.templateVersionId.trim() },
			select: ["id", "templateId"],
		});
		return version?.templateId;
	}

	async listCatalog(query?: {
		templateId?: string;
	}): Promise<V2TypicalWorkCatalogListResponseDto> {
		const templateId = query?.templateId?.trim();
		const works = await this.workRepository.find({
			where: templateId ? { templateId } : {},
			order: { archComponentType: "ASC", name: "ASC" },
		});
		const workIds = works.map((w) => w.id);
		const assignments = workIds.length
			? await this.assignmentRepository.find({ where: { workId: In(workIds) } })
			: [];
		const assignmentsByWork = groupBy(assignments, (a) => a.workId);
		const streamsByWork = new Map<string, Set<string>>();
		for (const a of assignments) {
			const set = streamsByWork.get(a.workId) ?? new Set<string>();
			set.add(a.streamExecutor);
			streamsByWork.set(a.workId, set);
		}

		const items = works.map((work) => ({
			id: work.id,
			name: work.name,
			archComponentType: work.archComponentType,
			workType: work.workType,
			streams: [...(streamsByWork.get(work.id) ?? [])],
			assignmentCount: assignmentsByWork.get(work.id)?.length ?? 0,
		}));

		return { total: items.length, items };
	}

	async listAssignments(query: {
		workId?: string;
		streamExecutor?: string;
		archComponentType?: string;
		templateVersionId?: string;
		templateId?: string;
	}): Promise<V2TypicalWorkAssignmentListResponseDto> {
		const templateId = await this.resolveTemplateIdFilter(query);
		const assignments = await this.assignmentRepository.find({
			order: { streamExecutor: "ASC" },
		});
		if (assignments.length === 0) return { total: 0, items: [] };

		const workIds = unique(assignments.map((a) => a.workId));
		const works = await this.workRepository.find({
			where: { id: In(workIds) },
		});
		const workById = new Map(works.map((w) => [w.id, w]));
		const atDate = todayIsoDate();
		const triggerStatusCatalog =
			await this.paramCatalogService.listTriggerStatusCatalog(atDate);

		const rules = await this.ruleRepository.find({
			where: { workId: In(workIds) },
		});
		const rulesByKey = groupBy(rules, (r) => `${r.workId}|${r.streamExecutor}`);

		const items: V2TypicalWorkAssignmentListItemDto[] = [];
		for (const assignment of assignments) {
			const work = workById.get(assignment.workId);
			if (!work) continue;
			if (templateId && work.templateId !== templateId) continue;
			if (query.workId && assignment.workId !== query.workId) continue;
			if (
				query.streamExecutor &&
				assignment.streamExecutor !== query.streamExecutor.trim()
			) {
				continue;
			}
			if (
				query.archComponentType &&
				work.archComponentType !== query.archComponentType
			) {
				continue;
			}

			let formulaBadge: V2TypicalWorkFormulaBadgeDto | undefined;
			if (query.templateVersionId) {
				const config = await this.versionConfigRepository.findOne({
					where: {
						workId: assignment.workId,
						templateVersionId: query.templateVersionId,
						streamExecutor: assignment.streamExecutor,
					},
				});
				if (config) {
					const terms = normalizeStoredFormula(
						config.formula,
						config.formulaText,
					);
					formulaBadge = computeFormulaBadge(terms.terms);
				}
			}

			const assignmentRules =
				rulesByKey.get(`${assignment.workId}|${assignment.streamExecutor}`) ??
				[];

			items.push({
				id: assignment.id,
				workId: assignment.workId,
				workName: work.name,
				archComponentType: work.archComponentType,
				streamExecutor: assignment.streamExecutor,
				isActive: assignment.isActive,
				formulaBadge,
				triggerStatus: resolveTriggerStatus(
					assignmentRules,
					triggerStatusCatalog,
					atDate,
					mapTriggerArchCountEntity(assignment),
				),
			});
		}

		return { total: items.length, items };
	}

	async countSchemaUsages(workId: string): Promise<number> {
		const rows = await this.questionnaireRepository
			.createQueryBuilder("q")
			.select("DISTINCT q.bound_template_version_id", "versionId")
			.where("q.form_data::text LIKE :needle", { needle: `%${workId}%` })
			.getRawMany<{ versionId: string }>();
		return rows.filter((row) => row.versionId).length;
	}

	async listWorks(query: {
		archComponentType?: string;
		streamExecutor?: string;
		templateId?: string;
	}): Promise<V2TypicalWorkListResponseDto> {
		const templateId = query.templateId?.trim();
		const works = await this.workRepository.find({
			where: templateId ? { templateId } : {},
			order: { archComponentType: "ASC", name: "ASC" },
		});

		const workIds = works.map((w) => w.id);
		const [norms, rules, laborRows, assignments] = await Promise.all([
			workIds.length
				? this.normRepository.find({ where: { workId: In(workIds) } })
				: [],
			workIds.length
				? this.ruleRepository.find({ where: { workId: In(workIds) } })
				: [],
			workIds.length
				? this.laborRepository.find({ where: { workId: In(workIds) } })
				: [],
			workIds.length
				? this.assignmentRepository.find({ where: { workId: In(workIds) } })
				: [],
		]);

		const normsByWork = groupBy(norms, (n) => n.workId);
		const rulesByWork = groupBy(rules, (r) => r.workId);
		const laborByWork = groupBy(laborRows, (r) => r.workId);
		const assignmentsByWork = groupBy(assignments, (a) => a.workId);
		const templateIds = unique(
			works.map((w) => w.templateId).filter((id): id is string => Boolean(id)),
		);
		const templates = templateIds.length
			? await this.templateRepository.find({ where: { id: In(templateIds) } })
			: [];
		const templateNameById = new Map(templates.map((t) => [t.id, t.name]));
		const atDate = todayIsoDate();
		const triggerStatusCatalog =
			await this.paramCatalogService.listTriggerStatusCatalog(atDate);
		const streamFilter = query.streamExecutor?.trim();

		const items: V2TypicalWorkListItemDto[] = works
			.filter((work) =>
				query.archComponentType
					? work.archComponentType === query.archComponentType
					: true,
			)
			.map((work) => {
				const workNorms = normsByWork.get(work.id) ?? [];
				const workRules = rulesByWork.get(work.id) ?? [];
				const workLabor = laborByWork.get(work.id) ?? [];
				const workAssignments = assignmentsByWork.get(work.id) ?? [];
				const streams = unique([
					...workAssignments.map((a) => a.streamExecutor),
					...workNorms.map((n) => n.streamExecutor),
					...workRules.map((r) => r.streamExecutor),
					...workLabor.map((l) => l.streamExecutor),
				]);

				const streamForStatus =
					streamFilter && streams.includes(streamFilter)
						? streamFilter
						: pickStreamForListTriggerStatus(
								streams,
								workRules,
								workAssignments,
								triggerStatusCatalog,
								atDate,
							) ??
							streams[0] ??
							streamFilter ??
							"";

				const normsDto = workNorms.map(mapNormEntity);
				const normsByStream: Record<string, number | null> = {};
				const laborParamCountByStream: Record<string, number> = {};
				for (const stream of streams) {
					normsByStream[stream] = resolveActiveNormOnDate(
						normsDto,
						stream,
						atDate,
					);
					const paramCodes = new Set(
						workLabor
							.filter((row) => row.streamExecutor === stream)
							.map((row) => row.paramCode),
					);
					laborParamCountByStream[stream] = paramCodes.size;
				}
				const currentNorm = streamForStatus
					? (normsByStream[streamForStatus] ?? null)
					: null;

				return {
					id: work.id,
					name: work.name,
					archComponentType: work.archComponentType,
					workType: work.workType,
					assignmentStatus: resolveAssignmentStatus(workAssignments),
					triggerStatus: resolveTriggerStatus(
						workRules.filter((r) =>
							streamForStatus ? r.streamExecutor === streamForStatus : true,
						),
						triggerStatusCatalog,
						atDate,
						mapTriggerArchCountEntity(
							workAssignments.find(
								(row) =>
									!streamForStatus || row.streamExecutor === streamForStatus,
							) ?? workAssignments[0],
						),
					),
					currentNorm,
					streams,
					templateId: work.templateId,
					templateName: work.templateId
						? (templateNameById.get(work.templateId) ?? null)
						: null,
					normsByStream,
					laborParamCountByStream,
				};
			})
			.filter((item) =>
				streamFilter ? item.streams.includes(streamFilter) : true,
			);

		const archComponentTypes = unique(
			works.map((w) => w.archComponentType),
		).sort();

		return {
			total: items.length,
			items,
			archComponentTypes,
		};
	}

	/** Карточки типовых работ шаблона для всех стримов (для editor-snapshot / диффа). */
	async listWorkCardsForVersion(
		templateId: string,
		templateVersionId: string,
	): Promise<V2TypicalWorkCardDto[]> {
		const list = await this.listWorks({ templateId });
		const cards: V2TypicalWorkCardDto[] = [];
		for (const item of list.items) {
			const streams =
				item.streams.length > 0 ? item.streams : ([""] as string[]);
			for (const stream of streams) {
				if (!stream) continue;
				cards.push(
					await this.getWorkCard(item.id, stream, templateVersionId),
				);
			}
		}
		return cards;
	}

	/**
	 * Карточки эталона для диффа при source=builtin (работ в БД нет).
	 * Триггеры / labor / формулы — из registry + catalog snapshot.
	 */
	listFactoryBundleTypicalWorksForDiff(): V2TypicalWorkCardDto[] {
		const catalogGroups = groupCatalogWorks();
		const cards: V2TypicalWorkCardDto[] = [];

		for (const entry of V2_FACTORY_TEMPLATE_TYPICAL_WORKS_REGISTRY.works) {
			const catalogRows = findCatalogRowsForRegistryWork(entry, catalogGroups);
			const registryStreams = entry.streams
				.map((stream) => stream.trim())
				.filter(Boolean);
			if (registryStreams.length === 0) continue;

			for (const stream of registryStreams) {
				const { rules, triggerArchCount } = buildFactoryDiffTriggersForStream(
					catalogRows,
					stream,
					registryStreams,
				);
				const { laborParams, laborArchCounts, formula, rounding, norms } =
					buildFactoryDiffLaborAndFormulaForStream(
						catalogRows,
						stream,
						registryStreams,
						entry.normsByStream,
					);
				cards.push({
					id: entry.id.trim(),
					name: entry.name.trim(),
					archComponentType: normalizeArchComponentType(
						entry.archComponentType,
					),
					workType: entry.workType?.trim() || null,
					streamExecutor: stream,
					triggerStatus: "appears",
					norms,
					rules,
					triggerArchCount,
					triggerMode: "simple",
					triggerFormula: defaultTriggerFormula(),
					laborArchCounts,
					laborParams,
					formula,
					rounding,
				});
			}
		}

		return cards;
	}

	async getEditorSnapshot(
		templateId: string,
		versionId: string,
	): Promise<V2TemplateVersionEditorSnapshotDto> {
		const version = await this.templateVersionRepository.findOne({
			where: { id: versionId, templateId },
		});
		if (!version) {
			throw new NotFoundException(
				`Version ${versionId} not found for template ${templateId}`,
			);
		}

		const typicalWorks = await this.listWorkCardsForVersion(
			templateId,
			versionId,
		);

		return {
			jsonSchema: structuredClone(version.jsonSchema ?? {}),
			uiSchema: structuredClone(version.uiSchema ?? {}),
			logic: structuredClone(version.logic ?? { rules: [] }),
			dictionariesSnapshot: version.dictionariesSnapshot
				? structuredClone(version.dictionariesSnapshot)
				: null,
			typicalWorks,
		};
	}

	async listFormulaRegistry(query?: {
		templateId?: string;
	}): Promise<V2FormulaRegistryListResponseDto> {
		const templateFilter = query?.templateId?.trim();
		const configs = await this.versionConfigRepository.find({
			order: { updatedAt: "DESC" },
		});
		if (configs.length === 0) {
			return { total: 0, items: [], templateOptions: [] };
		}

		const workIds = unique(configs.map((config) => config.workId));
		const versionIds = unique(
			configs.map((config) => config.templateVersionId),
		);
		const referencedAssignmentIds = new Set<string>();

		const parsedConfigs = configs.map((config) => {
			const terms = normalizeStoredFormula(config.formula, config.formulaText);
			const tokenFormula = resolveCardTokenFormula(
				terms,
				config.formulaText,
				config.formula,
			);
			const links = extractFormulaRegistryLinks(tokenFormula.tokens);
			for (const ref of links.workRefs) {
				referencedAssignmentIds.add(ref.assignmentId);
			}
			return { config, terms, tokenFormula, links };
		});

		const [
			works,
			versions,
			assignmentsForWorks,
			assignmentsForRefs,
			laborRows,
			laborParamHeaders,
			rules,
			paramCatalog,
		] = await Promise.all([
			this.workRepository.find({ where: { id: In(workIds) } }),
			this.templateVersionRepository.find({ where: { id: In(versionIds) } }),
			this.assignmentRepository.find({ where: { workId: In(workIds) } }),
			referencedAssignmentIds.size
				? this.assignmentRepository.find({
						where: { id: In([...referencedAssignmentIds]) },
					})
				: Promise.resolve([]),
			this.laborRepository.find({ where: { workId: In(workIds) } }),
			this.laborParamRepository.find({ where: { workId: In(workIds) } }),
			this.ruleRepository.find({ where: { workId: In(workIds) } }),
			this.paramCatalogService.listParameters(),
		]);

		const catalogNameByCode = new Map(
			paramCatalog.items.map((param) => [param.code, param.name]),
		);
		const laborRowsByWorkStream = groupBy(
			laborRows,
			(row) => `${row.workId}:${row.streamExecutor}`,
		);
		const laborHeadersByWorkStream = groupBy(
			laborParamHeaders,
			(header) => `${header.workId}:${header.streamExecutor}`,
		);
		const ruleNameByWorkStreamCode = new Map<string, string>();
		for (const rule of rules) {
			const key = `${rule.workId}:${rule.streamExecutor}:${rule.paramCode}`;
			if (!ruleNameByWorkStreamCode.has(key) && rule.paramName?.trim()) {
				ruleNameByWorkStreamCode.set(key, rule.paramName.trim());
			}
		}

		const refWorkIds = unique(
			assignmentsForRefs.map((assignment) => assignment.workId),
		);
		const missingWorkIds = refWorkIds.filter((id) => !workIds.includes(id));
		const refWorks = missingWorkIds.length
			? await this.workRepository.find({ where: { id: In(missingWorkIds) } })
			: [];

		const templateIds = unique(versions.map((version) => version.templateId));
		const templates = templateIds.length
			? await this.templateRepository.find({ where: { id: In(templateIds) } })
			: [];

		const workById = new Map(
			[...works, ...refWorks].map((work) => [work.id, work]),
		);
		const versionById = new Map(
			versions.map((version) => [version.id, version]),
		);
		const templateById = new Map(
			templates.map((template) => [template.id, template]),
		);
		const assignmentById = new Map(
			[...assignmentsForWorks, ...assignmentsForRefs].map((assignment) => [
				assignment.id,
				assignment,
			]),
		);
		const assignmentByWorkStream = new Map(
			assignmentsForWorks.map((assignment) => [
				`${assignment.workId}:${assignment.streamExecutor}`,
				assignment,
			]),
		);

		const resolveRegistryParamName = (
			workId: string,
			streamExecutor: string,
			paramCode: string,
			currentName?: string | null,
		): string | null => {
			const trimmed = currentName?.trim();
			if (trimmed) return trimmed;
			const ruleName = ruleNameByWorkStreamCode.get(
				`${workId}:${streamExecutor}:${paramCode}`,
			);
			if (ruleName) return ruleName;
			return catalogNameByCode.get(paramCode) ?? null;
		};

		const enrichRegistryFormulaTokens = (
			workId: string,
			streamExecutor: string,
			tokens: ReturnType<typeof defaultWorkFormula>["tokens"],
			laborParamsGrouped: V2TypicalWorkCardDto["laborParams"],
		) => {
			const laborRefs = buildLaborRefsFromGroupedParams(laborParamsGrouped);
			const normalized = reconcileFormulaLaborParamTokens(
				normalizeWorkFormulaLaborParamTokens(tokens, laborRefs),
				laborRefs,
			);
			return normalized.map((token) => {
				if (token.kind !== "param_coeff" && token.kind !== "param_anyof") {
					return token;
				}
				const paramName = resolveRegistryParamName(
					workId,
					streamExecutor,
					token.paramCode,
					token.paramName,
				);
				return paramName ? { ...token, paramName } : token;
			});
		};

		const items = parsedConfigs
			.map(({ config, terms, tokenFormula, links: _links }) => {
				const work = workById.get(config.workId);
				const version = versionById.get(config.templateVersionId);
				if (!work || !version) return null;
				const template = templateById.get(version.templateId);
				if (!template) return null;
				if (templateFilter && template.id !== templateFilter) return null;

				const assignment =
					assignmentByWorkStream.get(
						`${config.workId}:${config.streamExecutor}`,
					) ?? null;
				const laborParamsGrouped = mergeLaborParamGroupsByIdentity(
					groupLaborByParam(
						(
							laborRowsByWorkStream.get(
								`${config.workId}:${config.streamExecutor}`,
							) ?? []
						).map(mapLaborEntity),
						laborHeadersByWorkStream.get(
							`${config.workId}:${config.streamExecutor}`,
						) ?? [],
					),
				);
				const enrichedTokens = enrichRegistryFormulaTokens(
					config.workId,
					config.streamExecutor,
					tokenFormula.tokens,
					laborParamsGrouped,
				);
				const links = assessFormulaRegistryLinks(enrichedTokens, {
					laborParams: buildLaborRefsFromGroupedParams(laborParamsGrouped),
					knownAssignmentIds: new Set(assignmentById.keys()),
				});
				const workRefs = links.workRefs.map((ref) => {
					const sourceAssignment = assignmentById.get(ref.assignmentId);
					const refWork = sourceAssignment
						? workById.get(sourceAssignment.workId)
						: undefined;
					return {
						...ref,
						workId: sourceAssignment?.workId ?? null,
						workName: refWork?.name ?? ref.workName ?? null,
					};
				});

				return {
					id: config.id,
					workId: work.id,
					workName: work.name,
					templateId: template.id,
					templateName: template.name,
					templateVersionId: version.id,
					versionNumber: version.versionNumber,
					versionStatus: version.status,
					streamExecutor: config.streamExecutor,
					assignmentId: assignment?.id ?? null,
					formulaText:
						tokensToText(enrichedTokens) ||
						tokenFormula.text ||
						terms.text ||
						"",
					formulaBadge: computeFormulaBadge(terms.terms),
					roundingMode:
						config.roundingMode as V2TypicalWorkCardDto["rounding"]["mode"],
					paramRefs: links.paramRefs.map((ref) => ({
						...ref,
						paramName:
							resolveRegistryParamName(
								config.workId,
								config.streamExecutor,
								ref.paramCode,
								ref.paramName,
							) ?? ref.paramName,
					})),
					workRefs,
					hasInvalidRefs: links.hasInvalidRefs,
					createdAt: config.createdAt.toISOString(),
					updatedAt: config.updatedAt.toISOString(),
				};
			})
			.filter((item): item is NonNullable<typeof item> => item != null);

		const templateOptions = [...templateById.values()]
			.map((template) => ({ id: template.id, name: template.name }))
			.sort((a, b) => a.name.localeCompare(b.name, "ru"));

		return { total: items.length, items, templateOptions };
	}

	private async resolveTemplateVersionIdForWorkCard(
		work: V2TypicalWorkEntity,
		workId: string,
		stream: string,
		templateVersionId?: string,
	): Promise<string | undefined> {
		const explicit = templateVersionId?.trim();
		if (explicit) return explicit;

		if (work.templateId) {
			const template = await this.templateRepository.findOne({
				where: { id: work.templateId },
				select: ["id", "currentVersionId"],
			});
			if (template?.currentVersionId) {
				return template.currentVersionId;
			}
		}

		const latestConfig = await this.versionConfigRepository.findOne({
			where: { workId, streamExecutor: stream },
			order: { updatedAt: "DESC" },
		});
		return latestConfig?.templateVersionId;
	}

	async getWorkCard(
		workId: string,
		streamExecutor: string,
		templateVersionId?: string,
	): Promise<V2TypicalWorkCardDto> {
		const work = await this.workRepository.findOne({ where: { id: workId } });
		if (!work) {
			throw new NotFoundException(`Typical work ${workId} not found`);
		}

		const stream = streamExecutor.trim();
		const resolvedVersionId = 		await this.resolveTemplateVersionIdForWorkCard(
			work,
			workId,
			stream,
			templateVersionId,
		);
		const [norms, rules, laborRows, laborParams, assignment, versionConfig] =
			await Promise.all([
				this.normRepository.find({
					where: { workId, streamExecutor: stream },
					order: { validFrom: "ASC" },
				}),
				this.ruleRepository.find({
					where: { workId, streamExecutor: stream },
					order: { sortOrder: "ASC" },
				}),
				this.laborRepository.find({
					where: { workId, streamExecutor: stream },
				}),
				this.laborParamRepository.find({
					where: { workId, streamExecutor: stream },
				}),
				this.assignmentRepository.findOne({
					where: { workId, streamExecutor: stream },
				}),
				resolvedVersionId
					? this.versionConfigRepository.findOne({
							where: {
								workId,
								templateVersionId: resolvedVersionId,
								streamExecutor: stream,
							},
						})
					: Promise.resolve(null),
			]);

		const laborParamsGrouped = mergeLaborParamGroupsByIdentity(
			groupLaborByParam(laborRows.map(mapLaborEntity), laborParams),
		);
		const termsFormula = versionConfig
			? normalizeStoredFormula(versionConfig.formula, versionConfig.formulaText)
			: normalizeStoredFormula(null);
		const tokenFormulaRaw = versionConfig
			? resolveCardTokenFormula(
					termsFormula,
					versionConfig.formulaText,
					versionConfig.formula,
				)
			: defaultWorkFormula();
		const laborRefs = buildLaborRefsFromGroupedParams(laborParamsGrouped);
		const formulaTokens = reconcileFormulaLaborParamTokens(
			normalizeWorkFormulaLaborParamTokens(tokenFormulaRaw.tokens, laborRefs),
			laborRefs,
		);
		const tokenFormula = {
			tokens: formulaTokens,
			text:
				tokensToText(formulaTokens) ||
				tokenFormulaRaw.text ||
				termsFormula.text ||
				"",
		};
		const triggerStatusCatalog =
			await this.paramCatalogService.listTriggerStatusCatalog(todayIsoDate());
		const usedOnSchemasCount = await this.countSchemaUsages(workId);

		let calculationLogic = versionConfig
			? parseStoredTypicalWorkCalculationLogic(versionConfig.calculationLogic)
			: null;
		if (
			versionConfig &&
			resolvedVersionId &&
			needsCalculationLogicBackfill(versionConfig.calculationLogic)
		) {
			const compiled = compileCalculationLogicFromVersionConfig(versionConfig);
			if (compiled) {
				versionConfig.calculationLogic = compiled;
				await this.versionConfigRepository.save(versionConfig);
				calculationLogic = compiled;
			}
		}

		return {
			id: work.id,
			name: work.name,
			archComponentType: work.archComponentType,
			workType: work.workType,
			streamExecutor: stream,
			assignmentId: assignment?.id ?? null,
			assignmentStatus: resolveAssignmentStatus(
				assignment ? [assignment] : [],
				usedOnSchemasCount,
			),
			usedOnSchemasCount,
			formulaBadge: computeFormulaBadge(termsFormula.terms),
			triggerStatus: resolveTriggerStatus(
				rules,
				triggerStatusCatalog,
				todayIsoDate(),
				mapTriggerArchCountEntity(assignment),
			),
			norms: norms.map(mapNormEntity),
			rules: rules.map(mapRuleEntity),
			triggerArchCount: mapTriggerArchCountEntity(assignment),
			laborArchCounts: mapLaborArchCountsEntity(assignment, tokenFormula),
			triggerMode:
				(assignment?.triggerMode as V2TypicalWorkCardDto["triggerMode"]) ??
				"simple",
			triggerFormula: mapTriggerFormulaEntity(assignment),
			laborParams: laborParamsGrouped,
			formulaTerms: termsFormula,
			formula: tokenFormula,
			rounding: versionConfig
				? {
						mode: versionConfig.roundingMode as V2TypicalWorkCardDto["rounding"]["mode"],
						step:
							versionConfig.roundingStep === null
								? null
								: decimalToNumber(versionConfig.roundingStep),
					}
				: defaultWorkRounding(),
			calculationLogic,
		};
	}

	/** Облегчённая карточка для schema-field-sync — без каталогов, норм и подсчётов. */
	async getWorkCardForSchemaSync(
		workId: string,
		streamExecutor: string,
		templateVersionId: string,
	): Promise<V2TypicalWorkCardDto> {
		const work = await this.workRepository.findOne({ where: { id: workId } });
		if (!work) {
			throw new NotFoundException(`Typical work ${workId} not found`);
		}

		const stream = streamExecutor.trim();
		const [rules, laborRows, laborParams, versionConfig] = await Promise.all([
			this.ruleRepository.find({
				where: { workId, streamExecutor: stream },
				order: { sortOrder: "ASC" },
			}),
			this.laborRepository.find({
				where: { workId, streamExecutor: stream },
			}),
			this.laborParamRepository.find({
				where: { workId, streamExecutor: stream },
			}),
			this.versionConfigRepository.findOne({
				where: { workId, templateVersionId, streamExecutor: stream },
			}),
		]);

		const laborParamsGrouped = mergeLaborParamGroupsByIdentity(
			groupLaborByParam(laborRows.map(mapLaborEntity), laborParams),
		);
		const termsFormula = versionConfig
			? normalizeStoredFormula(versionConfig.formula, versionConfig.formulaText)
			: normalizeStoredFormula(null);
		const tokenFormulaRaw = versionConfig
			? resolveCardTokenFormula(
					termsFormula,
					versionConfig.formulaText,
					versionConfig.formula,
				)
			: defaultWorkFormula();
		const laborRefs = buildLaborRefsFromGroupedParams(laborParamsGrouped);
		const formulaTokens = reconcileFormulaLaborParamTokens(
			normalizeWorkFormulaLaborParamTokens(tokenFormulaRaw.tokens, laborRefs),
			laborRefs,
		);
		const tokenFormula = {
			tokens: formulaTokens,
			text:
				tokensToText(formulaTokens) ||
				tokenFormulaRaw.text ||
				termsFormula.text ||
				"",
		};

		return {
			id: work.id,
			name: work.name,
			archComponentType: work.archComponentType,
			workType: work.workType,
			streamExecutor: stream,
			assignmentId: null,
			assignmentStatus: "unassigned",
			usedOnSchemasCount: 0,
			formulaBadge: computeFormulaBadge(termsFormula.terms),
			triggerStatus: "appears",
			norms: [],
			rules: rules.map(mapRuleEntity),
			laborParams: laborParamsGrouped,
			formulaTerms: termsFormula,
			formula: tokenFormula,
			rounding: versionConfig
				? {
						mode: versionConfig.roundingMode as V2TypicalWorkCardDto["rounding"]["mode"],
						step:
							versionConfig.roundingStep === null
								? null
								: decimalToNumber(versionConfig.roundingStep),
					}
				: defaultWorkRounding(),
			calculationLogic: null,
		};
	}

	/** Копирует формулы типовых работ с родительской версии шаблона на новую. */
	async copyVersionConfigsFromParent(
		templateId: string,
		parentVersionId: string,
		newVersionId: string,
	): Promise<number> {
		const works = await this.workRepository.find({
			where: { templateId },
			select: ["id"],
		});
		const workIds = works.map((work) => work.id);
		if (workIds.length === 0) return 0;

		const parentConfigs = await this.versionConfigRepository.find({
			where: { templateVersionId: parentVersionId, workId: In(workIds) },
		});
		if (parentConfigs.length === 0) return 0;

		const existingRows = await this.versionConfigRepository.find({
			where: { templateVersionId: newVersionId, workId: In(workIds) },
			select: ["workId", "streamExecutor"],
		});
		const existingKeys = new Set(
			existingRows.map((row) => `${row.workId}\0${row.streamExecutor}`),
		);

		const toCreate = parentConfigs
			.filter(
				(parent) =>
					!existingKeys.has(`${parent.workId}\0${parent.streamExecutor}`),
			)
			.map((parent) =>
				this.versionConfigRepository.create({
					workId: parent.workId,
					templateVersionId: newVersionId,
					streamExecutor: parent.streamExecutor,
					formula: parent.formula,
					formulaText: parent.formulaText,
					roundingMode: parent.roundingMode,
					roundingStep: parent.roundingStep,
					calculationLogic: parent.calculationLogic,
				}),
			);

		if (toCreate.length === 0) return 0;

		// Bulk save in chunks — avoids N+1 findOne+save that timed out behind the gateway (502).
		const CHUNK_SIZE = 100;
		for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
			await this.versionConfigRepository.save(toCreate.slice(i, i + CHUNK_SIZE));
		}

		return toCreate.length;
	}
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
	const map = new Map<string, T[]>();
	for (const item of items) {
		const key = keyFn(item);
		const list = map.get(key) ?? [];
		list.push(item);
		map.set(key, list);
	}
	return map;
}

function unique(values: string[]): string[] {
	return [...new Set(values.filter(Boolean))];
}

function resolveAssignmentStatus(
	assignments: Pick<V2TypicalWorkAssignmentEntity, "id">[],
	usedOnSchemasCount = 0,
): V2TypicalWorkAssignmentStatusDto {
	if (assignments.length === 0) return "unassigned";
	if (usedOnSchemasCount > 0) return "used_on_schemas";
	return "free";
}

function resolveTriggerStatus(
	rules: Pick<
		V2TypicalWorkRuleEntity,
		| "paramCode"
		| "paramName"
		| "operator"
		| "valueCode"
		| "valueLabel"
		| "valueCodes"
	>[],
	triggerStatusCatalog: WorkTriggerStatusCatalogParam[],
	atDate: string,
	triggerArchCount?: V2TypicalWorkCardDto["triggerArchCount"] | null,
): V2WorkTriggerStatus {
	return computeWorkTriggerStatus(
		rules.map((rule) => ({
			paramCode: rule.paramCode,
			paramName: rule.paramName,
			operator: rule.operator,
			valueCode: rule.valueCode,
			valueLabel: rule.valueLabel,
			values: rule.valueCodes ?? undefined,
		})),
		triggerStatusCatalog,
		atDate,
		undefined,
		undefined,
		triggerArchCount,
	);
}

/**
 * Для multi-stream работ (модельный стрим + children) статус списка не должен
 * зависеть от произвольного `streams[0]`: предпочитаем стрим с настроенными
 * условиями появления.
 */
function pickStreamForListTriggerStatus(
	streams: string[],
	workRules: V2TypicalWorkRuleEntity[],
	workAssignments: V2TypicalWorkAssignmentEntity[],
	triggerStatusCatalog: WorkTriggerStatusCatalogParam[],
	atDate: string,
): string | null {
	if (streams.length === 0) return null;
	let fallback: string | null = streams[0] ?? null;
	for (const stream of streams) {
		const status = resolveTriggerStatus(
			workRules.filter((rule) => rule.streamExecutor === stream),
			triggerStatusCatalog,
			atDate,
			mapTriggerArchCountEntity(
				workAssignments.find((row) => row.streamExecutor === stream),
			),
		);
		if (status === "no_triggers") continue;
		if (status === "invalid") return stream;
		fallback = stream;
	}
	return fallback;
}

function mapNormEntity(entity: V2TypicalWorkNormEntity): V2TypicalWorkNormDto {
	return {
		id: entity.id,
		streamExecutor: entity.streamExecutor,
		normValue: decimalToNumber(entity.normValue),
		validFrom: entity.validFrom,
		validTo: entity.validTo,
	};
}

function mapRuleEntity(entity: V2TypicalWorkRuleEntity): V2TypicalWorkRuleDto {
	return {
		id: entity.id,
		streamExecutor: entity.streamExecutor,
		schemaFieldUid: entity.schemaFieldUid,
		paramCode: entity.paramCode,
		paramName: entity.paramName,
		operator: entity.operator as V2TypicalWorkRuleDto["operator"],
		valueCode: entity.valueCode,
		valueLabel: entity.valueLabel,
		values: entity.valueCodes ?? undefined,
		sortOrder: entity.sortOrder,
	};
}

function mapTriggerFormulaEntity(
	assignment: V2TypicalWorkAssignmentEntity | null | undefined,
): NonNullable<V2TypicalWorkCardDto["triggerFormula"]> {
	const raw = assignment?.triggerFormula;
	if (!raw?.tokens?.length) return defaultTriggerFormula();
	return {
		tokens: raw.tokens as NonNullable<
			V2TypicalWorkCardDto["triggerFormula"]
		>["tokens"],
		text: raw.text ?? "",
	};
}

function mapTriggerArchCountEntity(
	assignment: V2TypicalWorkAssignmentEntity | null | undefined,
): NonNullable<V2TypicalWorkCardDto["triggerArchCount"]> {
	if (!assignment?.triggerArchCountKind) return defaultTriggerArchCount();
	const mapped = {
		kind: assignment.triggerArchCountKind as NonNullable<
			V2TypicalWorkCardDto["triggerArchCount"]
		>["kind"],
		steps: assignment.triggerArchCountSteps ?? [],
		combinator:
			(assignment.triggerArchCountCombinator as NonNullable<
				V2TypicalWorkCardDto["triggerArchCount"]
			>["combinator"]) ?? "and",
	};
	if (!isTriggerArchCountConfigured(mapped)) return defaultTriggerArchCount();
	return mapped;
}

function mapLaborArchCountsEntity(
	assignment: V2TypicalWorkAssignmentEntity | null | undefined,
	formula: V2TypicalWorkCardDto["formula"],
): NonNullable<V2TypicalWorkCardDto["laborArchCounts"]> {
	if (assignment?.laborArchCounts?.length) {
		return assignment.laborArchCounts.map((row) => ({
			kind: row.kind as NonNullable<
				V2TypicalWorkCardDto["laborArchCounts"]
			>[number]["kind"],
			steps: row.steps,
			paramName: row.paramName ?? null,
		}));
	}
	return extractLaborArchCountsFromFormula(formula);
}

function mapLaborEntity(
	entity: V2TypicalWorkLaborCoefficientEntity,
): V2TypicalWorkLaborCoefficientDto {
	return {
		id: entity.id,
		streamExecutor: entity.streamExecutor,
		paramCode: entity.paramCode,
		paramName: entity.paramName,
		valueCode: entity.valueCode,
		valueLabel: entity.valueLabel,
		coefficient: decimalToNumber(entity.coefficient),
	};
}

function groupLaborByParam(
	rows: V2TypicalWorkLaborCoefficientDto[],
	headers: V2TypicalWorkLaborParamEntity[],
): V2TypicalWorkCardDto["laborParams"] {
	const groups = new Map<string, V2TypicalWorkCardDto["laborParams"][number]>();
	for (const row of rows) {
		const existing = groups.get(row.paramCode);
		if (existing) {
			existing.coefficients.push(row);
			continue;
		}
		groups.set(row.paramCode, {
			paramCode: row.paramCode,
			paramName: row.paramName,
			kind: "by_value",
			coefficients: [row],
		});
	}
	for (const header of headers) {
		const existing = groups.get(header.paramCode);
		const kind = header.kind === "any_of" ? "any_of" : "by_value";
		if (existing) {
			existing.kind = kind;
			existing.schemaFieldUid = header.schemaFieldUid;
			if (kind === "any_of") {
				existing.anyOf = {
					valueCodes: header.anyOfValueCodes ?? [],
					valueLabels: header.anyOfValueLabels ?? [],
					coeffOn: decimalToNumber(header.coeffOn),
					coeffOff: decimalToNumber(header.coeffOff),
				};
			}
			continue;
		}
		groups.set(header.paramCode, {
			schemaFieldUid: header.schemaFieldUid,
			paramCode: header.paramCode,
			paramName: header.paramName,
			kind,
			coefficients: [],
			anyOf:
				kind === "any_of"
					? {
							valueCodes: header.anyOfValueCodes ?? [],
							valueLabels: header.anyOfValueLabels ?? [],
							coeffOn: decimalToNumber(header.coeffOn),
							coeffOff: decimalToNumber(header.coeffOff),
						}
					: null,
		});
	}
	return [...groups.values()];
}

function mergeLaborParamGroupsByIdentity(
	groups: V2TypicalWorkCardDto["laborParams"],
): V2TypicalWorkCardDto["laborParams"] {
	const merged = new Map<string, V2TypicalWorkCardDto["laborParams"][number]>();

	for (const group of groups) {
		const identityKey =
			group.schemaFieldUid?.trim() ||
			slugParamCode(
				stripParamNameSourceKeys(group.paramName ?? group.paramCode),
			) ||
			group.paramCode;
		const existing = merged.get(identityKey);
		if (!existing) {
			merged.set(identityKey, {
				...group,
				coefficients: [...group.coefficients],
			});
			continue;
		}

		const codes = [
			existing.paramCode,
			group.paramCode,
			...existing.coefficients.map((row) => row.paramCode),
			...group.coefficients.map((row) => row.paramCode),
		].filter((code): code is string => Boolean(code?.trim()));
		const uniqueCodes = [...new Set(codes)];
		const preferredCode =
			uniqueCodes.find((code) => code.startsWith("field_")) ??
			group.paramCode ??
			existing.paramCode;
		const displayName = stripParamNameSourceKeys(
			group.paramName ?? existing.paramName ?? preferredCode,
		).trim();

		merged.set(identityKey, {
			...existing,
			schemaFieldUid: group.schemaFieldUid ?? existing.schemaFieldUid,
			paramCode: preferredCode,
			paramName: displayName
				? formatParamNameWithSourceKeys(displayName, uniqueCodes)
				: (group.paramName ?? existing.paramName),
			kind: group.kind ?? existing.kind,
			anyOf: group.anyOf ?? existing.anyOf,
			coefficients: dedupeLaborCoefficientsByStoredValue([
				...existing.coefficients,
				...group.coefficients,
			]),
		});
	}

	return [...merged.values()];
}

type CatalogTriggerRuleLike = {
	paramName: string;
	operator: string;
	values: readonly string[];
	schemaFieldUid?: string;
};

function findExistingFactoryTriggerRule(
	workRules: V2TypicalWorkRuleEntity[],
	stream: string,
	paramCode: string,
	paramName: string,
): V2TypicalWorkRuleEntity | undefined {
	const paramNorm = normalizeParamLabel(paramName);
	const lookingForAlways = isAlwaysShownTriggerParam(paramCode, paramName);
	return workRules.find((row) => {
		if (row.streamExecutor !== stream) return false;
		if (row.paramCode === paramCode) return true;
		if (
			lookingForAlways &&
			isAlwaysShownTriggerParam(row.paramCode, row.paramName)
		) {
			return true;
		}
		const rowName = row.paramName?.trim();
		return Boolean(rowName && normalizeParamLabel(rowName) === paramNorm);
	});
}

function resolveCatalogTriggerRuleStoredValues(
	triggerRule: CatalogTriggerRuleLike,
	paramName: string,
	originalStream: string,
): {
	operator: string;
	valueCode: string | null;
	valueLabel: string | null;
	valueCodes: Array<{ code: string; label: string }> | null;
} {
	const values = triggerRule.values.length > 0 ? [...triggerRule.values] : [];
	const inferredValue =
		values[0] ?? inferTriggerValueLabel(paramName, originalStream);
	const operator =
		triggerRule.operator === "exists" ? "=" : triggerRule.operator;

	if (values.length > 1) {
		return {
			operator,
			valueCode: null,
			valueLabel: null,
			valueCodes: values.map((label) => {
				const stored = resolveCatalogTriggerStoredValue(label);
				return { code: stored.valueCode, label: stored.valueLabel };
			}),
		};
	}

	if (!inferredValue) {
		return {
			operator,
			valueCode: null,
			valueLabel: null,
			valueCodes: null,
		};
	}

	const stored = resolveCatalogTriggerStoredValue(inferredValue);
	return {
		operator,
		valueCode: stored.valueCode,
		valueLabel: stored.valueLabel,
		valueCodes: null,
	};
}

/**
 * Условия появления для диффа builtin-эталона (без записи в БД) —
 * та же логика, что seedRegistryWorkNormsAndCatalog для одного стрима.
 */
function buildFactoryDiffTriggersForStream(
	catalogRows: V2FactoryTypicalWork[],
	stream: string,
	registryStreams: readonly string[],
): {
	rules: V2TypicalWorkRuleDto[];
	triggerArchCount: NonNullable<V2TypicalWorkCardDto["triggerArchCount"]>;
} {
	const rules: V2TypicalWorkRuleDto[] = [];
	const seenRuleKeys = new Set<string>();
	let triggerArchCount = defaultTriggerArchCount();

	for (const row of catalogRows) {
		const applyStreams = resolveCatalogApplyStreams(row.stream, registryStreams);
		if (!applyStreams.includes(stream)) continue;

		const originalStream = row.stream.trim();
		const triggerRules = row.triggerRules?.length
			? row.triggerRules
			: row.triggerParams.map((paramName) => ({
					paramName,
					operator: "exists" as const,
					values: [] as string[],
				}));

		for (const triggerRule of triggerRules) {
			if (triggerRule.operator === "unresolved") continue;
			const trimmed = triggerRule.paramName.trim();
			if (!trimmed) continue;
			if (isArchCountLaborParamName(trimmed)) {
				const arch =
					row.triggerArchCount ??
					resolveArchCountLaborFromCatalog(trimmed);
				if (arch?.kind && arch.steps.length > 0) {
					triggerArchCount = {
						kind: arch.kind as NonNullable<
							V2TypicalWorkCardDto["triggerArchCount"]
						>["kind"],
						steps: arch.steps,
						combinator: row.triggerArchCount?.combinator ?? "and",
					};
				}
				continue;
			}
			const paramCode = resolveCatalogTriggerParamCode(row, trimmed);
			const ruleKey = `${paramCode}`;
			if (seenRuleKeys.has(ruleKey)) continue;
			seenRuleKeys.add(ruleKey);

			const stored = resolveCatalogTriggerRuleStoredValues(
				triggerRule,
				trimmed,
				originalStream,
			);
			const alwaysTrigger = isAlwaysShownTriggerParam(paramCode, trimmed);
			rules.push({
				id: `${paramCode}`,
				streamExecutor: stream,
				schemaFieldUid: null,
				paramCode,
				paramName: alwaysTrigger
					? V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_NAME
					: trimmed,
				operator: stored.operator as V2TypicalWorkRuleDto["operator"],
				valueCode: alwaysTrigger ? null : stored.valueCode,
				valueLabel: alwaysTrigger ? null : stored.valueLabel,
				values: alwaysTrigger
					? undefined
					: (stored.valueCodes ?? undefined),
				sortOrder: rules.length,
			});
		}

		if (row.triggerArchCount?.kind && row.triggerArchCount.steps.length > 0) {
			triggerArchCount = {
				kind: row.triggerArchCount.kind as NonNullable<
					V2TypicalWorkCardDto["triggerArchCount"]
				>["kind"],
				steps: row.triggerArchCount.steps,
				combinator: row.triggerArchCount.combinator ?? "and",
			};
		}
	}

	return { rules, triggerArchCount };
}

function buildFactoryDiffLaborAndFormulaForStream(
	catalogRows: V2FactoryTypicalWork[],
	stream: string,
	registryStreams: readonly string[],
	normsByStream: Record<string, number | null>,
): {
	laborParams: V2TypicalWorkCardDto["laborParams"];
	laborArchCounts: NonNullable<V2TypicalWorkCardDto["laborArchCounts"]>;
	formula: ReturnType<typeof defaultWorkFormula>;
	rounding: ReturnType<typeof defaultWorkRounding>;
	norms: V2TypicalWorkNormDto[];
} {
	const laborByCode = new Map<
		string,
		V2TypicalWorkCardDto["laborParams"][number]
	>();
	const laborArchCounts: NonNullable<V2TypicalWorkCardDto["laborArchCounts"]> =
		[];

	for (const row of catalogRows) {
		const applyStreams = resolveCatalogApplyStreams(row.stream, registryStreams);
		if (!applyStreams.includes(stream)) continue;

		const laborSplit = splitCatalogLaborArchCounts({
			laborParams: row.laborParams,
			laborCoefficients: row.laborCoefficients,
		});
		const catalogLaborArch =
			row.laborArchCounts?.map((arch) => ({
				kind: arch.kind as NonNullable<
					V2TypicalWorkCardDto["laborArchCounts"]
				>[number]["kind"],
				steps: arch.steps,
				paramName: arch.paramName ?? null,
			})) ?? laborSplit.laborArchCounts;

		for (const arch of catalogLaborArch) {
			if (laborArchCounts.some((item) => item.kind === arch.kind)) continue;
			laborArchCounts.push(arch);
		}

		for (const paramName of laborSplit.laborParams) {
			const trimmed = paramName.trim();
			if (!trimmed || isArchCountLaborParamName(trimmed)) continue;
			const coefficientGroup = findCatalogLaborParamGroup(row, trimmed);
			const paramCode =
				coefficientGroup?.paramCode?.trim() || slugParamCode(trimmed);
			if (laborByCode.has(paramCode)) continue;

			const isAnyOf =
				coefficientGroup?.kind === "any_of" &&
				coefficientGroup.anyOf != null;
			if (isAnyOf && coefficientGroup?.anyOf) {
				laborByCode.set(paramCode, {
					schemaFieldUid: coefficientGroup.schemaFieldUid?.trim() || null,
					paramCode,
					paramName: trimmed,
					kind: "any_of",
					coefficients: [],
					anyOf: {
						valueCodes: [...coefficientGroup.anyOf.valueCodes],
						valueLabels: [...coefficientGroup.anyOf.valueLabels],
						coeffOn: coefficientGroup.anyOf.coeffOn,
						coeffOff: coefficientGroup.anyOf.coeffOff,
					},
				});
				continue;
			}

			const values = coefficientGroup?.values ?? [];
			laborByCode.set(paramCode, {
				schemaFieldUid: coefficientGroup?.schemaFieldUid?.trim() || null,
				paramCode,
				paramName: trimmed,
				kind: "by_value",
				coefficients: values.map((value, index) => ({
					id: `${paramCode}-${index}`,
					streamExecutor: stream,
					paramCode,
					paramName: trimmed,
					valueCode: slugParamCode(value.label),
					valueLabel: value.label,
					coefficient: value.coefficient ?? 1,
				})),
			});
		}
	}

	const { formula, rounding } = resolveSeedVersionConfigFormula(
		catalogRows,
		stream,
		registryStreams,
	);

	const registryNorm =
		normsByStream[stream] ??
		Object.values(normsByStream).find((value) => value != null) ??
		null;
	const norms: V2TypicalWorkNormDto[] =
		registryNorm != null
			? [
					{
						id: `norm-${stream}`,
						streamExecutor: stream,
						normValue: registryNorm,
						validFrom: DEFAULT_NORM_VALID_FROM,
						validTo: null,
					},
				]
			: [];

	return {
		laborParams: [...laborByCode.values()],
		laborArchCounts,
		formula,
		rounding,
		norms,
	};
}

function buildLaborRefsFromGroupedParams(
	groups: V2TypicalWorkCardDto["laborParams"],
): WorkFormulaLaborParamRef[] {
	return groups.map((group) => {
		const aliasCodes = [
			group.paramCode,
			...group.coefficients.map((row) => row.paramCode),
			slugParamCode(stripParamNameSourceKeys(group.paramName ?? "")),
		].filter((code): code is string => Boolean(code?.trim()));
		const uniqueCodes = [...new Set(aliasCodes)];
		const displayName = stripParamNameSourceKeys(
			group.paramName ?? group.paramCode,
		).trim();
		return {
			paramCode: group.paramCode,
			paramName: displayName
				? formatParamNameWithSourceKeys(displayName, uniqueCodes)
				: (group.paramName ?? null),
		};
	});
}
