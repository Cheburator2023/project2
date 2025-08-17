import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { CreateCalculationDto, PaginationDto } from "../dto";
import { UpdateCalculationDto } from "../dto/request/update-calculation.dto";
import { Calculation, CalculationStatus } from "../entities/calculation.entity";
import { PaginatedResult } from "../interfaces/paginated-result.interface";
import { AbortSignal } from "node-abort-controller";
import { CustomLogger } from "src/shared/services/logger.service";
import { v4 as uuidv4 } from "uuid";
import { RetryUtil } from "src/shared/utils/retry.util";
import { InMemoryFilterService } from "./in-memory-filter.service";
import {
	AgGridFilterModel,
	AgGridSortModel,
} from "../dto/request/export-calculation.dto";
import { CreateNewVersionDto } from "../dto/request/create-new-version.dto";
import { CreateCloneDto } from "../dto/request/create-clone.dto";

@Injectable()
export class CalculationService {
	constructor(
		@InjectRepository(Calculation)
		private calculationRepository: Repository<Calculation>,
		private readonly customLogger: CustomLogger,
		private readonly inMemoryFilterService: InMemoryFilterService,
	) {}

	/**
	 * Creates a new calculation
	 */
	async create(
		createCalculationDto: CreateCalculationDto,
		user: any,
		signal?: AbortSignal,
	): Promise<Calculation> {
		return RetryUtil.withRetry(
			async () => {
				const eventId = uuidv4();
				this.customLogger.log(
					"Creating new calculation",
					"CalculationService.create",
					{
						eventId,
						userId: user?.id,
						mdc: {
							operation: "createCalculation",
							userId: user?.id,
						},
					},
				);
				this.checkAborted(signal);

				try {
					if (
						createCalculationDto.algorithmComplexity &&
						createCalculationDto.algorithmComplexity.length > 8
					) {
						throw new Error("Maximum 8 algorithm types allowed");
					}

					if (createCalculationDto.algorithmComplexity) {
						const types = createCalculationDto.algorithmComplexity
							.map((item) => item.algorithmType)
							.filter((type) => type?.trim() !== "");

						if (types.length === 0) {
							throw new Error(
								"At least one algorithm type must have a non-empty value",
							);
						}

						const uniqueTypes = new Set(types);
						if (types.length !== uniqueTypes.size) {
							throw new Error(
								"Algorithm types must be unique(no dublicate allowed)",
							);
						}
					}

					const generalUncertaintyObject = {};
					if (createCalculationDto.generalUncertainty) {
						createCalculationDto.generalUncertainty.forEach((item) => {
							generalUncertaintyObject[item.type] = {
								probability: item.probability,
								influence: item.influence,
							};
						});
					}

					this.checkAborted(signal);

					const authorName = user
						? `${user.given_name || ""} ${user.family_name || ""}`.trim() ||
							user.preferred_username ||
							user.email ||
							"Система"
						: "Система";

					const calculationResult =
						(createCalculationDto as any).calculationResult?.map((item) => ({
							stageName: item.stageName,
							score: item.score,
							stageBaseValue: item.stageBaseValue,
							percentFromAverage: item.percentFromAverage,
							offset: item.offset,
							disabled: item.disabled,
						})) || [];

					this.checkAborted(signal);

					const seriesId = this.generateSeriesId();
					const version = "1.0.0";
					const readableId = `Calc-${seriesId}-version-${version}`;

					await this.ensureReadableIdIsUnique(seriesId, readableId);

					const calculation = this.calculationRepository.create({
						calcName: createCalculationDto.calcName || "Новый расчет",
						rfd: createCalculationDto.rfd || "",
						streamExecutor: createCalculationDto.streamExecutor,
						department: createCalculationDto.department,
						customerName: createCalculationDto.customerName,
						comment: createCalculationDto.comment,
						status: CalculationStatus.ACTIVE,
						version,
						seriesId,
						parentCalcId: null,
						readableId,
						questionnaireData: {
							calcName: createCalculationDto.calcName || "Новый расчет",
							modelsCount: createCalculationDto.modelsCount,
							setupComplexity: createCalculationDto.setupComplexity,
							initiativeTimeline: createCalculationDto.initiativeTimeline,
							initiativeCost: createCalculationDto.initiativeCost,
							uncertaintyAdjustment: createCalculationDto.uncertaintyAdjustment,
							generalUncertainty: generalUncertaintyObject,
							readyPromReports: createCalculationDto.readyPromReports,
							assessedInitiativesCount:
								createCalculationDto.assessedInitiativesCount,
							dataSourcesCount: createCalculationDto.dataSourcesCount,
							pilotModelRequired: createCalculationDto.pilotModelRequired,
							algorithmComplexity: createCalculationDto.algorithmComplexity,
							pilotSupportRequired: createCalculationDto.pilotSupportRequired,
							autoMlRequired: createCalculationDto.autoMlRequired,
							productionAdditionalReports:
								createCalculationDto.productionAdditionalReports?.toString(),
							productionDeploymentChannels:
								createCalculationDto.productionDeploymentChannels.map(
									(channel) => ({
										deploymentChannel: channel,
									}),
								),
							calculationResult:
								calculationResult.length > 0 ? calculationResult : undefined,
						},
						finalCoefficient: createCalculationDto.finalCoefficient,
						author: authorName,
					} as Partial<Calculation>);

					this.checkAborted(signal);

					const savedCalculation =
						await this.calculationRepository.save(calculation);
					this.customLogger.log(
						"New calculation created successfully",
						"CalculationService.create",
						{
							eventId,
							calculationId: savedCalculation.id,
							seriesId: savedCalculation.seriesId,
							version: savedCalculation.version,
						},
					);

					return savedCalculation;
				} catch (error) {
					this.customLogger.error(
						"Failed to create calculation",
						error.stack,
						"CalculationService.create",
						{
							eventId,
							error: error.message,
							dto: createCalculationDto,
						},
					);
					if (
						error.message === "Maximum 8 algorithm types allowed" ||
						error.message ===
							"Algorithm types must be unique (no duplicates allowed)" ||
						error.message ===
							"At least one algorithm type must have a non-empty value"
					) {
						throw new BadRequestException({
							message: "Validation failed.",
							errors: [
								{
									field: "algorithmComplexity",
									message: error.message,
								},
							],
						});
					}

					throw new BadRequestException(
						`Failed to create calculation: ${error.message}`,
					);
				}
			},
			3,
			1000,
			(error) =>
				!(error instanceof BadRequestException || error?.name === "AbortError"),
		);
	}

