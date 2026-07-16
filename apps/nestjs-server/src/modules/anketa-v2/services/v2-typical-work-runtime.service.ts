import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import {
	CONTROL_MODELS_STREAM,
	applyWorkRounding,
	buildTypicalWorkFactorCoeffResolver,
	computeTypicalWorkFormulaTotal,
	defaultWorkRounding,
	formatTypicalWorkCoefficientDisplay,
	isWorkCoefficientValueAvailable,
	normalizeStoredFormula,
	buildLaborCoefficientLookupSource,
	parseStoredTypicalWorkCalculationLogic,
	resolveActiveNormOnDate,
	resolveByValueLaborParamCoefficients,
	resolveLaborAnyOfCoefficient,
	resolveStreamFromSourceType,
	matchTypicalWorkTriggers,
	type TypicalWorkTriggerMatchInput,
	buildWorkSchemaParamsFromTemplate,
	remapLaborCoefficientRowsForSchema,
	resolveWorkSchemaParamForRule,
	type TypicalWorkAnyOfLaborParamLike,
	type TypicalWorkRuleLike,
	type TypicalWorkTriggerArchCountLike,
	type V2TypicalWorkRoundingDto,
	type WorkSchemaParamDef,
} from "@smart-anketa/api-contract";
import { V2TypicalWorkAssignmentEntity } from "../entities/v2-typical-work-assignment.entity";
import { V2TypicalWorkLaborCoefficientEntity } from "../entities/v2-typical-work-labor-coefficient.entity";
import { V2TypicalWorkLaborParamEntity } from "../entities/v2-typical-work-labor-param.entity";
import { V2TypicalWorkNormEntity } from "../entities/v2-typical-work-norm.entity";
import { V2TypicalWorkRuleEntity } from "../entities/v2-typical-work-rule.entity";
import { V2TypicalWorkVersionConfigEntity } from "../entities/v2-typical-work-version-config.entity";
import { V2TypicalWorkEntity } from "../entities/v2-typical-work.entity";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";
import { V2TypicalWorkParamCatalogService } from "./v2-typical-work-param-catalog.service";

export type CatalogGeneratedTask = {
	taskCode: string;
	name: string;
	workType: string;
	reason: string;
	estimateHoursPerDay: number;
	coefficient: number;
	/** Развёрнутое представление коэффициента для таблицы анкеты. */
	coefficientDisplay?: string;
	/** Итог по формуле работы (чел.-дн.), до записи в анкету. */
	total: number;
	match: Record<string, unknown>;
	workId: string;
};

export type BuildCatalogTasksParams = {
	archComponentType: string;
	streamExecutor: string;
	source: Record<string, unknown>;
	/** Полный formData анкеты — для arch_count_coeff в формулах. */
	formData?: Record<string, unknown>;
	templateVersionId: string | null;
	templateId?: string | null;
	atDate: string;
	hiddenParamCodes?: ReadonlySet<string>;
	/** Ограничение списка работ блока typicalWork; undefined — все назначенные. */
	allowedWorkIds?: readonly string[];
};

type RuntimeWorkContext = {
	work: V2TypicalWorkEntity;
	stream: string;
	atDate: string;
	source: Record<string, unknown>;
	formData: Record<string, unknown>;
	normValue: number;
	rules: TypicalWorkRuleLike[];
	laborRows: V2TypicalWorkLaborCoefficientEntity[];
	laborParams: V2TypicalWorkLaborParamEntity[];
	config: V2TypicalWorkVersionConfigEntity | undefined;
	assignmentByWorkId: Map<string, V2TypicalWorkAssignmentEntity>;
	coefficientValueCatalog: Awaited<
		ReturnType<V2TypicalWorkParamCatalogService["listTriggerStatusCatalog"]>
	>;
	hiddenParamCodes?: ReadonlySet<string>;
	schemaParams: WorkSchemaParamDef[];
};

