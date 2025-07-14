import {testCoefficient} from "../../../../test-data";

describe('CoefficientEntity', () => {
    it('should be defined', () => {
        expect(testCoefficient).toBeDefined();
    });

    it('should have id property', () => {
        expect(testCoefficient.id).toBeDefined();
    });

    it('should have name property', () => {
        expect(testCoefficient.name).toBe('Test Coefficient');
    });

    it('should have code property', () => {
        expect(testCoefficient.code).toBe('test');
    });

    it('should have baseValue property', () => {
        expect(testCoefficient.baseValue).toBe(1.0);
    });

    it('should have isActive property', () => {
        expect(testCoefficient.isActive).toBe(true);
    });

    it('should have conditions property', () => {
        expect(testCoefficient.conditions).toBeDefined();
    });

    it('should have description property', () => {
        expect(testCoefficient.description).toBe('Test description');
    });

    it('should have createdAt property', () => {
        expect(testCoefficient.createdAt).toBeDefined();
    });

    it('should have updatedAt property', () => {
        expect(testCoefficient.updatedAt).toBeDefined();
    });
});