	/**
	 * Updates calculation basic information
	 */
	async updateCalculation(
		id: string,
		updateDto: UpdateCalculationDto,
		user: any,
		signal?: AbortSignal,
	): Promise<Calculation> {
		return RetryUtil.withRetry(
			async () => {
				const eventId = uuidv4();
				this.customLogger.log(
					"Updating Calculation",
					"CalculationService.updateCalculation",
					{
						eventId,
						userId: user?.id,
						mdc: {
							operation: "updateCalculation",
							userId: user?.id,
						},
					},
				);
				this.checkAborted(signal);

				try {
					const calculation = await this.calculationRepository
						.createQueryBuilder("calculation")
						.leftJoinAndSelect(
							"calculation.parentCalc",
							"parentCalc",
							"calculation.parentCalcId = parentCalc.id",
						)
						.where("calculation.id = :id", { id })
						.getOne();

					if (!calculation) {
						this.customLogger.warn(
							`Calculation with ID ${id} not found`,
							"CalculationService.updateCalculation",
							{
								eventId,
								calculationId: id,
							},
						);
						throw new NotFoundException(`Calculation with ID ${id} not found`);
					}

					this.checkAborted(signal);

					if (updateDto.calcName !== undefined) {
						calculation.calcName = updateDto.calcName;
						calculation.questionnaireData.calcName = updateDto.calcName;
					}
					if (updateDto.rfd !== undefined) calculation.rfd = updateDto.rfd;
					if (updateDto.streamExecutor !== undefined)
						calculation.streamExecutor = updateDto.streamExecutor;
					if (updateDto.department !== undefined)
						calculation.department = updateDto.department;
					if (updateDto.customerName !== undefined)
						calculation.customerName = updateDto.customerName;
					if (updateDto.comment !== undefined)
						calculation.comment = updateDto.comment;

					this.checkAborted(signal);

					const updatedCalculation =
						await this.calculationRepository.save(calculation);
					this.customLogger.log(
						"Calculation updated successfully",
						"CalculationService.updateCalculation",
						{
							eventId,
							calculationId: id,
						},
					);
					return updatedCalculation;
				} catch (error) {
					this.customLogger.error(
						`Failed to update calculation with ID: ${id}`,
						error.stack,
						"CalculationService.updateCalculation",
						{
							eventId,
							calculationId: id,
							error: error.message,
							updateDto,
						},
					);
					if (error instanceof NotFoundException) {
						throw error;
					}
					throw new BadRequestException(
						`Failed to update calculation: ${error.message}`,
					);
				}
			},
			3,
			1000,
			(error) =>
				!(error instanceof NotFoundException || error?.name === "AbortError"),
		);
	}

