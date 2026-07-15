import type {
	V2TypicalWorkCardDto,
	V2TypicalWorkLaborParamGroupDto,
	V2TypicalWorkRuleDto,
	V2WorkFormulaToken,
} from "./v2-typical-work.types";
import { slugParamCode } from "./v2-param-slug.util";
import { schemaEnumValueMatchesRule } from "./v2-template-work-schema-params.util";
import { stripParamNameSourceKeys } from "./v2-work-param-source-keys.util";
import { tokensToText } from "./v2-work-formula.util";

export type V2TypicalWorkSchemaFieldSyncRequestDto = {
	templateVersionId: string;
	mode: "dryRun" | "apply";
	operation: "upsert" | "delete";
	field: {
		schemaFieldUid: string;
		previousCode?: string | null;
		/** Доп. legacy-коды (slug, sourceKeys) для сопоставления правил/формул. */
		aliasCodes?: string[];
		code?: string | null;
		name?: string | null;
		values?: Array<{ code: string; label: string }>;
	};
};

export type V2TypicalWorkSchemaFieldSyncImpactDto = {
	worksMatched: number;
	worksUpdated: number;
	rulesUpdated: number;
	rulesRemoved: number;
	laborParamsUpdated: number;
	laborParamsRemoved: number;
	formulasInvalidated: number;
};

export type V2TypicalWorkSchemaBulkSyncResponseDto =
	V2TypicalWorkSchemaFieldSyncImpactDto & {
		fieldsProcessed: number;
		consistencyIssues: import("./v2-template-work-schema-params.util").TypicalWorkSchemaConsistencyIssue[];
	};

function collectFieldAliasCodes(
	request: V2TypicalWorkSchemaFieldSyncRequestDto,
): Set<string> {
	const aliases = new Set<string>();
	for (const code of [
		request.field.previousCode,
		request.field.code,
		...(request.field.aliasCodes ?? []),
	]) {
		if (code?.trim()) aliases.add(code.trim());
	}
	if (request.field.name?.trim()) {
		const slug = slugParamCode(
			stripParamNameSourceKeys(request.field.name).trim(),
		);
		if (slug) aliases.add(slug);
	}
	return aliases;
}

function matchesField(
	ref: {
		schemaFieldUid?: string | null;
		paramCode: string;
		paramName?: string | null;
	},
	request: V2TypicalWorkSchemaFieldSyncRequestDto,
): boolean {
	if (
		ref.schemaFieldUid &&
		ref.schemaFieldUid === request.field.schemaFieldUid
	) {
		return true;
	}

	const aliases = collectFieldAliasCodes(request);
	if (aliases.has(ref.paramCode)) return true;

	if (request.field.name?.trim() && ref.paramName?.trim()) {
		const fieldName = stripParamNameSourceKeys(request.field.name)
			.trim()
			.toLowerCase();
		const refName = stripParamNameSourceKeys(ref.paramName).trim().toLowerCase();
		if (fieldName === refName) return true;
	}

	return false;
}

function reconcileRule(
	rule: V2TypicalWorkRuleDto,
	request: V2TypicalWorkSchemaFieldSyncRequestDto,
): V2TypicalWorkRuleDto | null {
	if (!matchesField(rule, request)) return rule;
	if (request.operation === "delete") return null;

	const values = request.field.values;
	if (values === undefined) {
		return {
			...rule,
			schemaFieldUid: request.field.schemaFieldUid,
			paramCode: request.field.code ?? rule.paramCode,
			paramName: request.field.name ?? rule.paramName,
		};
	}
	const allowed = new Map(values.map((value) => [value.code, value.label]));
	const isSetOperator = rule.operator === "in" || rule.operator === "not_in";
	const nextValues = isSetOperator
		? (rule.values ?? [])
				.filter((value) =>
					values.some((allowedValue) =>
						schemaEnumValueMatchesRule(allowedValue, {
							valueCode: value.code,
							valueLabel: value.label,
						}),
					),
				)
				.map((value) => {
					const matched = values.find((allowedValue) =>
						schemaEnumValueMatchesRule(allowedValue, {
							valueCode: value.code,
							valueLabel: value.label,
						}),
					);
					return {
						code: matched?.code ?? value.code,
						label: matched?.label ?? value.label ?? null,
					};
				})
		: undefined;
	const scalarMatch = values.find((value) =>
		schemaEnumValueMatchesRule(value, rule),
	);
	const scalarAvailable = scalarMatch != null;

	return {
		...rule,
		schemaFieldUid: request.field.schemaFieldUid,
		paramCode: request.field.code ?? rule.paramCode,
		paramName: request.field.name ?? rule.paramName,
		valueCode: isSetOperator ? null : scalarAvailable ? scalarMatch.code : null,
		valueLabel: isSetOperator
			? null
			: scalarAvailable
				? (scalarMatch.label ?? rule.valueLabel)
				: null,
		values: nextValues,
	};
}

