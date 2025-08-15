import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { CreateCalculationDto, PaginationDto } from "../dto";
import { UpdateCalculationDto } from "../dto/request/update-calculation.dto";
import { Calculation } from "../entities/calculation.entity";
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

@Injectable()
export class CalculationService {
	constructor(
		@InjectRepository(Calculation)
		private calculationRepository: Repository<Calculation>,
		private readonly customLogger: CustomLogger,
		private readonly inMemoryFilterService: InMemoryFilterService,
	) {}

	private generateSeriesId(): string {
		return Math.floor(10000000 + Math.random() * 90000000).toString();
	}

	private async getNextVersion(seriesId: string): Promise<number> {
		const latestCalculation = await this.calculationRepository.findOne({
			where: { seriesId },
			order: { version: "DESC" },
		});
		return latestCalculation ? latestCalculation.version + 1 : 1;
	}

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

					let seriesId = createCalculationDto.seriesId;
					let version = createCalculationDto.version;
					let parentId = createCalculationDto.parentId;

					if (parentId) {
						const parentCalculation = await this.calculationRepository.findOne({
							where: { id: parentId },
						});

						if (!parentCalculation) {
							seriesId = seriesId || this.generateSeriesId();
							version = version || 1;

							this.customLogger.warn(
								`Parent calculation not found, creating new series`,
								"CalculationService.create",
								{
									parentId,
									generatedSeriesId: seriesId,
									version
								},
							);
						} else {
							seriesId = parentCalculation.seriesId;
							version = await this.getNextVersion(seriesId);

							await this.archivePreviousActiveCalculation(seriesId);
						}
					} else {
						seriesId = seriesId || this.generateSeriesId();
						version = version || 1;
					}

					const calculation = this.calculationRepository.create({
						calcName: createCalculationDto.calcName || "Новый расчет",
						rfd: createCalculationDto.rfd || "",
						streamExecutor: createCalculationDto.streamExecutor,
						department: createCalculationDto.department,
						customerName: createCalculationDto.customerName,
						comment: createCalculationDto.comment,
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
								createCalculationDto.assessedInitiativesCount?.toString(),
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
						status: "active",
						seriesId,
						version,
						parentId,
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

	private async archivePreviousActiveCalculation(seriesId: string): Promise<void> {
		const activeCalculations = await this.calculationRepository.find({
			where: { seriesId, status: "active" },
		});

		if (activeCalculations.length > 0) {
			await Promise.all(
				activeCalculations.map(async (calc) => {
					calc.status = "archive";
					await this.calculationRepository.save(calc);
				}),
			);
		}
	}

	/**
	 * Updates calculation basic information
	 */
	async updateCalculation(
		id: string,
		updateDto: UpdateCalculationDto,
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
						calculationId: id,
					},
				);
				this.checkAborted(signal);

				try {
					const calculation = await this.calculationRepository.findOne({
						where: { id },
					});

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
	async findOne(id: string, signal?: AbortSignal): Promise<Calculation> {
		return RetryUtil.withRetry(
			async () => {
				const eventId = uuidv4();
				this.customLogger.log(
					`Fetching calculation with ID: ${id}`,
					"CalculationService.findOne",
					{
						eventId,
						calculationId: id,
					},
				);
				this.checkAborted(signal);

				try {
					const calculation = await this.calculationRepository.findOne({
						where: { id },
					});

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
						page: paginationDto.page,
						limit: paginationDto.limit,
					},
				);
				this.checkAborted(signal);

				try {
					const skip = (paginationDto.page - 1) * paginationDto.limit;

					this.checkAborted(signal);

					const [results, total] =
						await this.calculationRepository.findAndCount({
							skip,
							take: paginationDto.limit,
							order: { createdAt: "DESC" },
						});

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
	async findAll(signal?: AbortSignal): Promise<Calculation[]> {
		return RetryUtil.withRetry(
			async () => {
				const eventId = uuidv4();
				this.customLogger.log(
					"Fetching all calculations",
					"CalculationService.findAll",
					{ eventId },
				);
				this.checkAborted(signal);

				try {
					const calculations = await this.calculationRepository.find({
						order: { createdAt: "DESC" },
					});

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
						`Failed to fetch calculations: ${error.message}`,
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
						selectedIdsCount: selectedIds?.length || 0,
					},
				);
				this.checkAborted(signal);

				try {
					let calculations: Calculation[];

					if (selectedIds && selectedIds.length > 0) {
						calculations = await this.calculationRepository.find({
							where: { id: In(selectedIds) },
							order: { createdAt: "DESC" },
						});
					} else {
						calculations = await this.calculationRepository.find({
							order: { createdAt: "DESC" },
						});
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

	async findBySeriesId(
		seriesId: string,
		signal?: AbortSignal,
	): Promise<Calculation[]> {
		return RetryUtil.withRetry(
			async () => {
				const eventId = uuidv4();
				this.customLogger.log(
					`Fetching calculations for series ${seriesId}`,
					"CalculationService.findBySeriesId",
					{
						eventId,
						seriesId,
					},
				);
				this.checkAborted(signal);

				try {
					const calculations = await this.calculationRepository.find({
						where: { seriesId },
						order: { version: "ASC" },
					});

					if (!calculations || calculations.length === 0) {
						this.customLogger.warn(
							`No calculations found for series ${seriesId}`,
							"CalculationService.findBySeriesId",
							{
								eventId,
								seriesId,
							},
						);
						throw new NotFoundException(
							`No calculations found for series ${seriesId}`,
						);
					}

					this.customLogger.log(
						`Successfully fetched ${calculations.length} calculations for series ${seriesId}`,
						"CalculationService.findBySeriesId",
						{
							eventId,
							seriesId,
							count: calculations.length,
						},
					);

					return calculations;
				} catch (error) {
					this.customLogger.error(
						`Failed to fetch calculations for series ${seriesId}`,
						error.stack,
						"CalculationService.findBySeriesId",
						{
							eventId,
							seriesId,
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

	private checkAborted(signal?: AbortSignal): void {
		if (signal?.aborted) {
			throw new Error("Request aborted by client");
		}
	}
}
