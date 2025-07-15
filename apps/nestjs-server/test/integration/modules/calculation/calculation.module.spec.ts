import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import {Calculation} from "../../../../src/modules/calculation/entities/calculation.entity";
import {CalculationModule} from "../../../../src/modules/calculation/calculation.module";

describe('CalculationModule', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [Calculation],
                    synchronize: true,
                }),
                CalculationModule,
            ],
        }).compile();
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
    });

    it('should have CalculationService', () => {
        const service = module.get('CalculationService');
        expect(service).toBeDefined();
    });

    it('should have CalculationController', () => {
        const controller = module.get('CalculationController');
        expect(controller).toBeDefined();
    });
});