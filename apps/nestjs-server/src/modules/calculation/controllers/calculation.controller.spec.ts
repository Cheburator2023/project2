import { Test, TestingModule } from "@nestjs/testing";
import { CreateCalculationDto } from "../dto/create-calculation.dto";
import { Calculation } from "../entities/calculation.entity";
import { CalculationService } from "../services/calculation.service";
import { CalculationController } from "./calculation.controller";

describe("CalculationController", () => {
	let controller: CalculationController;
	let service: CalculationService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [CalculationController],
			providers: [
				{
					provide: CalculationService,
					useValue: {
						create: jest.fn(),
						findOne: jest.fn(),
						findAll: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<CalculationController>(CalculationController);
		service = module.get<CalculationService>(CalculationService);
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	describe("POST /calculation", () => {
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

			const expectedResult: Calculation = new Calculation(
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

			jest.spyOn(service, "create").mockResolvedValue(expectedResult);

			const result = await controller.create(dto);
			expect(result).toEqual(expectedResult);
			expect(service.create).toHaveBeenCalledWith(dto);
		});
	});
});
