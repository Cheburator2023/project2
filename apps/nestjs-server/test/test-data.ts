import {CoefficientEntity} from "../src/modules/questionnaire/entities/coefficient.entity";
import {QuestionnaireItemEntity} from "../src/modules/questionnaire/entities/questionnaire-item.entity";
import {StreamAverageEntity} from "../src/modules/questionnaire/entities/stream-average.entity";
import {ArtefactValueEntity} from "../src/modules/questionnaire/entities/artefact-value.entity";

export const testCoefficient: CoefficientEntity = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Coefficient',
    code: 'test',
    baseValue: 1.0,
    isActive: true,
    conditions: { default: 2.0 },
    description: 'Test description',
    createdAt: new Date(),
    updatedAt: new Date(),
};

export const testQuestionnaireItem: QuestionnaireItemEntity = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Test Item',
    code: 'test_item',
    description: 'Test description',
    isRequired: true,
    isActive: true,
    fieldType: 'number',
    options: [],
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
};

export const testStreamAverage: StreamAverageEntity = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    epicName: '01. Test Epic',
    averageValue: 10.5,
    description: 'Test description',
    createdAt: new Date(),
    updatedAt: new Date(),
};

export const testArtefactValue: ArtefactValueEntity = {
    artefact_value_id: 1,
    artefact_id: 6,
    artefact_value: 'Test Value',
    artefact_value_label: 'Test Label',
    is_active_flg: '1',
    artefact_parent_value_id: null,
};