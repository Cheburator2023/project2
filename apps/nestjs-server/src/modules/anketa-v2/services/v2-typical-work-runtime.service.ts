import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import {
	CONTROL_MODELS_STREAM,
	applyWorkRounding,
	applyComputedOverallUncertaintyToTypicalWorkParamCoefficients,
	buildTypicalWorkFactorCoeffResolver,
	buildTypicalWorkFormulaBreakdown,
	buildWorkCoefficientCatalog,
	computeTypicalWorkFormulaTotal,
	defaultWorkRounding,
	formDataWithSingleArchInstance,
	formatEmptyArchInstanceBreakdown,
	formatNoTriggerMatchingArchInstanceBreakdown,
	formatPerInstanceBreakdownExpanded,
	formatTypicalWorkCoefficientDisplay,
	isWorkCoefficientValueAvailable,
	listArchComponentInstances,
	normalizeStoredFormula,
	buildLaborCoefficientLookupSource,
	parseStoredTypicalWorkCalculationLogic,
	resolveActiveNormOnDate,
	resolveArchComponentKindFromType,
	resolveByValueLaborParamCoefficients,
	resolveLaborAnyOfCoefficient,
	resolveStreamFromSourceType,
	resolveExecutorScopeDbStreams,
	isModelStreamAlwaysActiveWork,
	isModelStreamAlwaysShownWork,
	archInstanceMatchesWorkTrigger,
	matchTypicalWorkAppearanceTriggers,
	matchTypicalWorkTriggers,
	hasTypicalWorkTriggersConfigured,
	normalizeTypicalWorkTriggerRuleForMatch,
	remapFactoryAllowedWorkIdsToTemplateWorks,
	type TypicalWorkTriggerMatchInput,
	type TypicalWorkFormulaBreakdownDto,
	type TypicalWorkInstanceBreakdownLine,
	type WorkCoefficientCatalogParam,
	buildWorkSchemaParamsFromTemplate,
	remapLaborCoefficientRowsForSchema,
	resolveTypicalWorkRulesForSourceMatch,
	resolveWorkSchemaParamForRule,
	stripParamNameSourceKeys,
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
import { V2StreamCatalogService } from "./v2-stream-catalog.service";
import { V2_FACTORY_TEMPLATE_TYPICAL_WORKS_REGISTRY } from "../constants/v2-factory-template-typical-works-registry";

const runtimeLogger = new Logger("V2TypicalWorkRuntime");
const RUNTIME_LOG_LIMIT = 8;

function isRuntimeDiagnosticsEnabled(): boolean {
	if (process.env.TYPICAL_WORK_RUNTIME_DIAGNOSTICS === "1") return true;
	return process.env.NODE_ENV !== "production";
}

function compactItems(items: string[], limit = RUNTIME_LOG_LIMIT): string {
	const unique = [...new Set(items)];
	const visible = unique.slice(0, limit);
	const extra = unique.length - visible.length;
	return extra > 0 ? `${visible.join("; ")}; … +${extra}` : visible.join("; ");
}

export type CatalogGeneratedTask = {
	taskCode: string;
	name: string;
	workType: string;
	reason: string;
	estimateHoursPerDay: number;
	coefficient: number;
	/** Развёрнутое представление коэффициента для таблицы анкеты. */
	coefficientDisplay?: string;
	/** Полный разбор формулы для «Подробного расчёта». */
	formulaBreakdown?: TypicalWorkFormulaBreakdownDto;
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
	/** Игнорировать archComponentType при выборе работ (модельный стрим и т.п.). */
	worksCatalogAllArchComponents?: boolean;
	/** Конфиг методики «Общая неопределённость» из logic шаблона. */
	uncertaintyConfig?: import("@smart-anketa/api-contract").V2OverallUncertaintyConfig;
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
	coefficientValueCatalog: WorkCoefficientCatalogParam[];
	hiddenParamCodes?: ReadonlySet<string>;
	schemaParams: WorkSchemaParamDef[];
	triggersMatch: boolean;
	alwaysShown: boolean;
	uncertaintyConfig?: import("@smart-anketa/api-contract").V2OverallUncertaintyConfig;
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
	return normalizeTypicalWorkTriggerRuleForMatch({
		paramCode: rule.paramCode,
		paramName: rule.paramName,
		operator: rule.operator,
		valueCode: rule.valueCode,
		valueLabel: rule.valueLabel,
		values: rule.valueCodes ?? undefined,
	});
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
	const laborParamCodes = listLaborParamCodes(ctx);
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
	const skippedUnavailable: Array<{
		paramCode: string;
		valueLabel: string | null;
		valueCode: string | null;
		schemaFieldUid: string | null;
	}> = [];
	for (const row of ctx.laborRows) {
		if (ctx.hiddenParamCodes?.has(row.paramCode)) continue;
		const header = laborParamsByCode.get(row.paramCode);
		if (header?.kind === "any_of") continue;
		const schemaBound = Boolean(header?.schemaFieldUid?.trim());
		if (
			!schemaBound &&
			!isWorkCoefficientValueAvailable(
				{
					paramCode: row.paramCode,
					valueCode: row.valueCode,
					valueLabel: row.valueLabel,
					schemaFieldUid: header?.schemaFieldUid,
				},
				ctx.coefficientValueCatalog,
				ctx.atDate,
			)
		) {
			skippedUnavailable.push({
				paramCode: row.paramCode,
				valueLabel: row.valueLabel,
				valueCode: row.valueCode,
				schemaFieldUid: header?.schemaFieldUid ?? null,
			});
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
	if (skippedUnavailable.length > 0 && isRuntimeDiagnosticsEnabled()) {
		runtimeLogger.warn(
			`[${ctx.work.name}] отсечены коэффициенты трудоёмкости (недоступны в справочнике / без привязки к схеме): ${compactItems(
				skippedUnavailable.map(
					(row) =>
						`${row.paramCode}=«${row.valueLabel ?? row.valueCode ?? "—"}»` +
						(row.schemaFieldUid ? "" : " [no schemaFieldUid]"),
				),
			)}`,
		);
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

	const unmatchedByValueParams = [
		...new Set(byValueRows.map((row) => row.paramCode)),
	].filter((paramCode) => !Object.hasOwn(paramCoefficients, paramCode));
	if (unmatchedByValueParams.length > 0 && isRuntimeDiagnosticsEnabled()) {
		runtimeLogger.warn(
			`[${ctx.work.name}] ответы анкеты не совпали ни с одной строкой коэффициента (будет ×1): ${compactItems(
				unmatchedByValueParams,
			)}. lookupKeys=${Object.keys(lookupSource).slice(0, 12).join(",")}`,
		);
	}

	const terms = ctx.config
		? normalizeStoredFormula(ctx.config.formula, ctx.config.formulaText)
		: normalizeStoredFormula(null);
	const formulaParamCodes = terms.terms.flatMap((term) =>
		term.factors.map((factor) => factor.paramCode),
	);
	applyComputedOverallUncertaintyToTypicalWorkParamCoefficients(
		ctx.formData,
		paramCoefficients,
		{
			laborParamRefs: [
				...ctx.laborParams.map((row) => ({
					paramCode: row.paramCode,
					paramName: row.paramName,
				})),
				...ctx.laborRows.map((row) => ({
					paramCode: row.paramCode,
					paramName: row.paramName,
				})),
			],
			formulaParamCodes,
			config: ctx.uncertaintyConfig,
		},
	);

	const silentDefaultFactors = [...new Set(formulaParamCodes)].filter(
		(paramCode) =>
			Boolean(paramCode) &&
			!Object.hasOwn(paramCoefficients, paramCode) &&
			laborParamsByCode.get(paramCode)?.kind !== "any_of",
	);
	if (silentDefaultFactors.length > 0 && isRuntimeDiagnosticsEnabled()) {
		runtimeLogger.warn(
			`[${ctx.work.name}] факторы формулы без коэффициента → ×1: ${compactItems(
				silentDefaultFactors,
			)}`,
		);
	}

	return paramCoefficients;
}

function listLaborParamCodes(ctx: RuntimeWorkContext): string[] {
	return [
		...new Set([
			...ctx.laborParams.map((row) => row.paramCode),
			...ctx.laborRows.map((row) => row.paramCode),
		]),
	];
}

function buildRuntimeFactorCoeffResolver(
	ctx: RuntimeWorkContext,
	paramCoefficients: Record<string, number>,
) {
	return buildTypicalWorkFactorCoeffResolver({
		paramCoefficients,
		anyOfParams: listAnyOfLaborParams(ctx.laborParams),
		source: buildLaborCoefficientLookupSource(
			ctx.source,
			ctx.formData,
			ctx.schemaParams,
			listLaborParamCodes(ctx),
		),
	});
}

function evaluateWorkInstance(
	ctx: RuntimeWorkContext,
	source: Record<string, unknown>,
	formData: Record<string, unknown>,
): {
	total: number | null;
	paramCoefficients: Record<string, number>;
	breakdown: TypicalWorkFormulaBreakdownDto;
} {
	const instanceCtx: RuntimeWorkContext = {
		...ctx,
		source,
		formData,
	};
	const paramCoefficients = resolveParamCoefficients(instanceCtx);
	const resolveFactorCoeff = buildRuntimeFactorCoeffResolver(
		instanceCtx,
		paramCoefficients,
	);
	const rounding = resolveRounding(ctx.config);
	const terms = ctx.config
		? normalizeStoredFormula(ctx.config.formula, ctx.config.formulaText)
		: normalizeStoredFormula(null);
	const paramNames = Object.fromEntries(
		ctx.laborParams.map((row) => [
			row.paramCode,
			stripParamNameSourceKeys(row.paramName).trim() ||
				row.paramName?.trim() ||
				row.paramCode,
		]),
	);
	const raw = computeTypicalWorkFormulaTotal({
		calculationLogic: parseStoredTypicalWorkCalculationLogic(
			ctx.config?.calculationLogic,
		),
		formula: ctx.config?.formula,
		formulaText: ctx.config?.formulaText,
		terms,
		rounding,
		norm: ctx.normValue,
		paramCoefficients,
		source,
		formData,
		resolveFactorCoeff,
	});
	if (raw == null) {
		return {
			total: null,
			paramCoefficients,
			breakdown: {
				symbolic: "N",
				expanded: "—",
				factors: [],
				baseNorm: ctx.normValue,
				coefficient: 1,
				total: 0,
			},
		};
	}
	const total = applyWorkRounding(raw, rounding);
	const coefficient = ctx.normValue > 0 ? total / ctx.normValue : 1;
	const breakdown = buildTypicalWorkFormulaBreakdown({
		calculationLogic: parseStoredTypicalWorkCalculationLogic(
			ctx.config?.calculationLogic,
		),
		formula: ctx.config?.formula,
		formulaText: ctx.config?.formulaText,
		terms,
		rounding,
		norm: ctx.normValue,
		paramCoefficients,
		paramNames,
		source,
		formData,
		resolveFactorCoeff,
		coefficient,
		total,
	});
	return { total, paramCoefficients, breakdown };
}

/**
 * Per-instance: формула на каждый экземпляр archComponentType работы → сумма.
 * arch_count того же kind принудительно 1 (через formData override / sliced list).
 * В сумму попадают только экземпляры, на которых сработал триггер появления работы.
 */
function evaluateWorkAcrossArchInstances(ctx: RuntimeWorkContext): {
	total: number | null;
	paramCoefficients: Record<string, number>;
	instanceBreakdown: TypicalWorkInstanceBreakdownLine[];
	expandedOverride: string;
} {
	const kind = resolveArchComponentKindFromType(ctx.work.archComponentType);
	const instances = listArchComponentInstances(
		ctx.formData,
		ctx.work.archComponentType,
		{ schemaParams: ctx.schemaParams },
	);

	if (kind != null && kind !== "modelService" && instances.length === 0) {
		return {
			total: 0,
			paramCoefficients: {},
			instanceBreakdown: [],
			expandedOverride: formatEmptyArchInstanceBreakdown(
				ctx.work.archComponentType,
			),
		};
	}

	const assignment = ctx.assignmentByWorkId.get(ctx.work.id);
	const triggerInput: TypicalWorkTriggerMatchInput = {
		mode:
			(assignment?.triggerMode as TypicalWorkTriggerMatchInput["mode"]) ??
			"simple",
		rules: ctx.rules,
		triggerArchCount: mapTriggerArchCountFromAssignment(assignment),
		triggerFormula:
			(assignment?.triggerFormula as TypicalWorkTriggerMatchInput["triggerFormula"]) ??
			null,
	};
	const matchContext = { schemaParams: ctx.schemaParams };

	const instanceBreakdown: TypicalWorkInstanceBreakdownLine[] = [];
	let sum = 0;
	let lastCoeffs: Record<string, number> = {};
	let anyOk = false;
	let skippedByTrigger = 0;

	for (const instance of instances) {
		const useBaseSource = kind == null || kind === "modelService";
		const source = useBaseSource
			? ctx.source
			: { ...ctx.source, ...instance.row };
		const formData = formDataWithSingleArchInstance(
			ctx.formData,
			kind,
			instance,
		);
		if (
			!archInstanceMatchesWorkTrigger({
				triggerInput,
				source,
				formData,
				matchContext,
			})
		) {
			skippedByTrigger += 1;
			continue;
		}
		const evaluated = evaluateWorkInstance(ctx, source, formData);
		if (evaluated.total == null) continue;
		anyOk = true;
		sum += evaluated.total;
		lastCoeffs = evaluated.paramCoefficients;
		instanceBreakdown.push({
			sourceLabel: instance.sourceLabel,
			index: instance.index,
			expanded: evaluated.breakdown.expanded,
			total: evaluated.total,
		});
	}

	if (!anyOk) {
		if (
			instances.length > 0 &&
			skippedByTrigger === instances.length &&
			hasTypicalWorkTriggersConfigured(triggerInput)
		) {
			return {
				total: 0,
				paramCoefficients: {},
				instanceBreakdown: [],
				expandedOverride: formatNoTriggerMatchingArchInstanceBreakdown(
					ctx.work.archComponentType,
				),
			};
		}
		return {
			total: null,
			paramCoefficients: {},
			instanceBreakdown: [],
			expandedOverride: "",
		};
	}

	return {
		total: sum,
		paramCoefficients: lastCoeffs,
		instanceBreakdown,
		expandedOverride: formatPerInstanceBreakdownExpanded(
			instanceBreakdown,
			sum,
		),
	};
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
		private readonly streamCatalog: V2StreamCatalogService,
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

		const catalog = await this.streamCatalog.getCatalog({ activeOnly: false });
		const scopeStreams = [...resolveExecutorScopeDbStreams(stream, catalog)];
		const streamScope =
			scopeStreams.length > 0 ? scopeStreams : [stream];

		const assignments = await this.assignmentRepository.find({
			where: { streamExecutor: In(streamScope), isActive: true },
		});
		const assignedWorkIds = new Set(assignments.map((a) => a.workId));
		if (assignedWorkIds.size === 0) return [];

		const allowedWorkIds = await this.resolveAllowedWorkIdsForTemplate(
			params.allowedWorkIds,
			params.templateId,
			assignedWorkIds,
		);
		const worksCatalogAllArchComponents =
			params.worksCatalogAllArchComponents === true;
		const workWhere =
			allowedWorkIds !== undefined
				? { id: In([...allowedWorkIds]) }
				: worksCatalogAllArchComponents
					? {}
					: { archComponentType };
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
				where: { workId: In(workIds), streamExecutor: In(streamScope) },
			}),
			this.ruleRepository.find({
				where: { workId: In(workIds), streamExecutor: In(streamScope) },
			}),
			this.laborRepository.find({
				where: { workId: In(workIds), streamExecutor: In(streamScope) },
			}),
			this.laborParamRepository.find({
				where: { workId: In(workIds), streamExecutor: In(streamScope) },
			}),
			params.templateVersionId
				? this.versionConfigRepository.find({
						where: {
							workId: In(workIds),
							templateVersionId: params.templateVersionId,
							streamExecutor: In(streamScope),
						},
					})
				: Promise.resolve([]),
		]);

		const normsByWork = groupBy(norms, (n) => n.workId);
		const rulesByWork = groupBy(rules, (r) => r.workId);
		const laborByWork = groupBy(labor, (l) => l.workId);
		const laborParamsByWork = groupBy(laborParams, (l) => l.workId);
		const configByWork = new Map<string, V2TypicalWorkVersionConfigEntity>();
		for (const config of allConfigs) {
			const existing = configByWork.get(config.workId);
			if (!existing || config.streamExecutor === stream) {
				configByWork.set(config.workId, config);
			}
		}
		const assignmentByWorkId = new Map<string, V2TypicalWorkAssignmentEntity>();
		for (const assignment of assignments) {
			const existing = assignmentByWorkId.get(assignment.workId);
			if (!existing || assignment.streamExecutor === stream) {
				assignmentByWorkId.set(assignment.workId, assignment);
			}
		}
		const assignmentById = new Map(assignments.map((a) => [a.id, a]));
		const methodologyCatalog =
			await this.paramCatalogService.listTriggerStatusCatalog(params.atDate);
		const schemaParams = await this.loadSchemaParams(params.templateVersionId);
		const coefficientValueCatalog = buildWorkCoefficientCatalog({
			schemaParams,
			laborParams: laborParams.map((row) => ({
				paramCode: row.paramCode,
				paramName: row.paramName,
				schemaFieldUid: row.schemaFieldUid,
			})),
			methodologyCatalog,
		});

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
				streamScope,
				params.atDate,
			);
			if (normValue == null) continue;

			const workRules = resolveTypicalWorkRulesForSourceMatch(
				(rulesByWork.get(work.id) ?? []).map(mapRuleEntity),
				schemaParams,
			);
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
			const triggersMatch = matchTypicalWorkAppearanceTriggers({
				triggerInput,
				archComponentType: work.archComponentType,
				source: params.source,
				formData: params.formData ?? params.source,
				matchContext: { schemaParams },
			});
			const alwaysActive = isModelStreamAlwaysActiveWork(work.id);
			const alwaysShown =
				isModelStreamAlwaysShownWork(work.id) || alwaysActive;

			if (!triggersMatch && !alwaysShown) {
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
				triggersMatch,
				alwaysShown,
				uncertaintyConfig: params.uncertaintyConfig,
			});
		}

		const memo = new Map<string, number>();
		const visiting = new Set<string>();
		const evaluationByWorkId = new Map<
			string,
			ReturnType<typeof evaluateWorkAcrossArchInstances>
		>();

		const computeTotal = (workId: string): number | null => {
			if (memo.has(workId)) return memo.get(workId) ?? null;
			if (visiting.has(workId)) return null;
			const ctx = contexts.get(workId);
			if (!ctx) return null;
			if (ctx.alwaysShown && !ctx.triggersMatch && !isModelStreamAlwaysActiveWork(workId)) {
				memo.set(workId, 0);
				return 0;
			}

			visiting.add(workId);
			const terms = ctx.config
				? normalizeStoredFormula(ctx.config.formula, ctx.config.formulaText)
				: normalizeStoredFormula(null);

			const transitive = terms.terms.find((t) => t.kind === "transitive");
			let total: number | null;
			if (transitive?.sourceAssignmentId) {
				const sourceAssignment = assignmentById.get(transitive.sourceAssignmentId);
				total = sourceAssignment
					? computeTotal(sourceAssignment.workId)
					: null;
			} else {
				const evaluated = evaluateWorkAcrossArchInstances(ctx);
				evaluationByWorkId.set(workId, evaluated);
				total = evaluated.total;
			}

			visiting.delete(workId);
			if (total == null) return null;
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

			const evaluated =
				evaluationByWorkId.get(workId) ??
				evaluateWorkAcrossArchInstances(ctx);
			const paramCoefficients = evaluated.paramCoefficients;
			const terms = ctx.config
				? normalizeStoredFormula(ctx.config.formula, ctx.config.formulaText)
				: normalizeStoredFormula(null);
			const resolveFactorCoeff = buildRuntimeFactorCoeffResolver(
				ctx,
				paramCoefficients,
			);
			const rounding = resolveRounding(ctx.config);
			const paramNames = Object.fromEntries(
				ctx.laborParams.map((row) => [
					row.paramCode,
					stripParamNameSourceKeys(row.paramName).trim() ||
						row.paramName?.trim() ||
						row.paramCode,
				]),
			);
			const coefficientDisplay = formatTypicalWorkCoefficientDisplay({
				terms: terms.terms,
				baseNorm: ctx.normValue,
				paramCoefficients,
				coefficient,
			});
			const formulaBreakdown = buildTypicalWorkFormulaBreakdown({
				calculationLogic: parseStoredTypicalWorkCalculationLogic(
					ctx.config?.calculationLogic,
				),
				formula: ctx.config?.formula,
				formulaText: ctx.config?.formulaText,
				terms,
				rounding,
				norm: ctx.normValue,
				paramCoefficients,
				paramNames,
				source: ctx.source,
				formData: ctx.formData,
				resolveFactorCoeff,
				coefficient,
				total,
				instanceBreakdown: evaluated.instanceBreakdown,
				expandedOverride: evaluated.expandedOverride,
			});

			tasks.push({
				taskCode: `CAT_${workId.slice(0, 8)}`,
				name: ctx.work.name,
				workType: ctx.work.workType?.trim() || "—",
				reason: `${ctx.work.name} · ${stream}`,
				estimateHoursPerDay: ctx.normValue,
				coefficient,
				coefficientDisplay,
				formulaBreakdown,
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

	private async resolveAllowedWorkIdsForTemplate(
		allowedWorkIds: readonly string[] | undefined,
		templateId: string | null | undefined,
		assignedWorkIds: ReadonlySet<string>,
	): Promise<string[] | undefined> {
		if (allowedWorkIds === undefined) return undefined;
		if (allowedWorkIds.length === 0) return [];

		const directAssigned = allowedWorkIds.filter((id) => assignedWorkIds.has(id));
		if (directAssigned.length === allowedWorkIds.length) {
			return [...allowedWorkIds];
		}

		if (!templateId?.trim()) {
			return directAssigned.length > 0 ? directAssigned : [...allowedWorkIds];
		}

		const templateWorks = await this.workRepository.find({
			where: { templateId: templateId.trim() },
		});
		if (templateWorks.length === 0) {
			return directAssigned.length > 0 ? directAssigned : [...allowedWorkIds];
		}

		const remapped = remapFactoryAllowedWorkIdsToTemplateWorks(
			allowedWorkIds,
			templateWorks.map((work) => ({ id: work.id, name: work.name })),
			V2_FACTORY_TEMPLATE_TYPICAL_WORKS_REGISTRY.works.map((work) => ({
				id: work.id,
				name: work.name,
			})),
		).filter((id) => assignedWorkIds.has(id));

		if (remapped.length > 0) return remapped;
		return directAssigned.length > 0 ? directAssigned : [...allowedWorkIds];
	}
}

export { CONTROL_MODELS_STREAM };
