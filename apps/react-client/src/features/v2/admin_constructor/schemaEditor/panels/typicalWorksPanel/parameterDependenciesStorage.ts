export type ParameterDependencyRule = {
	id: string;
	sourceParamCode: string;
	operator: "=" | "!=";
	valueCode: string;
	valueLabel: string;
};

export type ParameterDependencyTarget = {
	targetParamCode: string;
	rules: ParameterDependencyRule[];
};

export type ParameterDependencyDraft = {
	targets: ParameterDependencyTarget[];
};

const STORAGE_PREFIX = "v2-param-deps:";

export function readParameterDependencyDraft(
	templateId: string,
): ParameterDependencyDraft {
	try {
		const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${templateId}`);
		if (!raw) return { targets: [] };
		const parsed = JSON.parse(raw) as ParameterDependencyDraft;
		if (!parsed || !Array.isArray(parsed.targets)) return { targets: [] };
		return parsed;
	} catch {
		return { targets: [] };
	}
}

export function writeParameterDependencyDraft(
	templateId: string,
	draft: ParameterDependencyDraft,
): void {
	try {
		sessionStorage.setItem(`${STORAGE_PREFIX}${templateId}`, JSON.stringify(draft));
	} catch {
		// ignore
	}
}

export function rulesForTarget(
	draft: ParameterDependencyDraft,
	targetParamCode: string,
): ParameterDependencyRule[] {
	return (
		draft.targets.find((t) => t.targetParamCode === targetParamCode)?.rules ?? []
	);
}

export function isDependentTarget(
	draft: ParameterDependencyDraft,
	targetParamCode: string,
): boolean {
	return rulesForTarget(draft, targetParamCode).length > 0;
}

export function evaluateTargetVisible(
	rules: ParameterDependencyRule[],
	answers: Record<string, string>,
): boolean {
	if (rules.length === 0) return true;
	return rules.every((rule) => {
		const answer = answers[rule.sourceParamCode] ?? "";
		return rule.operator === "="
			? answer === rule.valueCode
			: answer !== rule.valueCode;
	});
}
