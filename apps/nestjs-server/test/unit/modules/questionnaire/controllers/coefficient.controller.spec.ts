import { Test, TestingModule } from '@nestjs/testing';
import {CoefficientController} from "../../../../../src/modules/questionnaire/controllers/coefficient.controller";
import {CoefficientService} from "../../../../../src/modules/questionnaire/services/coefficient.service";
import {CoefficientEntity} from "../../../../../src/modules/questionnaire/entities/coefficient.entity";
import {testCoefficient} from "../../../../test-data";

describe('CoefficientController', () => {
    let controller: CoefficientController;
    let service: CoefficientService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CoefficientController],
            providers: [
                {
                    provide: CoefficientService,
                    useValue: {
                        findAll: jest.fn(),
                        getCoefficientValue: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<CoefficientController>(CoefficientController);
        service = module.get<CoefficientService>(CoefficientService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('findAll', () => {
        it('should return an array of coefficients', async () => {
            const result: CoefficientEntity[] = [testCoefficient];
            jest.spyOn(service, 'findAll').mockResolvedValue(result);

            expect(await controller.findAll()).toBe(result);
            expect(service.findAll).toHaveBeenCalled();
        });
    });

    describe('getValue', () => {
        it('should return coefficient value', async () => {
            const code = 'test';
            const value = '1';
            const expected = 1.5;
            jest.spyOn(service, 'getCoefficientValue').mockResolvedValue(expected);

            expect(await controller.getValue(code, value)).toBe(expected);
            expect(service.getCoefficientValue).toHaveBeenCalledWith(code, value);
        });
    });
});