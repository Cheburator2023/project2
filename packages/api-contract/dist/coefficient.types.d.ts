export type CoefficientEntityConditions = Record<string, unknown>;
export interface CoefficientEntity {
    id: string;
    name: string;
    code: string;
    baseValue: number;
    conditions?: CoefficientEntityConditions;
    description?: string;
}