function decimalToNumber(value: string | number | null | undefined): number {
	if (value === null || value === undefined) return 0;
	return typeof value === "number" ? value : Number(value);
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

function mapRuleEntity(rule: V2TypicalWorkRuleEntity): TypicalWorkRuleLike {
	return {
		paramCode: rule.paramCode,
		paramName: rule.paramName,
		operator: rule.operator,
		valueCode: rule.valueCode,
		valueLabel: rule.valueLabel,
		values: rule.valueCodes ?? undefined,
	};
}

function mapTriggerArchCountFromAssignment(
	assignment: V2TypicalWorkAssignmentEntity | undefined,
): TypicalWorkTriggerArchCountLike | null {
	if (!assignment?.triggerArchCountKind) return null;
	return {
		kind: assignment.triggerArchCountKind as TypicalWorkTriggerArchCountLike["kind"],
		steps: assignment.triggerArchCountSteps ?? [],
		combinator:
			(assignment.triggerArchCountCombinator as TypicalWorkTriggerArchCountLike["combinator"]) ??
			"and",
	};
}

function resolveParamCoefficients(ctx: RuntimeWorkContext): Record<string, number> {
	const paramCoefficients: Record<string, number> = {};
	const laborParamsByCode = new Map(
		ctx.laborParams.map((row) => [row.paramCode, row]),
	);
	const laborParamCodes = [
		...new Set([
			...ctx.laborParams.map((row) => row.paramCode),
			...ctx.laborRows.map((row) => row.paramCode),
		]),
	];
	const lookupSource = buildLaborCoefficientLookupSource(
		ctx.source,
		ctx.formData,
		ctx.schemaParams,
		laborParamCodes,
	);

	for (const header of ctx.laborParams) {
		if (header.kind !== "any_of") continue;
		const resolved = resolveWorkSchemaParamForRule(header, ctx.schemaParams);
		const paramCode = resolved?.code ?? header.paramCode;
		const paramName = resolved?.name ?? header.paramName;
		paramCoefficients[header.paramCode] = resolveLaborAnyOfCoefficient(
			lookupSource,
			paramCode,
			{
				valueCodes: header.anyOfValueCodes ?? [],
				valueLabels: header.anyOfValueLabels ?? [],
				coeffOn: decimalToNumber(header.coeffOn),
				coeffOff: decimalToNumber(header.coeffOff),
			},
			paramName,
		);
		if (paramCode !== header.paramCode) {
			paramCoefficients[paramCode] = paramCoefficients[header.paramCode]!;
		}
	}

	const byValueRows: Array<{
		paramCode: string;
		paramName: string | null;
		valueCode: string | null;
		valueLabel: string | null;
		coefficient: number;
	}> = [];
	for (const row of ctx.laborRows) {
		if (ctx.hiddenParamCodes?.has(row.paramCode)) continue;
		const header = laborParamsByCode.get(row.paramCode);
		if (header?.kind === "any_of") continue;
		if (
			!isWorkCoefficientValueAvailable(
				row,
				ctx.coefficientValueCatalog,
				ctx.atDate,
			)
		) {
			continue;
		}
		byValueRows.push({
			paramCode: row.paramCode,
			paramName: row.paramName,
			valueCode: row.valueCode,
			valueLabel: row.valueLabel,
			coefficient: decimalToNumber(row.coefficient),
		});
	}
	const remappedRows = remapLaborCoefficientRowsForSchema(
		byValueRows,
		ctx.schemaParams,
	);
	const resolvedCoeffs = resolveByValueLaborParamCoefficients(
		lookupSource,
		remappedRows,
	);
	for (let index = 0; index < byValueRows.length; index++) {
		const original = byValueRows[index]!;
		const remapped = remappedRows[index]!;
		const value = resolvedCoeffs[remapped.paramCode];
		if (value === undefined) continue;
		paramCoefficients[remapped.paramCode] = value;
		if (remapped.paramCode !== original.paramCode) {
			paramCoefficients[original.paramCode] = value;
		}
	}

	return paramCoefficients;
}

function listAnyOfLaborParams(
	laborParams: V2TypicalWorkLaborParamEntity[],
): TypicalWorkAnyOfLaborParamLike[] {
	return laborParams
		.filter((header) => header.kind === "any_of")
		.map((header) => ({
			paramCode: header.paramCode,
			paramName: header.paramName,
			anyOf: {
				valueCodes: header.anyOfValueCodes ?? [],
				valueLabels: header.anyOfValueLabels ?? [],
				coeffOn: decimalToNumber(header.coeffOn),
				coeffOff: decimalToNumber(header.coeffOff),
			},
		}));
}

function resolveRounding(
	config: V2TypicalWorkVersionConfigEntity | undefined,
): V2TypicalWorkRoundingDto {
	if (!config) return defaultWorkRounding();
	return {
		mode: config.roundingMode as V2TypicalWorkRoundingDto["mode"],
		step: config.roundingStep == null ? null : decimalToNumber(config.roundingStep),
	};
}

@Injectable()
export class V2TypicalWorkRuntimeService {
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
		private readonly paramCatalogService: V2TypicalWorkParamCatalogService,
	) {}

	async buildSourceCatalogTasks(
		source: Record<string, unknown>,
		templateVersionId: string | null,
		atDate: string,
	): Promise<CatalogGeneratedTask[]> {
		const stream = resolveStreamFromSourceType(source);
		if (!stream) return [];
		return this.buildCatalogTasks({
			archComponentType: "Система-источник",
			streamExecutor: stream,
			source,
			templateVersionId,
			atDate,
		});
	}

	async buildCatalogTasks(
		params: BuildCatalogTasksParams,
	): Promise<CatalogGeneratedTask[]> {
		const stream = params.streamExecutor.trim();
		const archComponentType = params.archComponentType.trim();
		if (!stream || !archComponentType) return [];
		if (params.allowedWorkIds?.length === 0) return [];

		const assignments = await this.assignmentRepository.find({
			where: { streamExecutor: stream, isActive: true },
		});
		const assignedWorkIds = new Set(assignments.map((a) => a.workId));
		if (assignedWorkIds.size === 0) return [];

		const allowedWorkIds = params.allowedWorkIds;
		const workWhere =
			allowedWorkIds === undefined
				? { archComponentType }
				: { id: In([...allowedWorkIds]) };
		let works = await this.workRepository.find({
			where: {
				...workWhere,
				...(params.templateId
					? { templateId: params.templateId }
					: {}),
			},
		});
		if (!works.length && params.templateId) {
			works = await this.workRepository.find({
				where: { ...workWhere, templateId: IsNull() },
			});
		}
		const eligibleWorks = works.filter((w) => assignedWorkIds.has(w.id));
		if (!eligibleWorks.length) return [];

		const filteredWorks =
			allowedWorkIds === undefined
				? eligibleWorks
				: allowedWorkIds.length === 0
					? []
					: eligibleWorks.filter((w) => allowedWorkIds.includes(w.id));
		if (!filteredWorks.length) return [];

		const workIds = filteredWorks.map((w) => w.id);
		const [norms, rules, labor, laborParams, allConfigs] = await Promise.all([
			this.normRepository.find({
				where: { workId: In(workIds), streamExecutor: stream },
			}),
			this.ruleRepository.find({
				where: { workId: In(workIds), streamExecutor: stream },
			}),
			this.laborRepository.find({
				where: { workId: In(workIds), streamExecutor: stream },
			}),
			this.laborParamRepository.find({
				where: { workId: In(workIds), streamExecutor: stream },
			}),
			params.templateVersionId
				? this.versionConfigRepository.find({
						where: {
							workId: In(workIds),
							templateVersionId: params.templateVersionId,
							streamExecutor: stream,
						},
					})
				: Promise.resolve([]),
		]);

		const normsByWork = groupBy(norms, (n) => n.workId);
		const rulesByWork = groupBy(rules, (r) => r.workId);
		const laborByWork = groupBy(labor, (l) => l.workId);
		const laborParamsByWork = groupBy(laborParams, (l) => l.workId);
		const configByWork = new Map(
			allConfigs.map((config) => [config.workId, config] as const),
		);
		const assignmentByWorkId = new Map(
			assignments.map((a) => [a.workId, a]),
		);
		const assignmentById = new Map(assignments.map((a) => [a.id, a]));
		const coefficientValueCatalog =
			await this.paramCatalogService.listTriggerStatusCatalog(params.atDate);
		const schemaParams = await this.loadSchemaParams(params.templateVersionId);

		const contexts = new Map<string, RuntimeWorkContext>();
		for (const work of filteredWorks) {
			const workNorms = normsByWork.get(work.id) ?? [];
			const normValue = resolveActiveNormOnDate(
				workNorms.map((n) => ({
					streamExecutor: n.streamExecutor,
					normValue: decimalToNumber(n.normValue),
					validFrom: n.validFrom,
					validTo: n.validTo,
				})),
				stream,
				params.atDate,
			);
			if (normValue == null) continue;

			const workRules = (rulesByWork.get(work.id) ?? []).map(mapRuleEntity);
			const triggerInput: TypicalWorkTriggerMatchInput = {
				mode:
					(assignmentByWorkId.get(work.id)?.triggerMode as TypicalWorkTriggerMatchInput["mode"]) ??
					"simple",
				rules: workRules,
				triggerArchCount: mapTriggerArchCountFromAssignment(
					assignmentByWorkId.get(work.id),
				),
				triggerFormula:
					(assignmentByWorkId.get(work.id)?.triggerFormula as TypicalWorkTriggerMatchInput["triggerFormula"]) ??
					null,
			};
			if (
				!matchTypicalWorkTriggers(
					triggerInput,
					params.source,
					params.formData ?? params.source,
				)
			) {
				continue;
			}

			contexts.set(work.id, {
				work,
				stream,
				atDate: params.atDate,
				source: params.source,
				formData: params.formData ?? params.source,
				normValue,
				rules: workRules,
				laborRows: laborByWork.get(work.id) ?? [],
				laborParams: laborParamsByWork.get(work.id) ?? [],
				config: configByWork.get(work.id),
				assignmentByWorkId,
				coefficientValueCatalog,
				hiddenParamCodes: params.hiddenParamCodes,
				schemaParams,
			});
		}

		const memo = new Map<string, number>();
		const visiting = new Set<string>();

		const computeTotal = (workId: string): number | null => {
			if (memo.has(workId)) return memo.get(workId) ?? null;
			if (visiting.has(workId)) return null;
			const ctx = contexts.get(workId);
			if (!ctx) return null;

			visiting.add(workId);
			const paramCoefficients = resolveParamCoefficients(ctx);
			const resolveFactorCoeff = buildTypicalWorkFactorCoeffResolver({
				paramCoefficients,
				anyOfParams: listAnyOfLaborParams(ctx.laborParams),
				source: ctx.source,
			});
			const rounding = resolveRounding(ctx.config);
			const terms = ctx.config
				? normalizeStoredFormula(ctx.config.formula, ctx.config.formulaText)
				: normalizeStoredFormula(null);

			const transitive = terms.terms.find((t) => t.kind === "transitive");
			let raw: number | null;
			if (transitive?.sourceAssignmentId) {
				const sourceAssignment = assignmentById.get(transitive.sourceAssignmentId);
				raw = sourceAssignment
					? computeTotal(sourceAssignment.workId)
					: null;
			} else {
				raw = computeTypicalWorkFormulaTotal({
					calculationLogic: parseStoredTypicalWorkCalculationLogic(
						ctx.config?.calculationLogic,
					),
					formula: ctx.config?.formula,
					formulaText: ctx.config?.formulaText,
					terms,
					rounding,
					norm: ctx.normValue,
					paramCoefficients,
					source: ctx.source,
					formData: ctx.formData,
					resolveFactorCoeff,
				});
			}

			visiting.delete(workId);
			if (raw == null) return null;
			const total = applyWorkRounding(raw, rounding);
			memo.set(workId, total);
			return total;
		};

		const tasks: CatalogGeneratedTask[] = [];
		for (const [workId, ctx] of contexts) {
			const total = computeTotal(workId);
			if (total == null) continue;

			let coefficient = 1;
			if (ctx.normValue > 0) {
				coefficient = total / ctx.normValue;
			}

			const paramCoefficients = resolveParamCoefficients(ctx);
			const terms = ctx.config
				? normalizeStoredFormula(ctx.config.formula, ctx.config.formulaText)
				: normalizeStoredFormula(null);
			const coefficientDisplay = formatTypicalWorkCoefficientDisplay({
				terms: terms.terms,
				baseNorm: ctx.normValue,
				paramCoefficients,
				coefficient,
			});

			tasks.push({
				taskCode: `CAT_${workId.slice(0, 8)}`,
				name: ctx.work.name,
				workType: ctx.work.workType?.trim() || "—",
				reason: `${ctx.work.name} · ${stream}`,
				estimateHoursPerDay: ctx.normValue,
				coefficient,
				coefficientDisplay,
				total,
				match: { archComponentType, stream },
				workId,
			});
		}

		return tasks;
	}

	private async loadSchemaParams(
		templateVersionId: string | null,
	): Promise<WorkSchemaParamDef[]> {
		if (!templateVersionId) return [];
		const version = await this.templateVersionRepository.findOne({
			where: { id: templateVersionId },
		});
		if (!version) return [];
		return buildWorkSchemaParamsFromTemplate({
			jsonSchema: (version.jsonSchema ?? {}) as Record<string, unknown>,
			uiSchema: (version.uiSchema ?? {}) as Record<string, unknown>,
		});
	}
}

export { CONTROL_MODELS_STREAM };