	/**
	 * Finds a calculation by ID
	 */
	async findOne(
		id: string,
		user: any,
		signal?: AbortSignal,
	): Promise<Calculation> {
		return RetryUtil.withRetry(
			async () => {
				const eventId = uuidv4();
				this.customLogger.log(
					`Fetching calculation with ID: ${id}`,
					"CalculationService.findOne",
					{
						eventId,
						userId: user?.id,
						mdc: {
							operation: "findOne",
							userId: user?.id,
						},
					},
				);
				this.checkAborted(signal);

				try {
					const calculation = await this.calculationRepository
						.createQueryBuilder("calculation")
						.leftJoinAndSelect(
							"calculation.parentCalc",
							"parentCalc",
							"calculation.parentCalcId = parentCalc.id",
						)
						.where("calculation.id = :id", { id })
						.getOne();

					this.checkAborted(signal);

					if (!calculation) {
						this.customLogger.warn(
							`Calculation with ID ${id} not found`,
							"CalculationService.findOne",
							{
								eventId,
								calculationId: id,
							},
						);
						throw new NotFoundException(`Calculation with ID ${id} not found`);
					}

					this.customLogger.log(
						`Successfully fetched calculation with ID: ${id}`,
						"CalculationService.findOne",
						{
							eventId,
							calculationId: id,
						},
					);
					return calculation;
				} catch (error) {
					this.customLogger.error(
						`Failed to fetch calculation with ID: ${id}`,
						error.stack,
						"CalculationService.findOne",
						{
							eventId,
							calculationId: id,
							error: error.message,
						},
					);
					throw error;
				}
			},
			3,
			1000,
			(error) =>
				!(error instanceof NotFoundException || error?.name === "AbortError"),
		);
	}

	/**
	 * Finds all calculations with pagination
	 */
	async findAllPaginated(
		paginationDto: PaginationDto,
		user: any,
		signal?: AbortSignal,
	): Promise<PaginatedResult<Calculation>> {
		return RetryUtil.withRetry(
			async () => {
				const eventId = uuidv4();
				this.customLogger.log(
					`Fetching paginated calculations, page: ${paginationDto.page}, limit: ${paginationDto.limit}`,
					"CalculationService.findAllPaginated",
					{
						eventId,
						userId: user?.id,
						mdc: {
							operation: "findAllPaginated",
							userId: user?.id,
						},
					},
				);
				this.checkAborted(signal);

				try {
					const skip = (paginationDto.page - 1) * paginationDto.limit;

					this.checkAborted(signal);

					const [results, total] = await this.calculationRepository
						.createQueryBuilder("calculation")
						.leftJoinAndSelect(
							"calculation.parentCalc",
							"parentCalc",
							"calculation.parentCalcId = parentCalc.id",
						)
						.orderBy("calculation.createdAt", "DESC")
						.skip(skip)
						.take(paginationDto.limit)
						.getManyAndCount();

					this.customLogger.log(
						"Paginated calculations fetched successfully",
						"CalculationService.findAllPaginated",
						{
							eventId,
							count: results.length,
							total,
						},
					);

					this.checkAborted(signal);

					return {
						data: results,
						meta: {
							total,
							page: paginationDto.page,
							limit: paginationDto.limit,
							lastPage: Math.ceil(total / paginationDto.limit),
						},
					};
				} catch (error) {
					this.customLogger.error(
						"Failed to fetch paginated calculations",
						error.stack,
						"CalculationService.findAllPaginated",
						{
							eventId,
							error: error.message,
							pagination: paginationDto,
						},
					);
					throw new BadRequestException(
						`Failed to fetch paginated calculations: ${error.message}`,
					);
				}
			},
			3,
			1000,
			(error) => !(error?.name === "AbortError"),
		);
	}

