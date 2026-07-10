import type { V2LogicGraphDto, V2LogicRuleDto } from "@smart-anketa/api-contract";
import {
	patchV2AnketaCalculationLogicRules,
	resolveSourceTypicalWorksOutputPath,
} from "@smart-anketa/api-contract";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { normalizeJsonPointer } from "./schemaPaths";
import { resolveArchComponentAtPointer } from "../schemaEditor/propertiesFieldKind";

export function resolveEffectiveLogicRules(
	logic: V2LogicGraphDto,
	jsonSchema: RJSFSchema,
	uiSchema: UiSchema,
): V2LogicRuleDto[] {
	return (
		patchV2AnketaCalculationLogicRules(logic, { jsonSchema, uiSchema }).rules ??
		[]
	);
}

export function resolveTypicalWorkOutputPointer(
	jsonSchema: RJSFSchema,
	uiSchema: UiSchema,
): string | null {
	const dotPath = resolveSourceTypicalWorksOutputPath(jsonSchema, uiSchema);
	return dotPath
		? normalizeJsonPointer(`/${dotPath.replace(/\./g, "/")}`)
		: null;
}

export function resolveRulesForSelectedExact(
	rules: V2LogicRuleDto[],
	selectedPointer: string | null,
	uiSchema: UiSchema,
	jsonSchema: RJSFSchema,
): V2LogicRuleDto[] {
	if (selectedPointer === null) return [];
	const pointer = normalizeJsonPointer(selectedPointer);
	const exact = rules.filter(
		(rule) => normalizeJsonPointer(rule.targetPath) === pointer,
	);
	if (exact.length > 0) return exact;

	const arch = resolveArchComponentAtPointer(uiSchema, pointer);
	if (arch !== "typicalWork") return exact;

	const outputPointer = resolveTypicalWorkOutputPointer(jsonSchema, uiSchema);
	if (!outputPointer) return exact;

	return rules.filter(
		(rule) => normalizeJsonPointer(rule.targetPath) === outputPointer,
	);
}

export function resolveRulesWhereSelectedIsDependency(
	rules: V2LogicRuleDto[],
	selectedPointer: string | null,
): V2LogicRuleDto[] {
	if (selectedPointer === null) return [];
	const pointer = normalizeJsonPointer(selectedPointer);
	return rules.filter((rule) =>
		rule.dependencies.some((dep) => normalizeJsonPointer(dep) === pointer),
	);
}

export function resolveRulesForSelectedSubtree(
	rules: V2LogicRuleDto[],
	selectedPointer: string | null,
): V2LogicRuleDto[] {
	if (selectedPointer === null) return [];
	const pointer = normalizeJsonPointer(selectedPointer);
	if (pointer === "/") return [];
	const prefix = `${pointer}/`;
	return rules.filter((rule) => {
		const target = normalizeJsonPointer(rule.targetPath);
		if (target === pointer) return false;
		return target.startsWith(prefix);
	});
}

export function findSourceTypicalWorksCatalogRule(
	rules: V2LogicRuleDto[],
): V2LogicRuleDto | undefined {
	return rules.find((rule) => rule.id === "unified-source-typical-works");
}
