import type { SchemaEditorIssue, SchemaEditorIssueTarget } from "./collectSchemaEditorIssues";

export type TypicalWorkNavFocus = {
	workId: string;
	paramCode?: string;
};

export function issueSupportsDesignerNavigation(
	target: SchemaEditorIssueTarget,
): target is Extract<SchemaEditorIssueTarget, { kind: "designer" }> {
	return target.kind === "designer";
}

export function issueSupportsLogicNavigation(
	target: SchemaEditorIssueTarget,
): boolean {
	return (
		target.kind === "logic_rule" ||
		target.kind === "logic_dependencies" ||
		target.kind === "typical_work"
	);
}

export function resolveIssueDesignerPointer(
	issue: SchemaEditorIssue,
): string | null {
	const { target } = issue;
	if (target.kind === "designer") {
		return target.pointer;
	}
	return null;
}

export function resolveIssueTypicalWorkFocus(
	target: SchemaEditorIssueTarget,
): TypicalWorkNavFocus | null {
	if (target.kind !== "typical_work") return null;
	return {
		workId: target.workId,
		paramCode: target.paramCode,
	};
}

export function scrollWorkParamIntoView(paramCode: string): boolean {
	const escaped = CSS.escape(paramCode);
	const selectors = [
		`[data-work-labor-param="${escaped}"]`,
		`[data-work-trigger-param="${escaped}"]`,
	];
	for (const selector of selectors) {
		const element = document.querySelector(selector);
		if (element) {
			element.scrollIntoView({ block: "nearest", behavior: "smooth" });
			return true;
		}
	}
	return false;
}
