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
	resolveActiveNormOnDate,
	compileStoredTypicalWorkResultLogic,
	tokensToText,
	computeFormulaBadge,
	normalizeStoredFormula,
	resolveVersionConfigTokenFormula,
	termsToTokenFormula,
	extractFormulaRegistryLinks,
	normalizeWorkFormulaLaborParamTokens,
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
	groupCatalogWorks,
	inferTriggerValueLabel,
	normalizeArchComponentType,
	resolveCatalogWorkComponent,
	slugParamCode,
} from "../utils/v2-typical-work-catalog.util";
import { V2_FACTORY_TEMPLATE_TYPICAL_WORKS_REGISTRY } from "../constants/v2-factory-template-typical-works-registry";
import type { V2FactoryTypicalWork } from "../constants/v2-factory-typical-works-catalog";
import { V2TypicalWorkParamCatalogService } from "./v2-typical-work-param-catalog.service";

function decimalToNumber(value: string | number | null | undefined): number {
	if (value === null || value === undefined) return 0;
	return typeof value === "number" ? value : Number(value);
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

@Injectable()
export class V2TypicalWorkSeedService implements OnModuleInit {
	private readonly logger = new Logger(V2TypicalWorkSeedService.name);

	constructor(
		@InjectRepository(V2TypicalWorkEntity)
		private readonly workRepository: Repository<V2TypicalWorkEntity>,
		@InjectRepository(V2TypicalWorkNormEntity)
		private readonly normRepository: Repository<V2TypicalWorkNormEntity>,
		@InjectRepository(V2TypicalWorkRuleEntity)
		private readonly ruleRepository: Repository<V2TypicalWorkRuleEntity>,
		@InjectRepository(V2TypicalWorkLaborCoefficientEntity)
		private readonly laborRepository: Repository<V2TypicalWorkLaborCoefficientEntity>,
		@InjectRepository(V2TypicalWorkAssignmentEntity)
		private readonly assignmentRepository: Repository<V2TypicalWorkAssignmentEntity>,
		@InjectRepository(V2TypicalWorkVersionConfigEntity)
		private readonly versionConfigRepository: Repository<V2TypicalWorkVersionConfigEntity>,
		@InjectRepository(V2TemplateVersionEntity)
		private readonly templateVersionRepository: Repository<V2TemplateVersionEntity>,
		@InjectRepository(V2TemplateEntity)
		private readonly templateRepository: Repository<V2TemplateEntity>,
		private readonly paramCatalogService: V2TypicalWorkParamCatalogService,
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

		for (const entry of V2_FACTORY_TEMPLATE_TYPICAL_WORKS_REGISTRY.works) {
			let workId = entry.id.trim();
			const existingById = await this.workRepository.findOne({
				where: { id: workId },
			});
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

			const streams = await this.seedRegistryWorkNormsAndCatalog(
				work.id,
				entry,
				findCatalogRowsForRegistryWork(entry, catalogGroups),
				paramsByName,
			);

			for (const stream of streams) {
				await this.ensureWorkVersionConfig(work.id, trimmedVersionId, stream);
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

		const uiSchema = version.uiSchema as Record<string, unknown>;
		const next = backfillTypicalWorkBoundWorkIdsInUiSchema(uiSchema, catalog);
		if (JSON.stringify(next) === JSON.stringify(uiSchema)) return;

		version.uiSchema = next;
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
	): Promise<void> {
		const stream = streamExecutor.trim();
		const existing = await this.versionConfigRepository.findOne({
			where: { workId, templateVersionId, streamExecutor: stream },
		});
		if (existing) return;

		const formula = defaultWorkFormula();
		const rounding = defaultWorkRounding();
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
		const streams = new Set<string>();

		for (const rawStream of entry.streams) {
			const stream = canonicalizeWorkStream(rawStream.trim());
			if (!stream) continue;
			streams.add(stream);
			await this.ensureWorkStreamAssignment(workId, stream);

			const registryNorm =
				entry.normsByStream[rawStream] ?? entry.normsByStream[stream];
			if (registryNorm != null) {
				const normKey = `${stream}|${registryNorm}`;
				if (!seenNormKeys.has(normKey)) {
					seenNormKeys.add(normKey);
					await this.normRepository.save(
						this.normRepository.create({
							workId,
							streamExecutor: stream,
							normValue: String(registryNorm),
							validFrom: DEFAULT_NORM_VALID_FROM,
							validTo: null,
						}),
					);
				}
			}
		}

		for (const row of catalogRows) {
			const originalStream = row.stream.trim();
			const stream = canonicalizeWorkStream(originalStream);
			streams.add(stream);
			await this.ensureWorkStreamAssignment(workId, stream);

			if (row.norm !== null) {
				const normKey = `${stream}|${row.norm}`;
				if (!seenNormKeys.has(normKey)) {
					seenNormKeys.add(normKey);
					await this.normRepository.save(
						this.normRepository.create({
							workId,
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
						workId,
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
							workId,
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
							workId,
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

		return streams;
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

		for (const work of works) {
			const streams = assignmentsByWork.get(work.id) ?? [];
			for (const stream of streams) {
				await this.ensureWorkVersionConfig(work.id, templateVersionId, stream);
			}
		}
	}

	/** Дефолтная формула H для всех работ на текущей опубликованной версии шаблона. */
	async ensureFactoryVersionConfigs(): Promise<void> {
		const activeTemplate = await this.templateRepository.findOne({
			where: { currentVersionId: Not(IsNull()) },
			order: { updatedAt: "DESC" },
		});
		const templateVersionId = activeTemplate?.currentVersionId;
		if (!templateVersionId) return;

		const version = await this.templateVersionRepository.findOne({
			where: { id: templateVersionId },
		});
		if (!version) return;

		const works = await this.workRepository.find();
		if (works.length === 0) return;

		const existing = await this.versionConfigRepository.find({
			where: { templateVersionId },
		});
		const existingWorkIds = new Set(existing.map((row) => row.workId));
		const formula = defaultWorkFormula();
		const rounding = defaultWorkRounding();
		const compiled = compileStoredTypicalWorkResultLogic(formula, rounding);
		let created = 0;

		for (const work of works) {
			if (existingWorkIds.has(work.id)) continue;
			await this.versionConfigRepository.save(
				this.versionConfigRepository.create({
					workId: work.id,
					templateVersionId,
					formula: formula.tokens,
					formulaText: formula.text || tokensToText(formula.tokens),
					roundingMode: rounding.mode,
					roundingStep:
						rounding.mode === "NONE" ? null : String(rounding.step ?? 0.1),
					calculationLogic: compiled,
				}),
			);
			created++;
		}

		if (created > 0) {
			this.logger.log(
				`Seeded ${created} typical work version configs for template version ${templateVersionId}`,
			);
		}
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
						: (streams[0] ?? streamFilter ?? "");

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
		const versionIds = unique(configs.map((config) => config.templateVersionId));
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

		const [works, versions, assignmentsForWorks, assignmentsForRefs, laborRows, laborParamHeaders, rules, paramCatalog] =
			await Promise.all([
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
		const versionById = new Map(versions.map((version) => [version.id, version]));
		const templateById = new Map(templates.map((template) => [template.id, template]));
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
		) => {
			const laborParamsGrouped = groupLaborByParam(
				(laborRowsByWorkStream.get(`${workId}:${streamExecutor}`) ?? []).map(
					mapLaborEntity,
				),
				laborHeadersByWorkStream.get(`${workId}:${streamExecutor}`) ?? [],
			);
			const normalized = normalizeWorkFormulaLaborParamTokens(
				tokens,
				laborParamsGrouped,
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
				const enrichedTokens = enrichRegistryFormulaTokens(
					config.workId,
					config.streamExecutor,
					tokenFormula.tokens,
				);
				const links = extractFormulaRegistryLinks(enrichedTokens);
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
					formulaText: tokenFormula.text || terms.text || "",
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
		const resolvedVersionId = await this.resolveTemplateVersionIdForWorkCard(
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

		const laborParamsGrouped = groupLaborByParam(
			laborRows.map(mapLaborEntity),
			laborParams,
		);
		const termsFormula = versionConfig
			? normalizeStoredFormula(versionConfig.formula, versionConfig.formulaText)
			: normalizeStoredFormula(null);
		const tokenFormula = versionConfig
			? resolveCardTokenFormula(
					termsFormula,
					versionConfig.formulaText,
					versionConfig.formula,
				)
			: defaultWorkFormula();
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
			),
			norms: norms.map(mapNormEntity),
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

		const laborParamsGrouped = groupLaborByParam(
			laborRows.map(mapLaborEntity),
			laborParams,
		);
		const termsFormula = versionConfig
			? normalizeStoredFormula(versionConfig.formula, versionConfig.formulaText)
			: normalizeStoredFormula(null);
		const tokenFormula = versionConfig
			? resolveCardTokenFormula(
					termsFormula,
					versionConfig.formulaText,
					versionConfig.formula,
				)
			: defaultWorkFormula();

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
		const works = await this.workRepository.find({ where: { templateId } });
		const workIds = works.map((work) => work.id);
		if (workIds.length === 0) return 0;

		const parentConfigs = await this.versionConfigRepository.find({
			where: { templateVersionId: parentVersionId, workId: In(workIds) },
		});

		let copied = 0;
		for (const parent of parentConfigs) {
			const existing = await this.versionConfigRepository.findOne({
				where: {
					templateVersionId: newVersionId,
					workId: parent.workId,
					streamExecutor: parent.streamExecutor,
				},
			});
			if (existing) continue;

			await this.versionConfigRepository.save(
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
			copied += 1;
		}

		return copied;
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
	);
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
