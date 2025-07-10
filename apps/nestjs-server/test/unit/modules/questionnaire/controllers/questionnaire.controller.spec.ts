import { Test, TestingModule } from '@nestjs/testing';
import {QuestionnaireController} from "../../../../../src/modules/questionnaire/controllers/questionnaire.controller";
import {QuestionnaireService} from "../../../../../src/modules/questionnaire/services/questionnaire.service";
import {
    QuestionnaireResponseDto
} from "../../../../../src/modules/questionnaire/dto/response/questionnaire-response.dto";

describe('QuestionnaireController', () => {
    let controller: QuestionnaireController;
    let service: QuestionnaireService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [QuestionnaireController],
            providers: [
                {
                    provide: QuestionnaireService,
                    useValue: {
                        getFullQuestionnaire: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<QuestionnaireController>(QuestionnaireController);
        service = module.get<QuestionnaireService>(QuestionnaireService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getFullQuestionnaire', () => {
        it('should return questionnaire configuration', async () => {
            const result: QuestionnaireResponseDto = {
                version: '1.0.0',
                lastUpdated: new Date().toISOString(),
                author: 'system',
                dictionaries: {
                    test_item: [{
                        value: null,
                        hint: 'Test description',
                    }],
                },
                streamAverages: {
                    '01. Постановка задачи': 10.5,
                    '02. Поиск данных': 0,
                    '03. Построение витрины для разработки': 0,
                    '05А. Разработка пилотной модели (MVP)': 0,
                    '05. Разработка модели': 0,
                    'AML Разработка': 0,
                    '05В. Пилотирование модели': 0,
                    '07. Разработка витрины для применения модели': 0,
                    '09. Адаптация и внедрение модели': 0,
                    'AML Внедрение': 0
                },
                referenceData: {
                    department: ['Dept1'],
                    streamExecutor: ['Stream1'],
                },
            };

            jest.spyOn(service, 'getFullQuestionnaire').mockResolvedValue(result);

            expect(await controller.getFullQuestionnaire()).toBe(result);
            expect(service.getFullQuestionnaire).toHaveBeenCalled();
        });
    });
});