	/**
	 * Finds all calculations without pagination
	 */
	async findAll(user: any, signal?: AbortSignal): Promise<Calculation[]> {
		return RetryUtil.withRetry(
			async () => {
				const eventId = uuidv4();
				this.customLogger.log(
					"Fetching all calculations",
					"CalculationService.findAll",
					{
						eventId,
						userId: user?.id,
						mdc: {
							operation: "findAll",
							userId: user?.id,
						},
					},
				);
				this.checkAborted(signal);

				try {
					const calculations = await this.calculationRepository
						.createQueryBuilder("calculation")
						.leftJoinAndSelect(
							"calculation.parentCalc",
							"parentCalc",
							"calculation.parentCalcId = parentCalc.id",
						)
						.orderBy("calculation.createdAt", "DESC")
						.getMany();

					this.customLogger.log(
						"All calculations fetched successfully",
						"CalculationService.findAll",
						{
							eventId,
							count: calculations.length,
						},
					);

					this.checkAborted(signal);

					return calculations;
				} catch (error) {
					this.customLogger.error(
						"Failed to fetch calculations",
						error.stack,
						"CalculationService.findAll",
						{
							eventId,
							error: error.message,
						},
					);
					throw new BadRequestException(
						`Failed to fetch calculations (no pagination): ${error.message}`,
					);
				}
			},
			3,
			1000,
			(error) => !(error?.name === "AbortError"),
		);
	}

	/**
	 * Export all calculations without pagination
	 */
	async findAllForExport(
		user: any,
		filterModel?: AgGridFilterModel,
		sortModel?: AgGridSortModel[],
		selectedIds?: string[],
		signal?: AbortSignal,
	): Promise<Calculation[]> {
		return RetryUtil.withRetry(
			async () => {
				const eventId = uuidv4();
				this.customLogger.log(
					"Preparing calculations for export",
					"CalculationService.findAllForExport",
					{
						eventId,
						userId: user?.id,
						mdc: {
							operation: "findAllForExport",
							userId: user?.id,
						},
					},
				);
				this.checkAborted(signal);

				try {
					let calculations: Calculation[];

					if (selectedIds && selectedIds.length > 0) {
						calculations = await this.calculationRepository
							.createQueryBuilder("calculation")
							.leftJoinAndSelect(
								"calculation.parentCalc",
								"parentCalc",
								"calculation.parentCalcId = parentCalc.id",
							)
							.where("calculation.id IN (:...selectedIds)", { selectedIds })
							.orderBy("calculation.createdAt", "DESC")
							.getMany();
					} else {
						calculations = await this.calculationRepository
							.createQueryBuilder("calculation")
							.leftJoinAndSelect(
								"calculation.parentCalc",
								"parentCalc",
								"calculation.parentCalcId = parentCalc.id",
							)
							.orderBy("calculation.createdAt", "DESC")
							.getMany();
					}

					this.checkAborted(signal);

					const filteredCalculations =
						this.inMemoryFilterService.applyFiltersAndSort(
							calculations,
							filterModel,
							sortModel,
						);

					this.customLogger.log(
						"Calculations for export successfully prepared.",
						"CalculationService.findAllForExport",
						{
							eventId,
							total: calculations.length,
							filtered: filteredCalculations.length,
						},
					);

					return filteredCalculations;
				} catch (error) {
					this.customLogger.error(
						"Failed to export calculations",
						error.stack,
						"CalculationService.findAllForExport",
						{
							eventId,
							error: error.message,
						},
					);
					throw error;
				}
			},
			3,
			1000,
			(error) => !(error?.name === "AbortError"),
		);
	}

