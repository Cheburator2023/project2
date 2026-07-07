import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import {
	CONTROL_MODELS_STREAM,
	applyWorkRounding,
	defaultWorkFormula,
	defaultWorkRounding,
	evaluateTermsFormula,
	isWorkCoefficientValueAvailable,
	normalizeStoredFormula,
	parseStoredTypicalWorkCalculationLogic,
	previewTypicalWorkCalculation,
	resolveActiveNormOnDate,
	resolveLaborAnyOfCoefficient,
	resolveLaborCoefficient,
	resolveStreamFromSourceType,
	termsToTokenFormula,
	typicalWorkRulesMatchSource,
	type TypicalWorkRuleLike,
	type V2TypicalWorkRoundingDto,
} from "@smart-anketa/api-contract";
import { V2TypicalWorkAssignmentEntity } from "../entities/v2-typical-work-assignment.entity";
import { V2TypicalWorkLaborCoefficientEntity } from "../entities/v2-typical-work-labor-coefficient.entity";
import { V2TypicalWorkLaborParamEntity } from "../entities/v2-typical-work-labor-param.entity";
import { V2TypicalWorkNormEntity } from "../entities/v2-typical-work-norm.entity";
import { V2TypicalWorkRuleEntity } from "../entities/v2-typical-work-rule.entity";
import { V2TypicalWorkVersionConfigEntity } from "../entities/v2-typical-work-version-config.entity";
import { V2TypicalWorkEntity } from "../entities/v2-typical-work.entity";
import { V2TypicalWorkParamCatalogService } from "./v2-typical-work-param-catalog.service";

export type CatalogGeneratedTask = {
	taskCode: string;
	name: string;
	workType: string;
	reason: string;
	estimateHoursPerDay: number;
	coefficient: number;
	match: Record<string, unknown>;
	workId: string;
};

export type BuildCatalogTasksParams = {
	archComponentType: string;
	streamExecutor: string;
	source: Record<string, unknown>;
	templateVersionId: string | null;
	atDate: string;
	hiddenParamCodes?: ReadonlySet<string>;
};

type RuntimeWorkContext = {
	work: V2TypicalWorkEntity;
	stream: string;
	atDate: string;
	source: Record<string, unknown>;
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

function resolveParamCoefficients(ctx: RuntimeWorkContext): Record<string, number> {
	const paramCoefficients: Record<string, number> = {};
	const laborParamsByCode = new Map(
		ctx.laborParams.map((row) => [row.paramCode, row]),
	);

	for (const header of ctx.laborParams) {
		if (ctx.hiddenParamCodes?.has(header.paramCode)) continue;
		if (header.kind === "any_of") {
			paramCoefficients[header.paramCode] = resolveLaborAnyOfCoefficient(
				ctx.source,
				header.paramCode,
				{
					valueCodes: header.anyOfValueCodes ?? [],
					valueLabels: header.anyOfValueLabels ?? [],
					coeffOn: decimalToNumber(header.coeffOn),
					coeffOff: decimalToNumber(header.coeffOff),
				},
				header.paramName,
			);
		}
	}

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
		if (
			resolveLaborCoefficient(
				ctx.source,
				row.paramCode,
				row.valueCode,
				row.valueLabel,
				row.paramName,
			)
		) {
			paramCoefficients[row.paramCode] = decimalToNumber(row.coefficient);
		}
	}

	return paramCoefficients;
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

		const assignments = await this.assignmentRepository.find({
			where: { streamExecutor: stream, isActive: true },
		});
		const assignedWorkIds = new Set(assignments.map((a) => a.workId));
		if (assignedWorkIds.size === 0) return [];

		const works = await this.workRepository.find({
			where: { archComponentType },
		});
		const eligibleWorks = works.filter((w) => assignedWorkIds.has(w.id));
		if (!eligibleWorks.length) return [];

		const workIds = eligibleWorks.map((w) => w.id);
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
			const prev = configByWork.get(config.workId);
			if (!prev) {
				configByWork.set(config.workId, config);
				continue;
			}
			if (
				config.streamExecutor === stream &&
				prev.streamExecutor !== stream
			) {
				configByWork.set(config.workId, config);
			}
		}
		const assignmentByWorkId = new Map(
			assignments.map((a) => [a.workId, a]),
		);
		const assignmentById = new Map(assignments.map((a) => [a.id, a]));
		const coefficientValueCatalog =
			await this.paramCatalogService.listTriggerStatusCatalog(params.atDate);

		const contexts = new Map<string, RuntimeWorkContext>();
		for (const work of eligibleWorks) {
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
			if (!typicalWorkRulesMatchSource(workRules, params.source)) continue;

			contexts.set(work.id, {
				work,
				stream,
				atDate: params.atDate,
				source: params.source,
				normValue,
				rules: workRules,
				laborRows: laborByWork.get(work.id) ?? [],
				laborParams: laborParamsByWork.get(work.id) ?? [],
				config: configByWork.get(work.id),
				assignmentByWorkId,
				coefficientValueCatalog,
				hiddenParamCodes: params.hiddenParamCodes,
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
				raw = evaluateTermsFormula({
					terms: terms.terms,
					baseNorm: ctx.normValue,
					resolveFactorCoeff: (code) => paramCoefficients[code] ?? 1,
				});
				if (raw == null) {
					const formula = termsToTokenFormula(terms);
					const preview = previewTypicalWorkCalculation(
						parseStoredTypicalWorkCalculationLogic(ctx.config?.calculationLogic),
						{ formula, rounding },
						{ norm: ctx.normValue, paramCoefficients },
					);
					raw = preview.value ?? ctx.normValue;
				}
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

			tasks.push({
				taskCode: `CAT_${workId.slice(0, 8)}`,
				name: ctx.work.name,
				workType: ctx.work.workType?.trim() || "—",
				reason: `${ctx.work.name} · ${stream}`,
				estimateHoursPerDay: ctx.normValue,
				coefficient,
				match: { archComponentType, stream },
				workId,
			});
		}

		return tasks;
	}
}

export { CONTROL_MODELS_STREAM };
