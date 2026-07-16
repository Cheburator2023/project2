import type {
	TypicalWorkSchemaConsistencyIssue,
	V2LogicRuleDto,
	V2ParamFieldBinding,
	V2TypicalWorkListItemDto,
} from "@smart-anketa/api-contract";
import type { LogicValidationIssue } from "../utils/logicValidation";
import {
	isRuleInCycle,
	rulePrimaryLabel,
	validateRule,
} from "./panels/logicPanel/helpers";
import type { FieldPathHint } from "./types";
import type { TypicalWorkSaveGateState } from "./typicalWorkSaveGate";
import {
	draftToGraph,
	listUnmappedDependencyTargets,
} from "./panels/typicalWorksPanel/parameterDependenciesLogic";
import type { ParameterDependencyDraft } from "./panels/typicalWorksPanel/parameterDependenciesStorage";
import { triggerStatusLabel } from "./panels/typicalWorksPanel/typicalWorksUi";
import fuzzysort from "fuzzysort";

export type SchemaEditorIssueSeverity = "error" | "warning" | "info";

export type SchemaEditorIssueCategory =
	| "logic_rule"
	| "logic_cycle"
	| "logic_preview"
	| "typical_work"
	| "param_dependency"
	| "schema_field"
	| "monaco"
	| "calculation"
	| "save";

export type SchemaEditorIssueTarget =
	| { kind: "designer"; pointer: string }
	| { kind: "logic_rule"; ruleId: string }
	| { kind: "logic_dependencies"; pointer?: string; paramCode?: string }
	| { kind: "typical_work"; workId: string; paramCode?: string }
	| { kind: "json" }
	| { kind: "calculation" }
	| { kind: "none" };

export type SchemaEditorIssue = {
	id: string;
	severity: SchemaEditorIssueSeverity;
	category: SchemaEditorIssueCategory;
	title: string;
	message: string;
	target: SchemaEditorIssueTarget;
};

export const SCHEMA_EDITOR_ISSUE_CATEGORY_LABELS: Record<
	SchemaEditorIssueCategory,
	string
> = {
	logic_rule: "Правила логики",
	logic_cycle: "Циклы зависимостей",
	logic_preview: "Валидация превью",
	typical_work: "Типовые работы",
	param_dependency: "Зависимости параметров",
	schema_field: "Поля схемы",
	monaco: "Редактор JSON",
	calculation: "Калькуляция",
	save: "Сохранение работы",
};

type CollectSchemaEditorIssuesInput = {
	rules: V2LogicRuleDto[];
	fieldPathHints: FieldPathHint[];
	cycles: string[];
	logicValidationIssues: LogicValidationIssue[];
	assignedWorks: V2TypicalWorkListItemDto[];
	schemaConsistencyIssues: TypicalWorkSchemaConsistencyIssue[];
	paramDependencyDraft: ParameterDependencyDraft;
	paramFieldBindings: V2ParamFieldBinding[];
	dictionaryCodeByPointer: Map<string, string>;
	enumMapByCode: Record<string, { enums: string[]; enumNames: string[] }>;
	dictionaryEnumsLoading: boolean;
	monacoError: string | null;
	calculationError: string | null;
	typicalWorkSaveDisplay: TypicalWorkSaveGateState | null;
};

function pushIssue(
	out: SchemaEditorIssue[],
	issue: Omit<SchemaEditorIssue, "id">,
): void {
	out.push({
		...issue,
		id: `${issue.category}:${out.length}:${issue.title}:${issue.message}`,
	});
}

