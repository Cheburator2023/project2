import {testQuestionnaireItem} from "../../../../test-data";

describe('QuestionnaireItemEntity', () => {
    it('should be defined', () => {
        expect(testQuestionnaireItem).toBeDefined();
    });

    it('should have id property', () => {
        expect(testQuestionnaireItem.id).toBeDefined();
    });

    it('should have name property', () => {
        expect(testQuestionnaireItem.name).toBe('Test Item');
    });

    it('should have code property', () => {
        expect(testQuestionnaireItem.code).toBe('test_item');
    });

    it('should have description property', () => {
        expect(testQuestionnaireItem.description).toBe('Test description');
    });

    it('should have isRequired property', () => {
        expect(testQuestionnaireItem.isRequired).toBe(true);
    });

    it('should have isActive property', () => {
        expect(testQuestionnaireItem.isActive).toBe(true);
    });

    it('should have fieldType property', () => {
        expect(testQuestionnaireItem.fieldType).toBe('number');
    });

    it('should have options property', () => {
        expect(testQuestionnaireItem.options).toBeDefined();
    });

    it('should have order property', () => {
        expect(testQuestionnaireItem.order).toBe(1);
    });

    it('should have createdAt property', () => {
        expect(testQuestionnaireItem.createdAt).toBeDefined();
    });

    it('should have updatedAt property', () => {
        expect(testQuestionnaireItem.updatedAt).toBeDefined();
    });
});