import {ReferenceDataDto} from "../../../../../src/modules/questionnaire/dto/response/reference-data.dto";

describe('ReferenceDataDto', () => {
    it('should be defined', () => {
        const dto = new ReferenceDataDto();
        expect(dto).toBeDefined();
    });

    it('should have department property', () => {
        const dto = new ReferenceDataDto();
        dto.department = ['Dept1', 'Dept2'];
        expect(dto.department).toEqual(['Dept1', 'Dept2']);
    });

    it('should have streamExecutor property', () => {
        const dto = new ReferenceDataDto();
        dto.streamExecutor = ['Stream1', 'Stream2'];
        expect(dto.streamExecutor).toEqual(['Stream1', 'Stream2']);
    });
});