	/**
	 * Creates a new version of the questionnaire
	 */
	async createNewVersion(
		calcId: string,
		createNewVersionDto: CreateNewVersionDto,
		user: any,
		signal?: AbortSignal,
	): Promise<Calculation> {
		return RetryUtil.withRetry(
			async () => {
				const eventId = uuidv4();
				this.customLogger.log(
					`Creating new version for calculation ${calcId} [${eventId}]`,
					"CalculationService.createNewVersion",
					{
						eventId,
						userId: user?.id,
						mdc: {
							operation: "createNewVersion",
							userId: user?.id,
						},
					},
				);
				this.checkAborted(signal);

				try {
					const sourceCalculation = await this.findOne(calcId, user, signal);
					if (!sourceCalculation) {
						throw new NotFoundException(
							`Calculation with ID ${calcId} not found`,
						);
					}

					this.checkAborted(signal);

					const authorName = user
						? `${user.given_name || ""} ${user.family_name || ""}`.trim() ||
							user.preferred_username ||
							user.email ||
							"Система"
						: "Система";

					const calculationResult =
						(createNewVersionDto as any).calculationResult?.map((item) => ({
							stageName: item.stageName,
							score: item.score,
							stageBaseValue: item.stageBaseValue,
							percentFromAverage: item.percentFromAverage,
							offset: item.offset,
							disabled: item.disabled,
						})) || [];

					const seriesId =
						sourceCalculation.seriesId || this.generateSeriesId();
					let maxVersion = "0.0.0";
					let newVersion = "1.0.0";

					if (sourceCalculation.seriesId) {
						maxVersion = await this.getMaxVersionInSeries(
							sourceCalculation.seriesId,
						);
						newVersion = this.incrementVersion(maxVersion);
					}

					const newReadableId = `Calc-${seriesId}-version-${newVersion}`;
					await this.ensureReadableIdIsUnique(seriesId, newReadableId);

					let questionnaireData =
						createNewVersionDto.questionnaireData ||
						sourceCalculation.questionnaireData;
					if (calculationResult.length > 0) {
						questionnaireData = {
							...questionnaireData,
							calculationResult,
						};
					}

					const newCalculation = this.calculationRepository.create({
						status: CalculationStatus.ACTIVE,
						calcName:
							createNewVersionDto.calcName || sourceCalculation.calcName,
						rfd: createNewVersionDto.rfd || sourceCalculation.rfd,
						streamExecutor:
							createNewVersionDto.streamExecutor ||
							sourceCalculation.streamExecutor,
						department:
							createNewVersionDto.department || sourceCalculation.department,
						customerName:
							createNewVersionDto.customerName ||
							sourceCalculation.customerName,
						comment: createNewVersionDto.comment || sourceCalculation.comment,
						questionnaireData:
						questionnaireData,
						finalCoefficient:
							createNewVersionDto.finalCoefficient ||
							sourceCalculation.finalCoefficient,
						seriesId: seriesId,
						version: newVersion,
						parentCalcId: sourceCalculation.id,
						readableId: newReadableId,
						author: authorName,
					});

					this.checkAborted(signal);

					if (sourceCalculation.seriesId) {
						await this.archivePreviousActiveCalculation(
							sourceCalculation.seriesId,
						);
					}

					const savedCalculation =
						await this.calculationRepository.save(newCalculation);

					this.customLogger.log(
						`New version created successfully [${eventId}]`,
						"CalculationService.createNewVersion",
						{
							calculationId: savedCalculation.id,
							seriesId: savedCalculation.seriesId,
							version: savedCalculation.version,
						},
					);

					return savedCalculation;
				} catch (error) {
					this.customLogger.error(
						"Failed to create new version",
						error.stack,
						"CalculationService.createNewVersion",
						{
							eventId,
							error: error.message,
							calcId,
						},
					);

					if (error instanceof NotFoundException) {
						throw error;
					}

					throw new BadRequestException(
						`Failed to create new version: ${error.message}`,
					);
				}
			},
			3,
			1000,
			(error) =>
				!(
					error instanceof BadRequestException ||
					error instanceof NotFoundException ||
					error?.name === "AbortError"
				),
		);
	}

	/**
	 * Creates a clone of a questionnaire as a template
	 */
	async createClone(
		calcId: string,
		createCloneDto: CreateCloneDto,
		user: any,
		signal?: AbortSignal,
	): Promise<Calculation> {
		return RetryUtil.withRetry(
			async () => {
				const eventId = uuidv4();
				this.customLogger.log(
					`Creating clone from template ${calcId} [${eventId}]`,
					"CalculationService.createClone",
					{ userId: user?.id, templateCalcId: calcId },
				);
				this.checkAborted(signal);

				try {
					const sourceCalculation = await this.findOne(calcId, user, signal);
					if (!sourceCalculation) {
						throw new NotFoundException(
							`Calculation with ID ${calcId} not found`,
						);
					}

					this.checkAborted(signal);

					const authorName = user
						? `${user.given_name || ""} ${user.family_name || ""}`.trim() ||
							user.preferred_username ||
							user.email ||
							"Система"
						: "Система";

					const calculationResult =
						createCloneDto.calculationResult?.map((item) => ({
							stageName: item.stageName,
							score: item.score,
							stageBaseValue: item.stageBaseValue,
							percentFromAverage: item.percentFromAverage,
							offset: item.offset,
							disabled: item.disabled,
						})) || [];

					const newSeriesId = this.generateSeriesId();
					const newVersion = "1.0.0";

					let questionnaireData =
						createCloneDto.questionnaireData ||
						sourceCalculation.questionnaireData;
					if (calculationResult.length > 0) {
						questionnaireData = {
							...questionnaireData,
							calculationResult,
						};
					}

					const newCalculation = this.calculationRepository.create({
						status: CalculationStatus.ACTIVE,
						calcName: createCloneDto.calcName || sourceCalculation.calcName,
						rfd: createCloneDto.rfd || sourceCalculation.rfd,
						streamExecutor:
							createCloneDto.streamExecutor || sourceCalculation.streamExecutor,
						department:
							createCloneDto.department || sourceCalculation.department,
						customerName:
							createCloneDto.customerName || sourceCalculation.customerName,
						comment: createCloneDto.comment || sourceCalculation.comment,
						questionnaireData:
						questionnaireData,
						finalCoefficient: sourceCalculation.finalCoefficient,
						seriesId: newSeriesId,
						version: newVersion,
						parentCalcId: null,
						readableId: `Calc-${newSeriesId}-version-${newVersion}`,
						author: authorName,
					});

					this.checkAborted(signal);

					const savedCalculation =
						await this.calculationRepository.save(newCalculation);

					this.customLogger.log(
						`Clone created successfully [${eventId}]`,
						"CalculationService.createClone",
						{
							calculationId: savedCalculation.id,
							seriesId: savedCalculation.seriesId,
							version: savedCalculation.version,
						},
					);

					return savedCalculation;
				} catch (error) {
					this.customLogger.error(
						"Failed to create clone",
						error.stack,
						"CalculationService.createClone",
						{
							eventId,
							error: error.message,
							calcId,
						},
					);

					if (error instanceof NotFoundException) {
						throw error;
					}

					throw new BadRequestException(
						`Failed to create clone: ${error.message}`,
					);
				}
			},
			3,
			1000,
			(error) =>
				!(
					error instanceof BadRequestException ||
					error instanceof NotFoundException ||
					error?.name === "AbortError"
				),
		);
	}

