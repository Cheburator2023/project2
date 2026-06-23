import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import {
	CONTROL_MODELS_STREAM,
	defaultWorkFormula,
	defaultWorkRounding,
	isWorkCoefficientValueAvailable,
	previewWorkFormula,
	resolveActiveNormOnDate,
	resolveLaborCoefficient,
	resolveStreamFromSourceType,
	typicalWorkRulesMatchSource,
	type TypicalWorkRuleLike,
} from "@smart-anketa/api-contract";
import { V2TypicalWorkLaborCoefficientEntity } from "../entities/v2-typical-work-labor-coefficient.entity";
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
	/** Параметры, скрытые зависимостями — не участвуют в формуле. */
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
		@InjectRepository(V2TypicalWorkVersionConfigEntity)
		private readonly versionConfigRepository: Repository<V2TypicalWorkVersionConfigEntity>,
		private readonly paramCatalogService: V2TypicalWorkParamCatalogService,
	) {}

	/** @deprecated Используйте {@link buildCatalogTasks}. */
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

		const works = await this.workRepository.find({
			where: { archComponentType },
		});
		if (!works.length) return [];

		const workIds = works.map((w) => w.id);
		const [norms, rules, labor, configs] = await Promise.all([
			this.normRepository.find({
				where: { workId: In(workIds), streamExecutor: stream },
			}),
			this.ruleRepository.find({
				where: { workId: In(workIds), streamExecutor: stream },
			}),
			this.laborRepository.find({
				where: { workId: In(workIds), streamExecutor: stream },
			}),
			params.templateVersionId
				? this.versionConfigRepository.find({
						where: { workId: In(workIds), templateVersionId: params.templateVersionId },
					})
				: Promise.resolve([]),
		]);

		const normsByWork = groupBy(norms, (n) => n.workId);
		const rulesByWork = groupBy(rules, (r) => r.workId);
		const laborByWork = groupBy(labor, (l) => l.workId);
		const configByWork = new Map(configs.map((c) => [c.workId, c]));
		const coefficientValueCatalog =
			await this.paramCatalogService.listTriggerStatusCatalog(params.atDate);

		const tasks: CatalogGeneratedTask[] = [];

		for (const work of works) {
			const workRules = (rulesByWork.get(work.id) ?? []).map(mapRuleEntity);
			if (!typicalWorkRulesMatchSource(workRules, params.source)) continue;

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

			const config = configByWork.get(work.id);
			const formula = config
				? {
						tokens: Array.isArray(config.formula)
							? (config.formula as ReturnType<typeof defaultWorkFormula>["tokens"])
							: defaultWorkFormula().tokens,
						text: config.formulaText ?? "N",
					}
				: defaultWorkFormula();
			const rounding = config
				? {
						mode: config.roundingMode as ReturnType<
							typeof defaultWorkRounding
						>["mode"],
						step:
							config.roundingStep == null
								? null
								: decimalToNumber(config.roundingStep),
					}
				: defaultWorkRounding();

			const paramCoefficients: Record<string, number> = {};
			for (const row of laborByWork.get(work.id) ?? []) {
				if (params.hiddenParamCodes?.has(row.paramCode)) continue;
				// §578: коэффициент на удалённое значение параметра исключается из расчёта.
				if (
					!isWorkCoefficientValueAvailable(
						row,
						coefficientValueCatalog,
						params.atDate,
					)
				) {
					continue;
				}
				if (
					resolveLaborCoefficient(
						params.source,
						row.paramCode,
						row.valueCode,
						row.valueLabel,
					)
				) {
					paramCoefficients[row.paramCode] = decimalToNumber(row.coefficient);
				}
			}

			const preview = previewWorkFormula(formula, rounding, {
				norm: normValue,
				paramCoefficients,
			});
			const total = preview.value ?? normValue;

			let coefficient = 1;
			if (normValue > 0) {
				coefficient = total / normValue;
			}

			tasks.push({
				taskCode: `CAT_${work.id.slice(0, 8)}`,
				name: work.name,
				workType: work.workType?.trim() || "—",
				reason: `${work.name} · ${stream}`,
				estimateHoursPerDay: normValue,
				coefficient,
				match: { archComponentType, stream },
				workId: work.id,
			});
		}

		return tasks;
	}
}

export { CONTROL_MODELS_STREAM };
