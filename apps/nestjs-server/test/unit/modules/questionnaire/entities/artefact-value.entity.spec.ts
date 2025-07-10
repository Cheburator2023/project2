import {testArtefactValue} from "../../../../test-data";

describe('ArtefactValueEntity', () => {
    it('should be defined', () => {
        expect(testArtefactValue).toBeDefined();
    });

    it('should have artefact_value_id property', () => {
        expect(testArtefactValue.artefact_value_id).toBe(1);
    });

    it('should have artefact_id property', () => {
        expect(testArtefactValue.artefact_id).toBe(6);
    });

    it('should have artefact_value property', () => {
        expect(testArtefactValue.artefact_value).toBe('Test Value');
    });

    it('should have artefact_value_label property', () => {
        expect(testArtefactValue.artefact_value_label).toBe('Test Label');
    });

    it('should have is_active_flg property', () => {
        expect(testArtefactValue.is_active_flg).toBe('1');
    });

    it('should have artefact_parent_value_id property', () => {
        expect(testArtefactValue.artefact_parent_value_id).toBeNull();
    });
});