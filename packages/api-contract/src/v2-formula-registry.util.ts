import type {
	V2TypicalWorkFormulaBadgeDto,
	V2WorkFormulaToken,
	V2WorkRoundingMode,
} from "./v2-typical-work.types";

export type V2FormulaRegistryParamRefDto = {
	paramCode: string;
	paramName?: string | null;
	kind: "param_coeff" | "param_anyof";
	invalid?: boolean;
};

export type V2FormulaRegistryWorkRefDto = {
	assignmentId: string;
	workId?: string | null;
	workName?: string | null;
	invalid?: boolean;
};

export type V2FormulaRegistryItemDto = {
	id: string;
	workId: string;
	workName: string;
	templateId: string;
	templateName: string;
	templateVersionId: string;
	versionNumber: number;
	versionStatus: string;
	streamExecutor: string;
	assignmentId: string | null;
	formulaText: string;
	formulaBadge: V2TypicalWorkFormulaBadgeDto;
	roundingMode: V2WorkRoundingMode;
	paramRefs: V2FormulaRegistryParamRefDto[];
	workRefs: V2FormulaRegistryWorkRefDto[];
	hasInvalidRefs: boolean;
	createdAt: string;
	updatedAt: string;
};

export type V2FormulaRegistryTemplateOptionDto = {
	id: string;
	name: string;
};

export type V2FormulaRegistryListResponseDto = {
	total: number;
	items: V2FormulaRegistryItemDto[];
	templateOptions: V2FormulaRegistryTemplateOptionDto[];
};

export function extractFormulaRegistryLinks(tokens: V2WorkFormulaToken[]): {
	paramRefs: V2FormulaRegistryParamRefDto[];
	workRefs: V2FormulaRegistryWorkRefDto[];
	hasInvalidRefs: boolean;
} {
	const paramRefs: V2FormulaRegistryParamRefDto[] = [];
	const workRefs: V2FormulaRegistryWorkRefDto[] = [];
	const seenParams = new Set<string>();
	const seenAssignments = new Set<string>();
	let hasInvalidRefs = false;

	for (const token of tokens) {
		if (token.kind === "param_coeff" || token.kind === "param_anyof") {
			const key = `${token.kind}:${token.paramCode}`;
			if (seenParams.has(key)) continue;
			seenParams.add(key);
			if (token.invalid) hasInvalidRefs = true;
			paramRefs.push({
				paramCode: token.paramCode,
				paramName: token.paramName ?? null,
				kind: token.kind,
				invalid: token.invalid,
			});
			continue;
		}
		if (token.kind === "work_ref") {
			if (seenAssignments.has(token.assignmentId)) continue;
			seenAssignments.add(token.assignmentId);
			if (token.invalid) hasInvalidRefs = true;
			workRefs.push({
				assignmentId: token.assignmentId,
				workName: token.workName ?? null,
				invalid: token.invalid,
			});
		}
	}

	return { paramRefs, workRefs, hasInvalidRefs };
}

export function formatFormulaRegistryParamLabel(
	paramCode: string,
	paramName?: string | null,
): string {
	const code = paramCode.trim();
	const name = paramName?.trim();
	if (name && name !== code) return `${name} (${code})`;
	return name || code;
}
