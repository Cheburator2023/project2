import { Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Not, In, Repository } from "typeorm";
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
} from "@smart-anketa/api-contract";
import {
	defaultWorkFormula,
	defaultWorkRounding,
	computeWorkTriggerStatus,
	compileCalculationLogicFromVersionConfig,
	needsCalculationLogicBackfill,
	parseStoredTypicalWorkCalculationLogic,
	resolveActiveNormOnDate,
	compileStoredTypicalWorkResultLogic,
	tokensToText,
	parseWorkFormulaText,
	computeFormulaBadge,
	normalizeStoredFormula,
	termsToTokenFormula,
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
	DEFAULT_NORM_VALID_FROM,
	groupCatalogWorks,
	inferTriggerValueLabel,
	normalizeArchComponentType,
	slugParamCode,
} from "../utils/v2-typical-work-catalog.util";
import { V2TypicalWorkParamCatalogService } from "./v2-typical-work-param-catalog.service";

function decimalToNumber(value: string | number | null | undefined): number {
	if (value === null || value === undefined) return 0;
	return typeof value === "number" ? value : Number(value);
}

function resolveCardTokenFormula(
	termsFormula: ReturnType<typeof normalizeStoredFormula>,
	formulaText: string | null | undefined,
): ReturnType<typeof defaultWorkFormula> {
	const trimmed = formulaText?.trim();
	if (trimmed) {
		const parsed = parseWorkFormulaText(trimmed);
		if (!parsed.error && parsed.tokens.length > 0) {
			return { tokens: parsed.tokens, text: trimmed };
		}
	}
	return termsToTokenFormula(termsFormula);
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
		@InjectRepository(V2TypicalWorkVersionConfigEntity)
		private readonly versionConfigRepository: Repository<V2TypicalWorkVersionConfigEntity>,
		@InjectRepository(V2TemplateVersionEntity)
		private readonly templateVersionRepository: Repository<V2TemplateVersionEntity>,
		@InjectRepository(V2TemplateEntity)
		private readonly templateRepository: Repository<V2TemplateEntity>,
		private readonly paramCatalogService: V2TypicalWorkParamCatalogService,
	) {}

	async onModuleInit(): Promise<void> {
		await this.paramCatalogService.ensureSeededFromDocCatalog();
		await this.purgeDocCatalogSeededWorks();
		const count = await this.workRepository.count();
		if (count > 0) {
			this.logger.log(
				`Typical works catalog: ${count} works (auto-seed from doc catalog disabled)`,
			);
			await this.ensureFactoryVersionConfigs();
			return;
		}
		this.logger.log(
			"Typical works catalog is empty — add works via constructor Logic or admin panel",
		);
	}

	/** Удаляет работы, автоматически залитые из doc-каталога (catalog_key), чтобы каталог начинался с нуля. */
	async purgeDocCatalogSeededWorks(): Promise<void> {
		const legacy = await this.workRepository.find({
			where: { catalogKey: Not(IsNull()) },
		});
		if (legacy.length === 0) return;

		const ids = legacy.map((row) => row.id);
		await this.workRepository.delete(ids);
		this.logger.log(
			`Purged ${legacy.length} doc-catalog typical works — use constructor Logic to add works`,
		);
	}

	async seedFromDocCatalog(): Promise<void> {
		await this.paramCatalogService.ensureSeededFromDocCatalog();
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
					archComponentType: normalizeArchComponentType(first.component),
					workType: first.workType?.trim() || null,
					catalogKey,
				}),
			);

			const seenNormKeys = new Set<string>();
			const seenRuleKeys = new Set<string>();
			const seenLaborKeys = new Set<string>();

			for (const row of rows) {
				const stream = row.stream.trim();

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

					const valueLabel = inferTriggerValueLabel(trimmed, stream);
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
		private readonly paramCatalogService: V2TypicalWorkParamCatalogService,
	) {}

	private async resolveTemplateIdFilter(
		query: { templateId?: string; templateVersionId?: string },
	): Promise<string | undefined> {
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
		const works = await this.workRepository.find({ where: { id: In(workIds) } });
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
					const terms = normalizeStoredFormula(config.formula, config.formulaText);
					formulaBadge = computeFormulaBadge(terms.terms);
				}
			}

			const assignmentRules =
				rulesByKey.get(`${assignment.workId}|${assignment.streamExecutor}`) ?? [];

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
						: streams[0] ?? streamFilter ?? "";

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
					? normsByStream[streamForStatus] ?? null
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
			templateVersionId
				? this.versionConfigRepository.findOne({
						where: { workId, templateVersionId, streamExecutor: stream },
					})
				: Promise.resolve(null),
		]);

		const laborParamsGrouped = groupLaborByParam(
			laborRows.map(mapLaborEntity),
			laborParams,
		);
		const termsFormula = versionConfig
			? normalizeStoredFormula(
					versionConfig.formula,
					versionConfig.formulaText,
				)
			: normalizeStoredFormula(null);
		const tokenFormula = versionConfig
			? resolveCardTokenFormula(termsFormula, versionConfig.formulaText)
			: defaultWorkFormula();
		const triggerStatusCatalog =
			await this.paramCatalogService.listTriggerStatusCatalog(todayIsoDate());
		const usedOnSchemasCount = await this.countSchemaUsages(workId);

		let calculationLogic = versionConfig
			? parseStoredTypicalWorkCalculationLogic(versionConfig.calculationLogic)
			: null;
		if (
			versionConfig &&
			templateVersionId &&
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
		"paramCode" | "paramName" | "operator" | "valueCode" | "valueLabel" | "valueCodes"
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
