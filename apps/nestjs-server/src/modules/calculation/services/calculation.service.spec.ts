import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateCalculationDto } from "../dto/create-calculation.dto";
import { Calculation } from "../entities/calculation.entity";
import { CalculationService } from "./calculation.service";

describe("CalculationService", () => {
	let service: CalculationService;
	let repository: Repository<Calculation>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				CalculationService,
				{
					provide: getRepositoryToken(Calculation),
					useClass: Repository,
				},
			],
		}).compile();

		service = module.get<CalculationService>(CalculationService);
		repository = module.get<Repository<Calculation>>(
			getRepositoryToken(Calculation),
		);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("create", () => {
		it("should create a calculation", async () => {
			const dto: CreateCalculationDto = {
				name: "Test Calculation",
				modelsCount: 5,
				setupComplexity: 3,
				initiativeTimeline: "3_months",
				initiativeCost: "10000",
				generalUncertainty: [
					{
						itemType: "data_quality",
						probability: "high",
						influence: "medium",
					},
				],
				readyPromReports: "yes",
				dataSourcesCount: "3",
				pilotModelRequired: "yes",
				algorithmComplexity: {
					algorithmType: "complex",
				},
				pilotSupportRequired: "no",
				autoMlRequired: "yes",
				productionAdditionalReports: "no",
				productionDeploymentChannels: [
					{
						deploymentChannel: "api",
					},
				],
				finalCoefficient: 1.5,
			};

			const expectedCalculation = new Calculation(
				dto.name,
				{
					modelsCount: dto.modelsCount,
					setupComplexity: dto.setupComplexity,
					initiativeTimeline: dto.initiativeTimeline,
					initiativeCost: dto.initiativeCost,
					generalUncertainty: dto.generalUncertainty,
					readyPromReports: dto.readyPromReports,
					dataSourcesCount: dto.dataSourcesCount,
					pilotModelRequired: dto.pilotModelRequired,
					algorithmComplexity: dto.algorithmComplexity,
					pilotSupportRequired: dto.pilotSupportRequired,
					autoMlRequired: dto.autoMlRequired,
					productionAdditionalReports: dto.productionAdditionalReports,
					productionDeploymentChannels: dto.productionDeploymentChannels,
				},
				dto.finalCoefficient,
			);

			jest.spyOn(repository, "save").mockResolvedValue(expectedCalculation);

			const result = await service.create(dto);
			expect(result).toEqual(expectedCalculation);
			expect(repository.save).toHaveBeenCalledWith(expectedCalculation);
		});
	});
});
