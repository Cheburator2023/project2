import { Test, TestingModule } from '@nestjs/testing';
import { CalculationController } from '../../../../../src/modules/calculation/controllers/calculation.controller';
import { CalculationService } from '../../../../../src/modules/calculation/services/calculation.service';
import { CreateCalculationDto } from '../../../../../src/modules/calculation/dto/request/create-calculation.dto';
import { CalculationResponseDto } from '../../../../../src/modules/calculation/dto/response/calculation-response.dto';
import { PaginationDto } from '../../../../../src/modules/calculation/dto/common/pagination.dto';
import { UpdateCalculationDto } from '../../../../../src/modules/calculation/dto/request/update-calculation.dto';
import {testCalculation, testCalculationResponse} from "../../../../test-data";

describe('CalculationController', () => {
    let controller: CalculationController;
    let service: CalculationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CalculationController],
            providers: [
                {
                    provide: CalculationService,
                    useValue: {
                        create: jest.fn().mockResolvedValue(testCalculation),
                        findAllPaginated: jest.fn().mockResolvedValue({
                            data: [testCalculation],
                            meta: {
                                total: 1,
                                page: 1,
                                limit: 10,
                                lastPage: 1
                            }
                        }),
                        findAll: jest.fn().mockResolvedValue([testCalculation]),
                        findOne: jest.fn().mockResolvedValue(testCalculation),
                        updateCalculation: jest.fn().mockResolvedValue(testCalculation)
                    },
                },
            ],
        }).compile();

        controller = module.get<CalculationController>(CalculationController);
        service = module.get<CalculationService>(CalculationService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        it('should create a new calculation', async () => {
            const createDto: CreateCalculationDto = {
                name: 'Test Calculation',
                setupComplexity: '1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено',
                initiativeTimeline: 'Менее 1 мес.',
                initiativeCost: 'До 45.3 млн.',
                modelsCount: 1,
                generalUncertainty: [],
                readyPromReports: 'Нет',
                dataSourcesCount: '1',
                pilotModelRequired: 'Не требуется',
                algorithmComplexity: [{ algorithmType: 'Табличные данные' }],
                pilotSupportRequired: 'Не требуется',
                autoMlRequired: 'Не требуется',
                productionAdditionalReports: '0',
                productionDeploymentChannels: ['Батч'],
                finalCoefficient: 1.0
            };

            const result = await controller.create(createDto, { given_name: 'Test', family_name: 'User' });
            expect(result).toEqual(testCalculationResponse);
            expect(service.create).toHaveBeenCalledWith(createDto, expect.anything());
        });
    });

    describe('findAllPaginated', () => {
        it('should return paginated calculations', async () => {
            const paginationDto: PaginationDto = { page: 1, limit: 10 };
            const result = await controller.findAllPaginated(paginationDto);

            expect(result.data).toEqual([testCalculationResponse]);
            expect(result.meta.total).toBe(1);
            expect(service.findAllPaginated).toHaveBeenCalledWith(paginationDto);
        });
    });

    describe('findOne', () => {
        it('should return a calculation by ID', async () => {
            const result = await controller.findOne('550e8400-e29b-41d4-a716-446655440000');
            expect(result).toEqual(testCalculationResponse);
            expect(service.findOne).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
        });
    });

    describe('update', () => {
        it('should update a calculation', async () => {
            const updateDto: UpdateCalculationDto = {
                name: 'Updated Calculation',
                comment: 'Updated comment'
            };

            const result = await controller.update('550e8400-e29b-41d4-a716-446655440000', updateDto);
            expect(result).toEqual(testCalculationResponse);
            expect(service.updateCalculation).toHaveBeenCalledWith(
                '550e8400-e29b-41d4-a716-446655440000',
                updateDto
            );
        });
    });
});