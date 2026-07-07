import {
	ConflictException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import type {
	CreateV2TypicalWorkRequestDto,
	CreateV2TypicalWorkParameterRequestDto,
	CreateV2TypicalWorkParameterValueRequestDto,
	CreateV2TypicalWorkAssignmentRequestDto,
	PatchV2TypicalWorkRequestDto,
	UpdateV2TypicalWorkParameterRequestDto,
	UpdateV2TypicalWorkParameterValueRequestDto,
	V2ParameterDependencyListResponseDto,
	V2TypicalWorkAssignmentDto,
	V2TypicalWorkFieldErrorDto,
	V2TypicalWorkParameterDto,
	V2TypicalWorkParameterListResponseDto,
	V2TypicalWorkParameterValueDto,
	V2TypicalWorkPreviewRequestDto,
	V2TypicalWorkPreviewResponseDto,
} from "@smart-anketa/api-contract";
import {
	compileCalculationLogicFromVersionConfig,
	collectAllowedParamCodes,
	compileStoredTypicalWorkResultLogic,
	computeWorkTriggerStatus,
	defaultWorkFormula,
	defaultWorkRounding,
	detectTransitiveCycle,
	evaluateTermsFormula,
	isWorkCoefficientValueAvailable,
	needsCalculationLogicBackfill,
	normalizeStoredFormula,
	previewTypicalWorkCalculation,
	resolveActiveNormOnDate,
	resolveLaborAnyOfCoefficient,
	termsToTokenFormula,
	tokensToText,
	validateCoefficientValue,
	validateFormulaAgainstParams,
	validateNormInputs,
	validateRoundingInput,
	validateTermsFormula,
	validateWorkName,
} from "@smart-anketa/api-contract";
import { V2QuestionnaireEntity } from "../entities/v2-questionnaire.entity";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";
import { V2TypicalWorkAssignmentEntity } from "../entities/v2-typical-work-assignment.entity";
import { V2TypicalWorkLaborCoefficientEntity } from "../entities/v2-typical-work-labor-coefficient.entity";
import { V2TypicalWorkLaborParamEntity } from "../entities/v2-typical-work-labor-param.entity";
import { V2TypicalWorkNormEntity } from "../entities/v2-typical-work-norm.entity";
import { V2TypicalWorkRuleEntity } from "../entities/v2-typical-work-rule.entity";
import { V2TypicalWorkVersionConfigEntity } from "../entities/v2-typical-work-version-config.entity";
import { V2TypicalWorkEntity } from "../entities/v2-typical-work.entity";
import {
	normalizeArchComponentType,
	slugParamCode,
} from "../utils/v2-typical-work-catalog.util";
import { V2TypicalWorkParamCatalogService } from "./v2-typical-work-param-catalog.service";
import { V2TypicalWorkService } from "./v2-typical-work.service";

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
		@InjectRepository(V2TypicalWorkLaborParamEntity)
		private readonly laborParamRepository: Repository<V2TypicalWorkLaborParamEntity>,
		@InjectRepository(V2TypicalWorkAssignmentEntity)
		private readonly assignmentRepository: Repository<V2TypicalWorkAssignmentEntity>,
		@InjectRepository(V2TypicalWorkVersionConfigEntity)
		private readonly versionConfigRepository: Repository<V2TypicalWorkVersionConfigEntity>,
		@InjectRepository(V2TemplateVersionEntity)
		private readonly templateVersionRepository: Repository<V2TemplateVersionEntity>,
		@InjectRepository(V2QuestionnaireEntity)
		private readonly questionnaireRepository: Repository<V2QuestionnaireEntity>,
		private readonly typicalWorkService: V2TypicalWorkService,
		private readonly paramCatalogService: V2TypicalWorkParamCatalogService,
	) {}

	listParameters(includeInactive = false): Promise<V2TypicalWorkParameterListResponseDto> {
		return this.paramCatalogService.listParameters(
			undefined,
			includeInactive,
		);
	}

	listParameterDependencies(): Promise<V2ParameterDependencyListResponseDto> {
		return this.paramCatalogService.listParameterDependencies();
	}

	createParameter(
		dto: CreateV2TypicalWorkParameterRequestDto,
	): Promise<V2TypicalWorkParameterDto> {
		return this.paramCatalogService.createParameter(dto);
	}

	updateParameter(
		code: string,
		dto: UpdateV2TypicalWorkParameterRequestDto,
	): Promise<V2TypicalWorkParameterDto> {
		return this.paramCatalogService.updateParameter(code, dto);
	}

	deleteParameter(code: string): Promise<void> {
		return this.paramCatalogService.deleteParameter(code);
	}

	createParameterValue(
		paramCode: string,
		dto: CreateV2TypicalWorkParameterValueRequestDto,
	): Promise<V2TypicalWorkParameterValueDto> {
		return this.paramCatalogService.createParameterValue(paramCode, dto);
	}

	updateParameterValue(
		paramCode: string,
		valueCode: string,
		dto: UpdateV2TypicalWorkParameterValueRequestDto,
	): Promise<V2TypicalWorkParameterValueDto> {
		return this.paramCatalogService.updateParameterValue(
			paramCode,
			valueCode,
			dto,
		);
	}

	deleteParameterValue(paramCode: string, valueCode: string): Promise<void> {
		return this.paramCatalogService.deleteParameterValue(paramCode, valueCode);
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
				templateId: dto.templateId?.trim() || null,
			}),
		);

		const stream = dto.streamExecutor?.trim() ?? "";
		if (stream) {
			await this.ensureAssignment(work.id, stream);
			const starterNorm = dto.starterNormValue ?? 1;
			await this.normRepository.save(
				this.normRepository.create({
					workId: work.id,
					streamExecutor: stream,
					normValue: String(starterNorm),
					validFrom: new Date().toISOString().slice(0, 10),
					validTo: null,
				}),
			);
			return this.typicalWorkService.getWorkCard(work.id, stream);
		}

		return {
			id: work.id,
			name: work.name,
			archComponentType: work.archComponentType,
			workType: work.workType,
			streamExecutor: "",
			assignmentStatus: "unassigned" as const,
			triggerStatus: "no_triggers" as const,
			norms: [],
			rules: [],
			laborParams: [],
			formula: defaultWorkFormula(),
			rounding: defaultWorkRounding(),
		};
	}

	async createAssignment(
		dto: CreateV2TypicalWorkAssignmentRequestDto,
	): Promise<V2TypicalWorkAssignmentDto> {
		const work = await this.workRepository.findOne({
			where: { id: dto.workId },
		});
		if (!work) {
			throw new NotFoundException(`Typical work ${dto.workId} not found`);
		}
		const stream = dto.streamExecutor.trim();
		if (!stream) {
			throw new ConflictException({
				errors: [{ path: "streamExecutor", message: "Укажите стрим-исполнителя" }],
			});
		}
		const existing = await this.assignmentRepository.findOne({
			where: { workId: dto.workId, streamExecutor: stream },
		});
		if (existing) {
			throw new ConflictException({
				code: "ASSIGNMENT_EXISTS",
				message: "Уже добавлено в эту область",
			});
		}
		const assignment = await this.assignmentRepository.save(
			this.assignmentRepository.create({
				workId: dto.workId,
				streamExecutor: stream,
				isActive: true,
			}),
		);
		return {
			id: assignment.id,
			workId: assignment.workId,
			archComponentType: work.archComponentType,
			streamExecutor: assignment.streamExecutor,
			isActive: assignment.isActive,
		};
	}

	async deleteAssignment(assignmentId: string, confirm = false): Promise<void> {
		const assignment = await this.assignmentRepository.findOne({
			where: { id: assignmentId },
		});
		if (!assignment) {
			throw new NotFoundException(`Assignment ${assignmentId} not found`);
		}
		const usedInQuestionnaireVersions = await this.findQuestionnaireUsages(
			assignment.workId,
		);
		if (usedInQuestionnaireVersions.length > 0 && !confirm) {
			throw new ConflictException({
				code: "ASSIGNMENT_IN_USE",
				message:
					"Назначение учтено в версиях анкет. Подтвердите снятие, если нужно продолжить.",
				usedInQuestionnaireVersions,
			});
		}
		const { workId, streamExecutor } = assignment;
		await this.normRepository.delete({ workId, streamExecutor });
		await this.ruleRepository.delete({ workId, streamExecutor });
		await this.laborRepository.delete({ workId, streamExecutor });
		await this.laborParamRepository.delete({ workId, streamExecutor });
		await this.versionConfigRepository.delete({ workId, streamExecutor });
		await this.assignmentRepository.delete(assignmentId);
	}

	private async ensureAssignment(workId: string, stream: string) {
		const existing = await this.assignmentRepository.findOne({
			where: { workId, streamExecutor: stream },
		});
		if (existing) return existing;
		return this.assignmentRepository.save(
			this.assignmentRepository.create({
				workId,
				streamExecutor: stream,
				isActive: true,
			}),
		);
	}

	async deleteWork(workId: string, confirm = false): Promise<void> {
		const work = await this.workRepository.findOne({ where: { id: workId } });
		if (!work) throw new NotFoundException(`Typical work ${workId} not found`);

		const usedInQuestionnaireVersions =
			await this.findQuestionnaireUsages(workId);
		if (usedInQuestionnaireVersions.length > 0 && !confirm) {
			throw new ConflictException({
				code: "WORK_IN_USE",
				message:
					"Работа учтена в версиях анкет. Подтвердите удаление, если нужно удалить безвозвратно.",
				usedInQuestionnaireVersions,
			});
		}

		await this.workRepository.delete(workId);
	}

	private async findQuestionnaireUsages(workId: string) {
		const rows = await this.questionnaireRepository
			.createQueryBuilder("q")
			.where("q.form_data::text LIKE :needle", { needle: `%${workId}%` })
			.orderBy("q.updated_at", "DESC")
			.limit(20)
			.getMany();

		return rows.map((row) => ({
			questionnaireId: row.id,
			calcName: row.calcName,
			version: row.version,
		}));
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
			errors.push(
				...validateNormInputs(dto.norms, stream, {
					coverageDate: new Date().toISOString().slice(0, 10),
				}),
			);
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
			const seen = new Set<string>();
			for (const [index, row] of dto.laborCoefficients.entries()) {
				const key = `${row.paramCode}|${row.valueCode ?? ""}`;
				if (seen.has(key)) {
					errors.push({
						path: `laborCoefficients[${index}]`,
						message:
							"Дублируется комбинация (параметр, значение) для стрима",
					});
				}
				seen.add(key);
			}
		}

		if (dto.rounding) {
			errors.push(...validateRoundingInput(dto.rounding));
		}

		if (dto.formulaTerms) {
			const termsError = validateTermsFormula(dto.formulaTerms.terms);
			if (termsError) {
				errors.push({ path: "formulaTerms", message: termsError });
			}
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

		const touchesFormula =
			dto.formula !== undefined ||
			dto.formulaTerms !== undefined ||
			dto.rounding !== undefined;
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
		await this.ensureAssignment(workId, stream);

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
					dto.rules.map((rule, index) => {
						const operator = rule.operator;
						const isAnyOf = operator === "in" || operator === "not_in";
						const values = isAnyOf
							? (rule.values ??
								(rule.valueCode
									? [{ code: rule.valueCode, label: rule.valueLabel ?? null }]
									: []))
							: null;
						return this.ruleRepository.create({
							workId,
							streamExecutor: stream,
							paramCode: rule.paramCode,
							paramName: rule.paramName ?? null,
							operator,
							valueCode: isAnyOf ? null : (rule.valueCode ?? null),
							valueLabel: isAnyOf ? null : (rule.valueLabel ?? null),
							valueCodes: values,
							sortOrder: rule.sortOrder ?? index,
						});
					}),
				);
			}
		}

		if (dto.laborParams) {
			await this.laborRepository.delete({ workId, streamExecutor: stream });
			await this.laborParamRepository.delete({ workId, streamExecutor: stream });
			for (const group of dto.laborParams) {
				const kind = group.kind ?? "by_value";
				await this.laborParamRepository.save(
					this.laborParamRepository.create({
						workId,
						streamExecutor: stream,
						paramCode: group.paramCode,
						paramName: group.paramName ?? null,
						kind,
						anyOfValueCodes:
							kind === "any_of" ? (group.anyOf?.valueCodes ?? []) : null,
						anyOfValueLabels:
							kind === "any_of" ? (group.anyOf?.valueLabels ?? []) : null,
						coeffOn:
							kind === "any_of" ? String(group.anyOf?.coeffOn ?? 1) : null,
						coeffOff:
							kind === "any_of" ? String(group.anyOf?.coeffOff ?? 1) : null,
					}),
				);
				if (kind !== "any_of") {
					for (const row of group.coefficients ?? []) {
						await this.laborRepository.save(
							this.laborRepository.create({
								workId,
								streamExecutor: stream,
								paramCode: group.paramCode,
								paramName: group.paramName ?? null,
								valueCode: row.valueCode ?? null,
								valueLabel: row.valueLabel ?? null,
								coefficient: String(row.coefficient),
							}),
						);
					}
				}
			}
		} else if (dto.laborCoefficients) {
			await this.laborRepository.delete({ workId, streamExecutor: stream });
			await this.laborParamRepository.delete({ workId, streamExecutor: stream });
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
			const paramCodes = unique(
				dto.laborCoefficients.map((row) => row.paramCode),
			);
			for (const paramCode of paramCodes) {
				const row = dto.laborCoefficients.find((r) => r.paramCode === paramCode);
				await this.laborParamRepository.save(
					this.laborParamRepository.create({
						workId,
						streamExecutor: stream,
						paramCode,
						paramName: row?.paramName ?? null,
						kind: "by_value",
					}),
				);
			}
		}

		if (touchesFormula && dto.templateVersionId) {
			const existing = await this.versionConfigRepository.findOne({
				where: {
					workId,
					templateVersionId: dto.templateVersionId,
					streamExecutor: stream,
				},
			});
			const terms =
				dto.formulaTerms ??
				(existing
					? normalizeStoredFormula(existing.formula, existing.formulaText)
					: normalizeStoredFormula(null));
			const formula = dto.formula ?? termsToTokenFormula(terms);
			const rounding = dto.rounding ?? defaultWorkRounding();

			if (terms.terms.some((t) => t.kind === "transitive" && t.sourceAssignmentId)) {
				const assignment = await this.ensureAssignment(workId, stream);
				const configs = await this.versionConfigRepository.find({
					where: { templateVersionId: dto.templateVersionId },
				});
				const assignments = await this.assignmentRepository.find({
					where: { workId: In(configs.map((c) => c.workId)) },
				});
				const edges = new Map<string, string | null | undefined>();
				for (const configRow of configs) {
					const assignmentRow = assignments.find(
						(a) =>
							a.workId === configRow.workId &&
							a.streamExecutor === configRow.streamExecutor,
					);
					if (!assignmentRow) continue;
					const storedTerms = normalizeStoredFormula(
						configRow.formula,
						configRow.formulaText,
					);
					const transitive = storedTerms.terms.find((t) => t.kind === "transitive");
					edges.set(assignmentRow.id, transitive?.sourceAssignmentId ?? null);
				}
				const transitiveTerm = terms.terms.find((t) => t.kind === "transitive");
				if (transitiveTerm?.sourceAssignmentId) {
					const cycle = detectTransitiveCycle(
						assignment.id,
						transitiveTerm.sourceAssignmentId,
						edges,
					);
					if (cycle) {
						throw new ConflictException({
							errors: [
								{
									path: "formulaTerms",
									message: "Обнаружен цикл транзитивных ссылок",
								},
							],
						});
					}
				}
			}

			const compiled = compileStoredTypicalWorkResultLogic(formula, rounding);
			const payload = {
				formula: dto.formulaTerms ?? terms,
				formulaText: terms.text || formula.text || tokensToText(formula.tokens),
				roundingMode: rounding.mode,
				roundingStep:
					rounding.mode === "NONE" ? null : String(rounding.step ?? 0.1),
				calculationLogic: compiled,
			};
			if (existing) {
				Object.assign(existing, payload);
				await this.versionConfigRepository.save(existing);
			} else {
				await this.versionConfigRepository.save(
					this.versionConfigRepository.create({
						workId,
						templateVersionId: dto.templateVersionId,
						streamExecutor: stream,
						...payload,
					}),
				);
			}
		}

		if (dto.templateVersionId) {
			await this.ensureVersionConfigCalculationLogic(
				workId,
				stream,
				dto.templateVersionId,
			);
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

		const triggerStatusCatalog =
			await this.paramCatalogService.listTriggerStatusCatalog(atDate);
		const draftSource: Record<string, unknown> = { ...(dto.answers ?? {}) };
		const triggerStatus = computeWorkTriggerStatus(
			card.rules.map((rule) => ({
				paramCode: rule.paramCode,
				paramName: rule.paramName,
				operator: rule.operator,
				valueCode: rule.valueCode,
				valueLabel: rule.valueLabel,
				values: rule.values,
			})),
			triggerStatusCatalog,
			atDate,
			draftSource,
		);

		const norm =
			resolveActiveNormOnDate(card.norms, stream, atDate) ??
			null;
		if (norm == null) {
			return {
				formulaSymbolic: card.formulaTerms?.text ?? card.formula.text,
				formulaExpanded: "",
				result: null,
				error: `На текущую дату не задана действующая норма для стрима ${stream}`,
				triggerStatus,
			};
		}

		const coefficientValueCatalog =
			await this.paramCatalogService.listTriggerStatusCatalog(atDate);
		const paramCoefficients: Record<string, number> = {};
		const answerSource = dto.answers ?? {};
		for (const group of card.laborParams) {
			if (group.kind === "any_of" && group.anyOf) {
				paramCoefficients[group.paramCode] = resolveLaborAnyOfCoefficient(
					answerSource,
					group.paramCode,
					group.anyOf,
					group.paramName,
				);
				continue;
			}
			for (const row of group.coefficients) {
				if (!isWorkCoefficientValueAvailable(row, coefficientValueCatalog, atDate)) {
					continue;
				}
				const answer = answerSource[group.paramCode];
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

		const terms = card.formulaTerms ?? normalizeStoredFormula(null);
		let evaluated: {
			symbolic: string;
			expanded: string;
			value: number | null;
			error: string | null;
		};

		if (terms.terms.some((t) => t.kind === "transitive")) {
			const termsValue = evaluateTermsFormula({
				terms: terms.terms,
				baseNorm: norm,
				resolveFactorCoeff: (code) => paramCoefficients[code] ?? 1,
			});
			evaluated = {
				symbolic: terms.text,
				expanded: terms.text,
				value: termsValue,
				error: termsValue == null ? "Не удалось вычислить транзитивную формулу" : null,
			};
		} else {
			const termsValue = evaluateTermsFormula({
				terms: terms.terms,
				baseNorm: norm,
				resolveFactorCoeff: (code) => paramCoefficients[code] ?? 1,
			});
			if (termsValue != null) {
				evaluated = {
					symbolic: terms.text,
					expanded: terms.text,
					value: termsValue,
					error: null,
				};
			} else {
				evaluated = previewTypicalWorkCalculation(
					card.calculationLogic,
					{ formula: card.formula, rounding: card.rounding },
					{ norm, paramCoefficients },
				);
			}
		}

		return {
			formulaSymbolic: evaluated.symbolic,
			formulaExpanded: evaluated.expanded,
			result: evaluated.value,
			error: evaluated.error,
			triggerStatus,
		};
	}

	async backfillCalculationLogic(): Promise<{ updated: number; skipped: number }> {
		const configs = await this.versionConfigRepository.find();
		let updated = 0;
		let skipped = 0;

		for (const config of configs) {
			if (!needsCalculationLogicBackfill(config.calculationLogic)) {
				skipped++;
				continue;
			}
			const compiled = compileCalculationLogicFromVersionConfig(config);
			if (!compiled) {
				skipped++;
				continue;
			}
			config.calculationLogic = compiled;
			await this.versionConfigRepository.save(config);
			updated++;
		}

		return { updated, skipped };
	}

	private async ensureVersionConfigCalculationLogic(
		workId: string,
		streamExecutor: string,
		templateVersionId: string,
	): Promise<void> {
		const config = await this.versionConfigRepository.findOne({
			where: { workId, streamExecutor, templateVersionId },
		});
		if (!config || !needsCalculationLogicBackfill(config.calculationLogic)) return;
		const compiled = compileCalculationLogicFromVersionConfig(config);
		if (!compiled) return;
		config.calculationLogic = compiled;
		await this.versionConfigRepository.save(config);
	}
}

function unique(values: string[]): string[] {
	return [...new Set(values.filter(Boolean))];
}
