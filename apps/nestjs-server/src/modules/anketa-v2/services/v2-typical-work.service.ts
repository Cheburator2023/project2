import { Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import type {
	V2TypicalWorkCardDto,
	V2TypicalWorkLaborCoefficientDto,
	V2TypicalWorkListItemDto,
	V2TypicalWorkListResponseDto,
	V2TypicalWorkNormDto,
	V2TypicalWorkRuleDto,
	V2WorkTriggerStatus,
	WorkTriggerStatusCatalogParam,
} from "@smart-anketa/api-contract";
import {
	defaultWorkFormula,
	defaultWorkRounding,
	computeWorkTriggerStatus,
	resolveActiveNormOnDate,
} from "@smart-anketa/api-contract";
import { V2TypicalWorkEntity } from "../entities/v2-typical-work.entity";
import { V2TypicalWorkNormEntity } from "../entities/v2-typical-work-norm.entity";
import { V2TypicalWorkRuleEntity } from "../entities/v2-typical-work-rule.entity";
import { V2TypicalWorkLaborCoefficientEntity } from "../entities/v2-typical-work-labor-coefficient.entity";
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
		private readonly paramCatalogService: V2TypicalWorkParamCatalogService,
	) {}

	async onModuleInit(): Promise<void> {
		const count = await this.workRepository.count();
		if (count > 0) {
			this.logger.log(`Typical works catalog already seeded (${count} works)`);
			return;
		}
		await this.seedFromDocCatalog();
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
		@InjectRepository(V2TypicalWorkVersionConfigEntity)
		private readonly versionConfigRepository: Repository<V2TypicalWorkVersionConfigEntity>,
		private readonly paramCatalogService: V2TypicalWorkParamCatalogService,
	) {}

	async listWorks(query: {
		archComponentType?: string;
		streamExecutor?: string;
	}): Promise<V2TypicalWorkListResponseDto> {
		const works = await this.workRepository.find({
			order: { archComponentType: "ASC", name: "ASC" },
		});

		const workIds = works.map((w) => w.id);
		const [norms, rules, laborRows] = await Promise.all([
			workIds.length
				? this.normRepository.find({ where: { workId: In(workIds) } })
				: [],
			workIds.length
				? this.ruleRepository.find({ where: { workId: In(workIds) } })
				: [],
			workIds.length
				? this.laborRepository.find({ where: { workId: In(workIds) } })
				: [],
		]);

		const normsByWork = groupBy(norms, (n) => n.workId);
		const rulesByWork = groupBy(rules, (r) => r.workId);
		const laborByWork = groupBy(laborRows, (r) => r.workId);
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
				const streams = unique([
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
		const [norms, rules, laborRows, versionConfig] = await Promise.all([
			this.normRepository.find({
				where: { workId, streamExecutor: stream },
				order: { validFrom: "ASC" },
			}),
			this.ruleRepository.find({
				where: { workId, streamExecutor: stream },
			}),
			this.laborRepository.find({
				where: { workId, streamExecutor: stream },
			}),
			templateVersionId
				? this.versionConfigRepository.findOne({
						where: { workId, templateVersionId },
					})
				: Promise.resolve(null),
		]);

		const laborParams = groupLaborByParam(laborRows.map(mapLaborEntity));
		const triggerStatusCatalog =
			await this.paramCatalogService.listTriggerStatusCatalog(todayIsoDate());

		return {
			id: work.id,
			name: work.name,
			archComponentType: work.archComponentType,
			workType: work.workType,
			streamExecutor: stream,
			triggerStatus: resolveTriggerStatus(
				rules,
				triggerStatusCatalog,
				todayIsoDate(),
			),
			norms: norms.map(mapNormEntity),
			rules: rules.map(mapRuleEntity),
			laborParams,
			formula: versionConfig
				? {
						tokens: Array.isArray(versionConfig.formula)
							? (versionConfig.formula as V2TypicalWorkCardDto["formula"]["tokens"])
							: defaultWorkFormula().tokens,
						text: versionConfig.formulaText ?? defaultWorkFormula().text,
					}
				: defaultWorkFormula(),
			rounding: versionConfig
				? {
						mode: versionConfig.roundingMode as V2TypicalWorkCardDto["rounding"]["mode"],
						step:
							versionConfig.roundingStep === null
								? null
								: decimalToNumber(versionConfig.roundingStep),
					}
				: defaultWorkRounding(),
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

function resolveTriggerStatus(
	rules: Pick<
		V2TypicalWorkRuleEntity,
		"paramCode" | "valueCode" | "valueLabel"
	>[],
	triggerStatusCatalog: WorkTriggerStatusCatalogParam[],
	atDate: string,
): V2WorkTriggerStatus {
	return computeWorkTriggerStatus(
		rules.map((rule) => ({
			paramCode: rule.paramCode,
			valueCode: rule.valueCode,
			valueLabel: rule.valueLabel,
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
			coefficients: [row],
		});
	}
	return [...groups.values()];
}
