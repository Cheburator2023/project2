import {
	ConflictException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import type {
	CreateV2TypicalWorkRequestDto,
	PatchV2TypicalWorkRequestDto,
	V2ParameterDependencyListResponseDto,
	V2TypicalWorkCardDto,
	V2TypicalWorkFieldErrorDto,
	V2TypicalWorkParameterListResponseDto,
	V2TypicalWorkPreviewRequestDto,
	V2TypicalWorkPreviewResponseDto,
} from "@smart-anketa/api-contract";
import {
	collectAllowedParamCodes,
	defaultWorkFormula,
	defaultWorkRounding,
	previewWorkFormula,
	resolveActiveNormOnDate,
	tokensToText,
	validateCoefficientValue,
	validateFormulaAgainstParams,
	validateNormInputs,
	validateRoundingInput,
	validateWorkName,
} from "@smart-anketa/api-contract";
import { V2_DOC_CATALOG } from "../constants/v2-doc-catalog";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";
import { V2TypicalWorkLaborCoefficientEntity } from "../entities/v2-typical-work-labor-coefficient.entity";
import { V2TypicalWorkNormEntity } from "../entities/v2-typical-work-norm.entity";
import { V2TypicalWorkRuleEntity } from "../entities/v2-typical-work-rule.entity";
import { V2TypicalWorkVersionConfigEntity } from "../entities/v2-typical-work-version-config.entity";
import { V2TypicalWorkEntity } from "../entities/v2-typical-work.entity";
import {
	normalizeArchComponentType,
	slugParamCode,
} from "../utils/v2-typical-work-catalog.util";
import { V2TypicalWorkService } from "./v2-typical-work.service";

function decimalToNumber(value: string | number | null | undefined): number {
	if (value === null || value === undefined) return 0;
	return typeof value === "number" ? value : Number(value);
}

@Injectable()
export class V2TypicalWorkWriteService {
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
		private readonly typicalWorkService: V2TypicalWorkService,
	) {}

	listParameters(): V2TypicalWorkParameterListResponseDto {
		const items = V2_DOC_CATALOG.dictionaries.map((dict) => ({
			code: slugParamCode(dict.name),
			name: dict.name,
			description: dict.comments?.trim() || dict.attributes?.trim() || null,
			values: dict.values.map((v) => ({
				code: slugParamCode(v.label),
				label: v.label,
				coefficient: v.coeff,
			})),
		}));
		return { items };
	}

	listParameterDependencies(): V2ParameterDependencyListResponseDto {
		const items = V2_DOC_CATALOG.dictionaries
			.filter((dict) => dict.attributes?.trim() || dict.comments?.trim())
			.map((dict) => ({
				paramCode: slugParamCode(dict.name),
				paramName: dict.name,
				dependsOnParamCode: null,
				dependsOnParamName: null,
				description: [dict.attributes, dict.comments]
					.filter(Boolean)
					.join(" · ")
					.trim() || null,
			}));
		return { items };
	}

	async createWork(dto: CreateV2TypicalWorkRequestDto) {
		const issues = validateWorkName(dto.name);
		if (issues.length) {
			throw new ConflictException({ errors: issues });
		}
		const archComponentType = normalizeArchComponentType(dto.archComponentType);
		const work = await this.workRepository.save(
			this.workRepository.create({
				name: dto.name.trim(),
				archComponentType,
				workType: dto.workType?.trim() || null,
				catalogKey: null,
			}),
		);
		return {
			id: work.id,
			name: work.name,
			archComponentType: work.archComponentType,
			workType: work.workType,
			streamExecutor: "",
			triggerStatus: "no_triggers" as const,
			norms: [],
			rules: [],
			laborParams: [],
			formula: defaultWorkFormula(),
			rounding: defaultWorkRounding(),
		};
	}

	async deleteWork(workId: string): Promise<void> {
		const work = await this.workRepository.findOne({ where: { id: workId } });
		if (!work) throw new NotFoundException(`Typical work ${workId} not found`);
		await this.workRepository.delete(workId);
	}

	async patchWork(workId: string, dto: PatchV2TypicalWorkRequestDto) {
		const work = await this.workRepository.findOne({ where: { id: workId } });
		if (!work) throw new NotFoundException(`Typical work ${workId} not found`);

		const stream = dto.streamExecutor.trim();
		if (!stream) {
			throw new ConflictException({
				errors: [{ path: "streamExecutor", message: "Укажите стрим-исполнителя" }],
			});
		}

		const errors: V2TypicalWorkFieldErrorDto[] = [];

		if (dto.name !== undefined) {
			errors.push(...validateWorkName(dto.name));
		}

		if (dto.norms) {
			errors.push(...validateNormInputs(dto.norms, stream));
		}

		if (dto.laborCoefficients) {
			dto.laborCoefficients.forEach((row, index) => {
				errors.push(
					...validateCoefficientValue(
						row.coefficient,
						`laborCoefficients[${index}].coefficient`,
					),
				);
			});
			const paramCounts = new Map<string, number>();
			for (const row of dto.laborCoefficients) {
				paramCounts.set(row.paramCode, (paramCounts.get(row.paramCode) ?? 0) + 1);
			}
		}

		if (dto.rounding) {
			errors.push(...validateRoundingInput(dto.rounding));
		}

		if (dto.formula) {
			let allowed = dto.laborCoefficients
				? collectAllowedParamCodes(dto.laborCoefficients)
				: new Set<string>();
			if (!dto.laborCoefficients) {
				const existingLabor = await this.laborRepository.find({
					where: { workId, streamExecutor: stream },
				});
				allowed = collectAllowedParamCodes(
					existingLabor.map((row) => ({ paramCode: row.paramCode })),
				);
			}
			errors.push(...validateFormulaAgainstParams(dto.formula.tokens, allowed));
		}

		if (errors.length) {
			throw new ConflictException({ errors });
		}

		const touchesFormula = dto.formula !== undefined || dto.rounding !== undefined;
		if (touchesFormula && dto.templateVersionId) {
			const version = await this.templateVersionRepository.findOne({
				where: { id: dto.templateVersionId },
			});
			if (version?.status === "published") {
				throw new ConflictException({
					code: "FORMULA_LOCKED",
					message:
						"Формула опубликованной версии шаблона заблокирована. Создайте минорную версию.",
				});
			}
		}

		if (dto.name !== undefined) {
			work.name = dto.name.trim();
		}
		if (dto.archComponentType !== undefined) {
			work.archComponentType = normalizeArchComponentType(dto.archComponentType);
		}
		await this.workRepository.save(work);

		if (dto.norms) {
			await this.normRepository.delete({ workId, streamExecutor: stream });
			if (dto.norms.length) {
				await this.normRepository.save(
					dto.norms.map((norm) =>
						this.normRepository.create({
							workId,
							streamExecutor: stream,
							normValue: String(norm.normValue),
							validFrom: norm.validFrom.slice(0, 10),
							validTo: norm.validTo?.slice(0, 10) ?? null,
						}),
					),
				);
			}
		}

		if (dto.rules) {
			await this.ruleRepository.delete({ workId, streamExecutor: stream });
			if (dto.rules.length) {
				await this.ruleRepository.save(
					dto.rules.map((rule) =>
						this.ruleRepository.create({
							workId,
							streamExecutor: stream,
							paramCode: rule.paramCode,
							paramName: rule.paramName ?? null,
							operator: rule.operator,
							valueCode: rule.valueCode ?? null,
							valueLabel: rule.valueLabel ?? null,
						}),
					),
				);
			}
		}

		if (dto.laborCoefficients) {
			await this.laborRepository.delete({ workId, streamExecutor: stream });
			if (dto.laborCoefficients.length) {
				await this.laborRepository.save(
					dto.laborCoefficients.map((row) =>
						this.laborRepository.create({
							workId,
							streamExecutor: stream,
							paramCode: row.paramCode,
							paramName: row.paramName ?? null,
							valueCode: row.valueCode ?? null,
							valueLabel: row.valueLabel ?? null,
							coefficient: String(row.coefficient),
						}),
					),
				);
			}
		}

		if (touchesFormula && dto.templateVersionId) {
			const formula = dto.formula ?? defaultWorkFormula();
			const rounding = dto.rounding ?? defaultWorkRounding();
			const existing = await this.versionConfigRepository.findOne({
				where: { workId, templateVersionId: dto.templateVersionId },
			});
			const payload = {
				formula: formula.tokens,
				formulaText: formula.text || tokensToText(formula.tokens),
				roundingMode: rounding.mode,
				roundingStep:
					rounding.mode === "NONE" ? null : String(rounding.step ?? 0.1),
			};
			if (existing) {
				Object.assign(existing, payload);
				await this.versionConfigRepository.save(existing);
			} else {
				await this.versionConfigRepository.save(
					this.versionConfigRepository.create({
						workId,
						templateVersionId: dto.templateVersionId,
						...payload,
					}),
				);
			}
		}

		return this.typicalWorkService.getWorkCard(
			workId,
			stream,
			dto.templateVersionId,
		);
	}

	async previewWork(
		workId: string,
		dto: V2TypicalWorkPreviewRequestDto,
	): Promise<V2TypicalWorkPreviewResponseDto> {
		const stream = dto.streamExecutor.trim();
		const atDate = (dto.atDate ?? new Date().toISOString()).slice(0, 10);
		const card = await this.typicalWorkService.getWorkCard(workId, stream);

		const norm =
			resolveActiveNormOnDate(card.norms, stream, atDate) ??
			null;
		if (norm == null) {
			return {
				formulaSymbolic: card.formula.text,
				formulaExpanded: "",
				result: null,
				error: `На текущую дату не задана действующая норма для стрима ${stream}`,
			};
		}

		const paramCoefficients: Record<string, number> = {};
		for (const group of card.laborParams) {
			for (const row of group.coefficients) {
				const answer = dto.answers?.[group.paramCode];
				if (answer && row.valueCode === answer) {
					paramCoefficients[group.paramCode] = row.coefficient;
				} else if (
					answer &&
					row.valueLabel &&
					slugParamCode(row.valueLabel) === answer
				) {
					paramCoefficients[group.paramCode] = row.coefficient;
				} else if (!answer && row.coefficient != null) {
					paramCoefficients[group.paramCode] ??= row.coefficient;
				}
			}
		}

		const evaluated = previewWorkFormula(card.formula, card.rounding, {
			norm,
			paramCoefficients,
		});

		return {
			formulaSymbolic: evaluated.symbolic,
			formulaExpanded: evaluated.expanded,
			result: evaluated.value,
			error: evaluated.error,
		};
	}
}