function reconcileLaborParam(
	group: V2TypicalWorkLaborParamGroupDto,
	request: V2TypicalWorkSchemaFieldSyncRequestDto,
): V2TypicalWorkLaborParamGroupDto | null {
	if (!matchesField(group, request)) return group;
	if (request.operation === "delete") return null;

	const values = request.field.values;
	const oldCoefficients = new Map(
		group.coefficients.map((row) => [row.valueCode, row]),
	);
	const nextBase = {
		...group,
		schemaFieldUid: request.field.schemaFieldUid,
		paramCode: request.field.code ?? group.paramCode,
		paramName: request.field.name ?? group.paramName,
	};
	if (values === undefined) return nextBase;

	if ((group.kind ?? "by_value") === "any_of") {
		const selected = new Set(group.anyOf?.valueCodes ?? []);
		const selectedValues = values.filter((value) => selected.has(value.code));
		return {
			...nextBase,
			anyOf: {
				valueCodes: selectedValues.map((value) => value.code),
				valueLabels: selectedValues.map((value) => value.label),
				coeffOn: group.anyOf?.coeffOn ?? 1,
				coeffOff: group.anyOf?.coeffOff ?? 1,
			},
		};
	}

	return {
		...nextBase,
		coefficients: values.map((value, index) => {
			const existing = oldCoefficients.get(value.code);
			return {
				id: existing?.id ?? `sync-${index}-${value.code}`,
				streamExecutor:
					existing?.streamExecutor ??
					group.coefficients[0]?.streamExecutor ??
					"",
				paramCode: request.field.code ?? group.paramCode,
				paramName: request.field.name ?? group.paramName,
				valueCode: value.code,
				valueLabel: value.label,
				coefficient: existing?.coefficient ?? 1,
			};
		}),
	};
}

function reconcileFormulaTokens(
	tokens: V2WorkFormulaToken[],
	oldParamCode: string,
	request: V2TypicalWorkSchemaFieldSyncRequestDto,
): { tokens: V2WorkFormulaToken[]; invalidated: boolean } {
	let invalidated = false;
	return {
		tokens: tokens.map((token) => {
			if (
				(token.kind !== "param_coeff" && token.kind !== "param_anyof") ||
				token.paramCode !== oldParamCode
			) {
				return token;
			}
			if (request.operation === "delete") {
				invalidated = true;
				return { ...token, invalid: true };
			}
			return {
				...token,
				paramCode: request.field.code ?? token.paramCode,
				paramName: request.field.name ?? token.paramName,
				invalid: false,
			};
		}),
		invalidated,
	};
}

export function reconcileTypicalWorkCardWithSchemaField(
	card: V2TypicalWorkCardDto,
	request: V2TypicalWorkSchemaFieldSyncRequestDto,
): {
	card: V2TypicalWorkCardDto;
	changed: boolean;
	impact: Omit<
		V2TypicalWorkSchemaFieldSyncImpactDto,
		"worksMatched" | "worksUpdated"
	>;
} {
	const matchingRules = card.rules.filter((rule) =>
		matchesField(rule, request),
	);
	const matchingLabor = card.laborParams.filter((group) =>
		matchesField(group, request),
	);
	const oldCodes = new Set([
		...matchingRules.map((rule) => rule.paramCode),
		...matchingLabor.map((group) => group.paramCode),
	]);
	const rules = card.rules
		.map((rule) => reconcileRule(rule, request))
		.filter((rule): rule is V2TypicalWorkRuleDto => rule != null);
	const laborParams = card.laborParams
		.map((group) => reconcileLaborParam(group, request))
		.filter((group): group is V2TypicalWorkLaborParamGroupDto => group != null);

	let formulaTokens = card.formula.tokens;
	let formulasInvalidated = 0;
	for (const oldCode of oldCodes) {
		const reconciled = reconcileFormulaTokens(formulaTokens, oldCode, request);
		formulaTokens = reconciled.tokens;
		if (reconciled.invalidated) formulasInvalidated = 1;
	}
	const changed = matchingRules.length > 0 || matchingLabor.length > 0;

	return {
		card: {
			...card,
			rules,
			laborParams,
			formula: {
				tokens: formulaTokens,
				text: tokensToText(formulaTokens),
			},
		},
		changed,
		impact: {
			rulesUpdated: request.operation === "upsert" ? matchingRules.length : 0,
			rulesRemoved: request.operation === "delete" ? matchingRules.length : 0,
			laborParamsUpdated:
				request.operation === "upsert" ? matchingLabor.length : 0,
			laborParamsRemoved:
				request.operation === "delete" ? matchingLabor.length : 0,
			formulasInvalidated,
		},
	};
}