	/**
	 * Generates a new series identifier (8-digit number)
	 */
	private generateSeriesId(): string {
		return Math.floor(10000000 + Math.random() * 90000000).toString();
	}

	/**
	 * Gets the maximum version in the series
	 */
	async getMaxVersionInSeries(seriesId: string): Promise<string> {
		const calculations = await this.calculationRepository.find({
			where: { seriesId },
			select: ["version"],
		});

		if (calculations.length === 0) {
			return "0.0.0";
		}

		let maxVersion = "0.0.0";
		for (const calc of calculations) {
			if (this.compareVersions(calc.version, maxVersion)) {
				maxVersion = calc.version;
			}
		}

		return maxVersion;
	}

	/**
	 * Compares two version strings (returns true if version1 > version2)
	 */
	private compareVersions(version1: string, version2: string): boolean {
		const v1 = version1.split(".").map(Number);
		const v2 = version2.split(".").map(Number);

		for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
			const num1 = v1[i] || 0;
			const num2 = v2[i] || 0;

			if (num1 > num2) return true;
			if (num1 < num2) return false;
		}

		return false;
	}

	/**
	 * Increments the major version number
	 */
	private incrementVersion(version: string): string {
		const parts = version.split(".");
		if (parts.length === 0) return "1.0.0";

		const major = Number.parseInt(parts[0]) || 0;
		return `${major + 1}.0.0`;
	}

	/**
	 * Ensures that readableId is unique in the series
	 */
	private async ensureReadableIdIsUnique(
		seriesId: string,
		readableId: string,
	): Promise<void> {
		const existing = await this.calculationRepository.findOne({
			where: { seriesId, readableId, status: CalculationStatus.ACTIVE },
		});

		if (existing) {
			throw new BadRequestException(
				`Active calculation with readableId '${readableId}' already exists in the series`,
			);
		}
	}

	/**
	 * Archives the previous active questionnaire in the series
	 */
	private async archivePreviousActiveCalculation(
		seriesId: string,
	): Promise<void> {
		try {
			// Находим все активные анкеты в этой серии
			const activeCalculations = await this.calculationRepository.find({
				where: {
					seriesId,
					status: CalculationStatus.ACTIVE,
				},
			});

			// Архивируем все найденные активные анкеты
			for (const calc of activeCalculations) {
				calc.status = CalculationStatus.ARCHIVE;
				await this.calculationRepository.save(calc);
			}
		} catch (error) {
			this.customLogger.error(
				"Failed to archive previous active calculations",
				error.stack,
				"CalculationService.archivePreviousActiveCalculation",
				{
					error: error.message,
					seriesId,
				},
			);
			throw error;
		}
	}

	private checkAborted(signal?: AbortSignal): void {
		if (signal?.aborted) {
			throw new Error("Request aborted by client");
		}
	}
}
