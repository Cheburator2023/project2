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
	CopyV2TypicalWorkRequestDto,
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
	V2TypicalWorkSchemaFieldSyncImpactDto,
	V2TypicalWorkSchemaFieldSyncRequestDto,
	V2TypicalWorkSchemaBulkSyncResponseDto,
	BulkDeleteV2TypicalWorksResultDto,
} from "@smart-anketa/api-contract";
import {
	buildWorkSchemaParamsFromTemplate,
	collectTypicalWorkSchemaConsistencyIssues,
	enrichWorkSchemaParamsWithCatalogAliases,
	findCatalogPreviousCodeForSchemaParam,
	buildTypicalWorkFactorCoeffResolver,
	applyWorkRounding,
	compileCalculationLogicFromVersionConfig,
	collectAllowedParamCodes,
	compileStoredTypicalWorkResultLogic,
	computeTypicalWorkFormulaTotal,
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
	resolveWorkSchemaParamForRule,
	resolveLaborAnyOfCoefficient,
	resolveByValueLaborParamCoefficients,
	reconcileTypicalWorkCardWithSchemaField,
	syncTermsFromTokenFormula,
	termsToTokenFormula,
	tokensToText,
	validateCoefficientValue,
	validateFormulaAgainstParams,
	validateFormulaAgainstLaborParams,
	validateFormulaNonNegativeEffort,
	laborParamRefsFromPatchGroups,
	reconcileFormulaLaborParamTokens,
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
import { normalizeArchComponentType, slugParamCode } from "../utils/v2-typical-work-catalog.util";
import { V2_FACTORY_TYPICAL_WORKS_SNAPSHOT } from "../constants/v2-factory-typical-works-catalog";
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

	listParameters(
		includeInactive = false,
	): Promise<V2TypicalWorkParameterListResponseDto> {
		return this.paramCatalogService.listParameters(undefined, includeInactive);
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

	/** Глубокая копия работы в новую (нормы/триггеры/параметры/формулы), привязанная к схеме. */
	async copyWork(workId: string, dto: CopyV2TypicalWorkRequestDto) {
		const source = await this.workRepository.findOne({ where: { id: workId } });
		if (!source) {
			throw new NotFoundException(`Typical work ${workId} not found`);
		}

		const copy = await this.workRepository.save(
			this.workRepository.create({
				name: dto.name?.trim() || `${source.name} (копия)`,
				archComponentType: source.archComponentType,
				workType: source.workType,
				catalogKey: null,
				templateId: dto.templateId?.trim() || null,
			}),
		);

		const [assignments, norms, rules, laborRows, laborParams, versionConfigs] =
			await Promise.all([
				this.assignmentRepository.find({ where: { workId } }),
				this.normRepository.find({ where: { workId } }),
				this.ruleRepository.find({ where: { workId } }),
				this.laborRepository.find({ where: { workId } }),
				this.laborParamRepository.find({ where: { workId } }),
				this.versionConfigRepository.find({ where: { workId } }),
			]);

		const strip = <
			T extends { id?: string; createdAt?: Date; updatedAt?: Date },
		>(
			row: T,
		): Omit<T, "id" | "createdAt" | "updatedAt"> => {
			const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = row;
			return rest;
		};

		for (const assignment of assignments) {
			await this.assignmentRepository.save(
				this.assignmentRepository.create({
					...strip(assignment),
					workId: copy.id,
				}),
			);
		}
		for (const norm of norms) {
			await this.normRepository.save(
				this.normRepository.create({ ...strip(norm), workId: copy.id }),
			);
		}
		for (const rule of rules) {
			await this.ruleRepository.save(
				this.ruleRepository.create({ ...strip(rule), workId: copy.id }),
			);
		}
		for (const labor of laborRows) {
			await this.laborRepository.save(
				this.laborRepository.create({ ...strip(labor), workId: copy.id }),
			);
		}
		for (const param of laborParams) {
			await this.laborParamRepository.save(
				this.laborParamRepository.create({ ...strip(param), workId: copy.id }),
			);
		}
		for (const config of versionConfigs) {
			await this.versionConfigRepository.save(
				this.versionConfigRepository.create({
					...strip(config),
					workId: copy.id,
				}),
			);
		}

		const stream =
			dto.streamExecutor?.trim() ||
			assignments[0]?.streamExecutor ||
			norms[0]?.streamExecutor ||
			"";
		if (stream) {
			await this.ensureAssignment(copy.id, stream);
			return this.typicalWorkService.getWorkCard(copy.id, stream);
		}

		return {
			id: copy.id,
			name: copy.name,
			archComponentType: copy.archComponentType,
			workType: copy.workType,
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
				errors: [
					{ path: "streamExecutor", message: "Укажите стрим-исполнителя" },
				],
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
		const result = await this.bulkDeleteWorks([workId], confirm);
		if (result.failed.some((row) => row.id === workId && row.reason === "not_found")) {
			throw new NotFoundException(`Typical work ${workId} not found`);
		}
		const conflict = result.conflicts.find((row) => row.workId === workId);
		if (conflict) {
			throw new ConflictException({
				code: "WORK_IN_USE",
				message:
					"Работа учтена в версиях анкет. Подтвердите удаление, если нужно удалить безвозвратно.",
				usedInQuestionnaireVersions: conflict.usedInQuestionnaireVersions,
			});
		}
		if (result.failed.some((row) => row.id === workId)) {
			throw new ConflictException({
				code: "DELETE_FAILED",
				message: "Не удалось удалить типовую работу",
			});
		}
	}

	async bulkDeleteWorks(
		ids: string[],
		confirm = false,
	): Promise<BulkDeleteV2TypicalWorksResultDto> {
		const uniqueIds = [...new Set(ids)];
		const deletedIds: string[] = [];
		const conflicts: BulkDeleteV2TypicalWorksResultDto["conflicts"] = [];
		const failed: BulkDeleteV2TypicalWorksResultDto["failed"] = [];

		const works = await this.workRepository.find({
			where: { id: In(uniqueIds) },
		});
		const worksById = new Map(works.map((work) => [work.id, work]));
		const idsToDelete: string[] = [];

		for (const workId of uniqueIds) {
			if (!worksById.has(workId)) {
				failed.push({
					id: workId,
					reason: "not_found",
					message: "Типовая работа не найдена",
				});
				continue;
			}

			const usedInQuestionnaireVersions =
				await this.findQuestionnaireUsages(workId);
			if (usedInQuestionnaireVersions.length > 0 && !confirm) {
				conflicts.push({ workId, usedInQuestionnaireVersions });
				continue;
			}

			idsToDelete.push(workId);
		}

		if (idsToDelete.length > 0) {
			try {
				await this.workRepository.delete({ id: In(idsToDelete) });
				deletedIds.push(...idsToDelete);
			} catch {
				for (const workId of idsToDelete) {
					failed.push({
						id: workId,
						reason: "delete_failed",
						message: "Не удалось удалить типовую работу",
					});
				}
			}
		}

		return { deletedIds, conflicts, failed };
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
				errors: [
					{ path: "streamExecutor", message: "Укажите стрим-исполнителя" },
				],
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
						message: "Дублируется комбинация (параметр, значение) для стрима",
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
			if (dto.laborParams?.length) {
				errors.push(
					...validateFormulaAgainstLaborParams(
						dto.formula.tokens,
						laborParamRefsFromPatchGroups(dto.laborParams),
					),
				);
			} else if (dto.laborCoefficients) {
				errors.push(
					...validateFormulaAgainstParams(
						dto.formula.tokens,
						collectAllowedParamCodes(dto.laborCoefficients),
					),
				);
			} else {
				const existingLaborParams = await this.laborParamRepository.find({
					where: { workId, streamExecutor: stream },
				});
				if (existingLaborParams.length > 0) {
					errors.push(
						...validateFormulaAgainstLaborParams(
							dto.formula.tokens,
							existingLaborParams.map((row) => ({
								paramCode: row.paramCode,
								paramName: row.paramName,
							})),
						),
					);
				} else {
					const existingLabor = await this.laborRepository.find({
						where: { workId, streamExecutor: stream },
					});
					errors.push(
						...validateFormulaAgainstParams(
							dto.formula.tokens,
							collectAllowedParamCodes(
								existingLabor.map((row) => ({ paramCode: row.paramCode })),
							),
						),
					);
				}
			}
		}

		if ((dto.formula || dto.formulaTerms) && dto.norms?.length) {
			errors.push(
				...validateFormulaNonNegativeEffort({
					formula: dto.formula,
					formulaTerms: dto.formulaTerms,
					rounding: dto.rounding,
					norms: dto.norms,
					laborParams: dto.laborParams,
					coverageDate: new Date().toISOString().slice(0, 10),
				}),
			);
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
			work.archComponentType = normalizeArchComponentType(
				dto.archComponentType,
			);
		}
		if (dto.templateId !== undefined) {
			const requested = dto.templateId?.trim() || null;
			if (requested) {
				if (work.templateId && work.templateId !== requested) {
					throw new ConflictException({
						code: "WORK_TEMPLATE_MISMATCH",
						message: "Работа уже привязана к другой схеме",
					});
				}
				work.templateId = requested;
			}
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
							schemaFieldUid: rule.schemaFieldUid ?? null,
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
			await this.laborParamRepository.delete({
				workId,
				streamExecutor: stream,
			});
			for (const group of dto.laborParams) {
				const kind = group.kind ?? "by_value";
				await this.laborParamRepository.save(
					this.laborParamRepository.create({
						workId,
						streamExecutor: stream,
						schemaFieldUid: group.schemaFieldUid ?? null,
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
			await this.laborParamRepository.delete({
				workId,
				streamExecutor: stream,
			});
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
				const row = dto.laborCoefficients.find(
					(r) => r.paramCode === paramCode,
				);
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

			let formulaTokens = formula.tokens;
			if (dto.laborParams?.length) {
				formulaTokens = reconcileFormulaLaborParamTokens(
					formulaTokens,
					laborParamRefsFromPatchGroups(dto.laborParams),
				);
			} else {
				const laborHeaders = await this.laborParamRepository.find({
					where: { workId, streamExecutor: stream },
				});
				if (laborHeaders.length > 0) {
					formulaTokens = reconcileFormulaLaborParamTokens(
						formulaTokens,
						laborHeaders.map((row) => ({
							paramCode: row.paramCode,
							paramName: row.paramName,
						})),
					);
				}
			}
			const resolvedFormula = {
				...formula,
				tokens: formulaTokens,
				text:
					tokensToText(formulaTokens) ||
					formula.text?.trim() ||
					terms.text ||
					"",
			};

			if (
				terms.terms.some((t) => t.kind === "transitive" && t.sourceAssignmentId)
			) {
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
					const transitive = storedTerms.terms.find(
						(t) => t.kind === "transitive",
					);
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

			const compiled = compileStoredTypicalWorkResultLogic(
				resolvedFormula,
				rounding,
			);
			const payload = {
				// Tokens — канонический источник визуального редактора. Terms-модель
				// не умеет без потерь представить все арифметические выражения
				// (например, вычитание), поэтому хранить только её нельзя.
				formula: resolvedFormula.tokens,
				formulaText: resolvedFormula.text,
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

	async reconcileSchemaField(
		dto: V2TypicalWorkSchemaFieldSyncRequestDto,
		workArchComponent?: string | null,
		options?: {
			workId?: string;
			unboundLaborOnly?: boolean;
		},
	): Promise<V2TypicalWorkSchemaFieldSyncImpactDto> {
		const configs = await this.versionConfigRepository.find({
			where: { templateVersionId: dto.templateVersionId },
		});
		const impact: V2TypicalWorkSchemaFieldSyncImpactDto = {
			worksMatched: 0,
			worksUpdated: 0,
			rulesUpdated: 0,
			rulesRemoved: 0,
			laborParamsUpdated: 0,
			laborParamsRemoved: 0,
			formulasInvalidated: 0,
		};

		if (configs.length === 0) {
			return impact;
		}

		const field = dto.field;
		const paramCodes = [
			field.previousCode,
			field.code,
			...(field.aliasCodes ?? []),
		].filter((code): code is string => Boolean(code?.trim()));
		const matchWhere = [
			{ schemaFieldUid: field.schemaFieldUid },
			...paramCodes.map((paramCode) => ({ paramCode })),
			...(field.name?.trim() ? [{ paramName: field.name.trim() }] : []),
		];
		const legacyMatchWhere = [
			...paramCodes.map((paramCode) => ({ paramCode })),
			...(field.name?.trim() ? [{ paramName: field.name.trim() }] : []),
		];

		const [foundRules, foundLaborHeaders, foundLaborRows] = await Promise.all([
			this.ruleRepository.find({ where: matchWhere }),
			this.laborParamRepository.find({ where: matchWhere }),
			legacyMatchWhere.length > 0
				? this.laborRepository.find({ where: legacyMatchWhere })
				: Promise.resolve([]),
		]);
		const matchingRules = options?.unboundLaborOnly ? [] : foundRules;
		const matchingLaborHeaders = options?.unboundLaborOnly
			? foundLaborHeaders.filter((row) => !row.schemaFieldUid)
			: foundLaborHeaders;
		const matchingLaborRows = options?.unboundLaborOnly ? [] : foundLaborRows;

		const affectedKeys = new Set(
			[...matchingRules, ...matchingLaborHeaders, ...matchingLaborRows].map(
				(row) => `${row.workId}:${row.streamExecutor}`,
			),
		);
		const normalizedWorkArch = workArchComponent
			? normalizeArchComponentType(workArchComponent)
			: null;
		const workArchById = normalizedWorkArch
			? new Map(
					(
						await this.workRepository.find({
							where: { id: In(configs.map((config) => config.workId)) },
						})
					).map((work) => [
						work.id,
						normalizeArchComponentType(work.archComponentType),
					]),
				)
			: null;

		for (const config of configs) {
			if (options?.workId && config.workId !== options.workId) continue;
			const configKey = `${config.workId}:${config.streamExecutor}`;
			if (!affectedKeys.has(configKey)) continue;
			if (
				normalizedWorkArch &&
				workArchById?.get(config.workId) !== normalizedWorkArch
			) {
				continue;
			}

			const card = await this.typicalWorkService.getWorkCardForSchemaSync(
				config.workId,
				config.streamExecutor,
				dto.templateVersionId,
			);
			const reconciled = reconcileTypicalWorkCardWithSchemaField(card, dto);
			if (!reconciled.changed) continue;

			impact.worksMatched++;
			impact.rulesUpdated += reconciled.impact.rulesUpdated;
			impact.rulesRemoved += reconciled.impact.rulesRemoved;
			impact.laborParamsUpdated += reconciled.impact.laborParamsUpdated;
			impact.laborParamsRemoved += reconciled.impact.laborParamsRemoved;
			impact.formulasInvalidated += reconciled.impact.formulasInvalidated;

			if (dto.mode !== "apply") continue;
			const next = reconciled.card;
			try {
				await this.patchWork(config.workId, {
					streamExecutor: config.streamExecutor,
					templateVersionId: dto.templateVersionId,
					rules: next.rules.map((rule) => ({
						id: rule.id,
						schemaFieldUid: rule.schemaFieldUid ?? null,
						paramCode: rule.paramCode,
						paramName: rule.paramName,
						operator: rule.operator,
						valueCode: rule.valueCode,
						valueLabel: rule.valueLabel,
						values: rule.values,
						sortOrder: rule.sortOrder,
					})),
					laborParams: next.laborParams.map((group) => ({
						schemaFieldUid: group.schemaFieldUid ?? null,
						paramCode: group.paramCode,
						paramName: group.paramName,
						kind: group.kind,
						coefficients: group.coefficients.map((row) => ({
							id: row.id,
							paramCode: row.paramCode,
							paramName: row.paramName,
							valueCode: row.valueCode,
							valueLabel: row.valueLabel,
							coefficient: row.coefficient,
						})),
						anyOf: group.anyOf,
					})),
					formula: next.formula,
					formulaTerms: syncTermsFromTokenFormula(next.formula),
					rounding: next.rounding,
				});
				impact.worksUpdated++;
			} catch (error) {
				if (!(error instanceof ConflictException)) {
					throw error;
				}
			}
		}

		return impact;
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

		const norm = resolveActiveNormOnDate(card.norms, stream, atDate) ?? null;
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
			}
		}
		for (const group of card.laborParams) {
			if (group.kind === "any_of") continue;
			const eligibleRows = group.coefficients
				.filter((row) =>
					isWorkCoefficientValueAvailable(row, coefficientValueCatalog, atDate),
				)
				.map((row) => ({
					paramCode: group.paramCode,
					paramName: group.paramName,
					valueCode: row.valueCode ?? null,
					valueLabel: row.valueLabel ?? null,
					coefficient: row.coefficient,
				}));
			Object.assign(
				paramCoefficients,
				resolveByValueLaborParamCoefficients(answerSource, eligibleRows),
			);
		}

		const terms = card.formulaTerms ?? normalizeStoredFormula(null);
		const anyOfParams =
			card.laborParams
				?.filter((group) => group.kind === "any_of" && group.anyOf)
				.map((group) => ({
					paramCode: group.paramCode,
					paramName: group.paramName,
					anyOf: group.anyOf!,
				})) ?? [];
		const resolveFactorCoeff = buildTypicalWorkFactorCoeffResolver({
			paramCoefficients,
			anyOfParams,
			source: answerSource,
		});
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
				resolveFactorCoeff,
			});
			evaluated = {
				symbolic: terms.text,
				expanded: terms.text,
				value:
					termsValue == null
						? null
						: applyWorkRounding(termsValue, card.rounding),
				error:
					termsValue == null
						? "Не удалось вычислить транзитивную формулу"
						: null,
			};
		} else {
			const total = computeTypicalWorkFormulaTotal({
				calculationLogic: card.calculationLogic,
				formula: card.formula,
				formulaText: card.formula.text ?? card.formulaTerms?.text,
				terms,
				rounding: card.rounding,
				norm,
				paramCoefficients,
				source: answerSource,
				resolveFactorCoeff,
			});
			if (total != null) {
				const tokenPreview = previewTypicalWorkCalculation(
					card.calculationLogic,
					{ formula: card.formula, rounding: card.rounding },
					{ norm, paramCoefficients, source: answerSource },
				);
				evaluated = {
					symbolic:
						tokenPreview.symbolic ||
						card.formulaTerms?.text ||
						card.formula.text,
					expanded: tokenPreview.expanded || tokenPreview.symbolic,
					value: total,
					error: null,
				};
			} else {
				evaluated = previewTypicalWorkCalculation(
					card.calculationLogic,
					{ formula: card.formula, rounding: card.rounding },
					{ norm, paramCoefficients, source: answerSource },
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

	async backfillCalculationLogic(): Promise<{
		updated: number;
		skipped: number;
	}> {
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
		if (!config || !needsCalculationLogicBackfill(config.calculationLogic))
			return;
		const compiled = compileCalculationLogicFromVersionConfig(config);
		if (!compiled) return;
		config.calculationLogic = compiled;
		await this.versionConfigRepository.save(config);
	}

	async reconcileAllSchemaFieldsForVersion(
		templateVersionId: string,
		mode: "dryRun" | "apply" = "apply",
	): Promise<V2TypicalWorkSchemaBulkSyncResponseDto> {
		const version = await this.templateVersionRepository.findOne({
			where: { id: templateVersionId },
		});
		if (!version) {
			throw new NotFoundException(`Version with id ${templateVersionId} not found`);
		}

		const catalog = await this.paramCatalogService.listParameters();
		const schemaParams = enrichWorkSchemaParamsWithCatalogAliases(
			buildWorkSchemaParamsFromTemplate({
				jsonSchema: (version.jsonSchema ?? {}) as Record<string, unknown>,
				uiSchema: (version.uiSchema ?? {}) as Record<string, unknown>,
			}),
			catalog.items,
		);
		const aggregate: V2TypicalWorkSchemaBulkSyncResponseDto = {
			worksMatched: 0,
			worksUpdated: 0,
			rulesUpdated: 0,
			rulesRemoved: 0,
			laborParamsUpdated: 0,
			laborParamsRemoved: 0,
			formulasInvalidated: 0,
			fieldsProcessed: 0,
			consistencyIssues: [],
		};
		const schemaParamNameCounts = new Map<string, number>();
		for (const schemaParam of schemaParams) {
			const normalizedName = schemaParam.name.trim().toLocaleLowerCase("ru");
			schemaParamNameCounts.set(
				normalizedName,
				(schemaParamNameCounts.get(normalizedName) ?? 0) + 1,
			);
		}

		for (const schemaParam of schemaParams) {
			if (!schemaParam.schemaFieldUid) continue;
			const previousCode =
				findCatalogPreviousCodeForSchemaParam(catalog.items, schemaParam) ??
				schemaParam.code;
			const duplicateNameCount =
				schemaParamNameCounts.get(
					schemaParam.name.trim().toLocaleLowerCase("ru"),
				) ?? 0;
			const impact = await this.reconcileSchemaField(
				{
					templateVersionId,
					mode,
					operation: "upsert",
					field: {
						schemaFieldUid: schemaParam.schemaFieldUid,
						previousCode,
						aliasCodes: schemaParam.sourceKeys,
						code: schemaParam.code,
						name: schemaParam.name,
						values:
							schemaParam.values && schemaParam.values.length > 0
								? schemaParam.values
								: undefined,
					},
				},
				duplicateNameCount > 1 ? schemaParam.archComponent : null,
			);
			aggregate.fieldsProcessed++;
			aggregate.worksMatched += impact.worksMatched;
			aggregate.worksUpdated += impact.worksUpdated;
			aggregate.rulesUpdated += impact.rulesUpdated;
			aggregate.rulesRemoved += impact.rulesRemoved;
			aggregate.laborParamsUpdated += impact.laborParamsUpdated;
			aggregate.laborParamsRemoved += impact.laborParamsRemoved;
			aggregate.formulasInvalidated += impact.formulasInvalidated;
		}

		const configs = await this.versionConfigRepository.find({
			where: { templateVersionId },
		});
		const repairedBindings = new Set<string>();
		for (const config of configs) {
			const card = await this.typicalWorkService.getWorkCardForSchemaSync(
				config.workId,
				config.streamExecutor,
				templateVersionId,
			);
			for (const labor of card.laborParams) {
				if (labor.schemaFieldUid) continue;
				const resolved = resolveWorkSchemaParamForRule(labor, schemaParams);
				if (!resolved?.schemaFieldUid) continue;

				const bindingKey = `${config.workId}:${resolved.schemaFieldUid}`;
				if (repairedBindings.has(bindingKey)) continue;
				repairedBindings.add(bindingKey);

				const impact = await this.reconcileSchemaField(
					{
						templateVersionId,
						mode,
						operation: "upsert",
						field: {
							schemaFieldUid: resolved.schemaFieldUid,
							previousCode: labor.paramCode,
							aliasCodes: resolved.sourceKeys,
							code: resolved.code,
							name: resolved.name,
							values:
								resolved.values && resolved.values.length > 0
									? resolved.values
									: undefined,
						},
					},
					null,
					{ workId: config.workId, unboundLaborOnly: true },
				);
				aggregate.worksMatched += impact.worksMatched;
				aggregate.worksUpdated += impact.worksUpdated;
				aggregate.rulesUpdated += impact.rulesUpdated;
				aggregate.rulesRemoved += impact.rulesRemoved;
				aggregate.laborParamsUpdated += impact.laborParamsUpdated;
				aggregate.laborParamsRemoved += impact.laborParamsRemoved;
				aggregate.formulasInvalidated += impact.formulasInvalidated;
			}
		}

		for (const config of configs) {
			const card = await this.typicalWorkService.getWorkCardForSchemaSync(
				config.workId,
				config.streamExecutor,
				templateVersionId,
			);
			aggregate.consistencyIssues.push(
				...collectTypicalWorkSchemaConsistencyIssues({
					schemaParams,
					rules: card.rules,
					laborParamCodes: card.laborParams.map((group) => ({
						paramCode: group.paramCode,
						paramName: group.paramName,
						schemaFieldUid: group.schemaFieldUid,
					})),
					formulaParamCodes: card.formula.tokens
						.filter(
							(token) =>
								token.kind === "param_coeff" || token.kind === "param_anyof",
						)
						.map((token) => token.paramCode),
					methodologyParams:
						V2_FACTORY_TYPICAL_WORKS_SNAPSHOT.dictionaries.map((dict) => ({
							code: slugParamCode(dict.name),
							name: dict.name,
						})),
				}).map((issue) => ({
					...issue,
					workId: config.workId,
					streamExecutor: config.streamExecutor,
				})),
			);
		}

		return aggregate;
	}
}

function unique(values: string[]): string[] {
	return [...new Set(values.filter(Boolean))];
}