export function collectSchemaEditorIssues(
	input: CollectSchemaEditorIssuesInput,
): SchemaEditorIssue[] {
	const issues: SchemaEditorIssue[] = [];

	for (const rule of input.rules) {
		const label = rulePrimaryLabel(rule, input.fieldPathHints);
		for (const validation of validateRule(rule, input.fieldPathHints)) {
			pushIssue(issues, {
				severity: validation.severity,
				category: "logic_rule",
				title: label,
				message: validation.message,
				target: { kind: "logic_rule", ruleId: rule.id },
			});
		}
		if (isRuleInCycle(rule, input.cycles)) {
			pushIssue(issues, {
				severity: "warning",
				category: "logic_cycle",
				title: label,
				message: "Правило участвует в цикле зависимостей",
				target: { kind: "logic_rule", ruleId: rule.id },
			});
		}
	}

	for (const cycle of input.cycles) {
		pushIssue(issues, {
			severity: "warning",
			category: "logic_cycle",
			title: "Цикл зависимостей",
			message: cycle,
			target: { kind: "logic_dependencies" },
		});
	}

	for (const validation of input.logicValidationIssues) {
		pushIssue(issues, {
			severity:
				validation.level === "info"
					? "info"
					: validation.level === "warning"
						? "warning"
						: "error",
			category: "logic_preview",
			title: validation.path ?? "Валидация превью",
			message: validation.message,
			target: validation.ruleId
				? { kind: "logic_rule", ruleId: validation.ruleId }
				: validation.path
					? { kind: "designer", pointer: validation.path }
					: { kind: "none" },
		});
	}

	for (const work of input.assignedWorks) {
		if (work.triggerStatus === "no_triggers") {
			pushIssue(issues, {
				severity: "warning",
				category: "typical_work",
				title: work.name,
				message: triggerStatusLabel(work.triggerStatus),
				target: { kind: "typical_work", workId: work.id },
			});
		}
	}

	for (const consistency of input.schemaConsistencyIssues) {
		pushIssue(issues, {
			severity: consistency.kind === "labor_value" ? "warning" : "error",
			category: "typical_work",
			title: consistency.paramName?.trim() || consistency.paramCode,
			message: consistency.message,
			target: consistency.workId
				? {
						kind: "typical_work",
						workId: consistency.workId,
						paramCode: consistency.paramCode,
					}
				: { kind: "none" },
		});
	}

	const unmappedTargets = listUnmappedDependencyTargets(
		draftToGraph(input.paramDependencyDraft),
		input.paramFieldBindings,
	);
	for (const target of unmappedTargets) {
		pushIssue(issues, {
			severity: "warning",
			category: "param_dependency",
			title: target.paramName,
			message: "Зависимый параметр не найден в схеме по заголовку или коду",
			target: {
				kind: "logic_dependencies",
				paramCode: target.targetParamCode,
			},
		});
	}

	if (!input.dictionaryEnumsLoading) {
		for (const [pointer, code] of input.dictionaryCodeByPointer) {
			if (!code || input.enumMapByCode[code]) continue;
			const hint = input.fieldPathHints.find((row) => row.pointer === pointer);
			pushIssue(issues, {
				severity: "error",
				category: "schema_field",
				title: hint?.title?.trim() || hint?.key || pointer,
				message: `Справочник «${code}» не найден или пуст`,
				target: { kind: "designer", pointer },
			});
		}
	}

	if (input.monacoError?.trim()) {
		pushIssue(issues, {
			severity: "error",
			category: "monaco",
			title: "Редактор JSON",
			message: input.monacoError.trim(),
			target: { kind: "json" },
		});
	}

	if (input.calculationError?.trim()) {
		pushIssue(issues, {
			severity: "error",
			category: "calculation",
			title: "Калькуляция",
			message: input.calculationError.trim(),
			target: { kind: "calculation" },
		});
	}

	const saveDisplay = input.typicalWorkSaveDisplay;
	if (saveDisplay?.status === "error" && saveDisplay.errorMessage?.trim()) {
		pushIssue(issues, {
			severity: "error",
			category: "save",
			title: saveDisplay.workName?.trim() || "Автосохранение работы",
			message: saveDisplay.errorMessage.trim(),
			target: { kind: "none" },
		});
	} else if (saveDisplay?.blocked && saveDisplay.message?.trim()) {
		pushIssue(issues, {
			severity: "warning",
			category: "save",
			title: saveDisplay.workName?.trim() || "Автосохранение работы",
			message: saveDisplay.message.trim(),
			target: { kind: "none" },
		});
	}

	const severityRank: Record<SchemaEditorIssueSeverity, number> = {
		error: 0,
		warning: 1,
		info: 2,
	};

	return issues.sort((a, b) => {
		const rank = severityRank[a.severity] - severityRank[b.severity];
		if (rank !== 0) return rank;
		return a.title.localeCompare(b.title, "ru");
	});
}

export function countSchemaEditorIssuesBySeverity(
	issues: SchemaEditorIssue[],
): Record<SchemaEditorIssueSeverity, number> {
	return issues.reduce(
		(acc, issue) => {
			acc[issue.severity] += 1;
			return acc;
		},
		{ error: 0, warning: 0, info: 0 },
	);
}

function readIssueTargetSearchParts(target: SchemaEditorIssueTarget): string[] {
	switch (target.kind) {
		case "designer":
			return [target.pointer];
		case "logic_rule":
			return [target.ruleId];
		case "logic_dependencies":
			return [target.pointer ?? "", target.paramCode ?? ""];
		case "typical_work":
			return [target.workId, target.paramCode ?? ""];
		default:
			return [];
	}
}

export function schemaEditorIssueSearchHaystack(issue: SchemaEditorIssue): string {
	return [
		issue.title,
		issue.message,
		SCHEMA_EDITOR_ISSUE_CATEGORY_LABELS[issue.category],
		issue.severity,
		issue.category,
		issue.id,
		issue.target.kind,
		...readIssueTargetSearchParts(issue.target),
	]
		.filter(Boolean)
		.join(" ");
}

export function filterSchemaEditorIssues(
	issues: SchemaEditorIssue[],
	query: string,
): SchemaEditorIssue[] {
	const trimmed = query.trim();
	if (!trimmed) return issues;

	const entries = issues.map((issue) => ({
		issue,
		haystack: schemaEditorIssueSearchHaystack(issue),
	}));
	return fuzzysort
		.go(trimmed, entries, { key: "haystack" })
		.map((match) => match.obj.issue);
}
