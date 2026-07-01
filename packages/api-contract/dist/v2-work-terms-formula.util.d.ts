import type { V2TypicalWorkFormulaDto, V2TypicalWorkFormulaBadgeDto, V2WorkFormulaToken } from "./v2-typical-work.types";
import type { V2TypicalWorkFormulaTermsDto, V2WorkFormulaTermDto } from "./v2-typical-work-v4.types";
export declare function createTermId(prefix?: string): string;
export declare function defaultBaseNormTerm(): V2WorkFormulaTermDto;
export declare function defaultTermsFormula(): V2TypicalWorkFormulaTermsDto;
export declare function isTermsFormulaPayload(formula: unknown): formula is V2TypicalWorkFormulaTermsDto;
export declare function tokensToTermsFormula(formula: V2TypicalWorkFormulaDto): V2TypicalWorkFormulaTermsDto;
export declare function normalizeStoredFormula(raw: unknown, fallbackText?: string | null): V2TypicalWorkFormulaTermsDto;
export declare function formatTermsSummary(terms: V2WorkFormulaTermDto[]): string;
export declare function validateTermsFormula(terms: V2WorkFormulaTermDto[]): string | null;
export declare function detectTransitiveCycle(assignmentId: string, targetAssignmentId: string, edges: ReadonlyMap<string, string | null | undefined>): string[] | null;
export declare function computeFormulaBadge(terms: V2WorkFormulaTermDto[]): V2TypicalWorkFormulaBadgeDto;
export declare function evaluateTermsFormula(params: {
    terms: V2WorkFormulaTermDto[];
    baseNorm: number;
    resolveFactorCoeff: (paramCode: string) => number;
    resolveTransitive?: (sourceAssignmentId: string) => number | null;
}): number | null;
/** Конвертация terms → token-формула для JsonLogic. */
export declare function termsToTokenFormula(termsDto: V2TypicalWorkFormulaTermsDto): V2TypicalWorkFormulaDto;
/** Синхронизация formulaTerms из token-формулы (для автосохранения). */
export declare function syncTermsFromTokenFormula(formula: V2TypicalWorkFormulaDto): V2TypicalWorkFormulaTermsDto;
export declare function computeFormulaBadgeFromTokens(tokens: V2WorkFormulaToken[]): V2TypicalWorkFormulaBadgeDto;
export declare function buildTransitiveEdges(assignments: Array<{
    id: string;
    terms?: V2WorkFormulaTermDto[];
}>): Map<string, string | null | undefined>;
