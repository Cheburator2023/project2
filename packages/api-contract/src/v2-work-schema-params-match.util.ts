import { formatParamNameWithSourceKeys } from "./v2-work-param-source-keys.util";
import type { TypicalWorkRuleLike, TypicalWorkTriggerArchCountLike } from "./v2-works-catalog-match.util";
import {
	isControlTypeTriggerParam,
	isSourceTypeTriggerParam,
	typicalWorkRulesMatchSource,
} from "./v2-works-catalog-match.util";
import { stripParamNameSourceKeys } from "./v2-work-param-source-keys.util";
import { slugParamCode } from "./v2-param-slug.util";

/** Минимальное описание поля схемы для сопоставления с legacy-кодами каталога. */
export type WorkSchemaParamDef = {
	code: string;
	name: string;
	description?: string | null;
	/** Архитектурный компонент поля из ближайшего ui:options.archComponent. */
	archComponent?: string | null;
	schemaFieldUid?: string | null;
	schemaPointer?: string | null;
	sourceKeys?: string[];
	values?: Array<{ code: string; label: string }>;
};

export type TypicalWorkRuleRefLike = {
	paramCode: string;
	paramName?: string | null;
	schemaFieldUid?: string | null;
};

/**
 * Нормализует legacy-ярлыки каталога (АвтоМЛ / Маркер) к названиям полей схемы.
 */
export function normalizeLegacySchemaParamLabel(name: string): string {
	let next = stripParamNameSourceKeys(name).trim();
	next = next.replace(/^АвтоМЛ\s*:/iu, "AutoML:");
	next = next.replace(/\s+в\s+Маркере\s*$/iu, "");
	next = next.replace(
		/требуется\s+новая\s+модель\s+Маркера\s+для/iu,
		"Требуется новая модель для",
	);
	next = next.replace(/в\/из\s+Маркер(?:е|а)?\s*$/iu, "в/из ИС 1860");
	return next.trim();
}

/** Нормализует legacy paramCode (`автомл_*`, `*_в_маркере`) к slug поля схемы. */
export function normalizeLegacySchemaParamCode(code: string): string {
	return code
		.trim()
		.toLowerCase()
		.replace(/^автомл_/, "automl_")
		.replace(/_в_маркере$/, "")
		.replace(/_маркера_для_/, "_для_")
		.replace(/_в_из_маркер(?:е|а)?$/, "_в_из_ис_1860");
}

function paramLabelsEquivalent(a: string, b: string): boolean {
	const left = normalizeLegacySchemaParamLabel(a);
	const right = normalizeLegacySchemaParamLabel(b);
	if (left.toLowerCase() === right.toLowerCase()) return true;
	return slugParamCode(left) === slugParamCode(right);
}

export function findWorkSchemaParameter<T extends WorkSchemaParamDef>(
	params: T[],
	paramCode: string,
	paramName?: string | null,
): T | undefined {
	const direct = params.find((param) => param.code === paramCode);
	if (direct) return direct;

	const byAlias = params.find((param) => param.sourceKeys?.includes(paramCode));
	if (byAlias) return byAlias;

	const normalizedCode = normalizeLegacySchemaParamCode(paramCode);
	if (normalizedCode) {
		const byLegacyCode = params.find((param) => {
			const schemaSlug = slugParamCode(
				normalizeLegacySchemaParamLabel(param.name),
			);
			return (
				schemaSlug === normalizedCode ||
				normalizeLegacySchemaParamCode(param.code) === normalizedCode ||
				param.sourceKeys?.some(
					(key) => normalizeLegacySchemaParamCode(key) === normalizedCode,
				)
			);
		});
		if (byLegacyCode) return byLegacyCode;
	}

	if (paramName?.trim()) {
		const name = stripParamNameSourceKeys(paramName).trim();
		const byName = params.find((param) => param.name === name);
		if (byName) return byName;
		const normName = name.toLowerCase();
		const byNormName = params.find(
			(param) =>
				stripParamNameSourceKeys(param.name).trim().toLowerCase() === normName,
		);
		if (byNormName) return byNormName;
		const byLegacyLabel = params.find((param) =>
			paramLabelsEquivalent(param.name, name),
		);
		if (byLegacyLabel) return byLegacyLabel;
	}

	return undefined;
}

/** CSV/seed-триггер → поле схемы анкеты (алиас «Тип источника» → `type`). */
export function resolveWorkSchemaParamForRule<T extends WorkSchemaParamDef>(
	rule: TypicalWorkRuleRefLike,
	params: T[],
): T | undefined {
	if (rule.schemaFieldUid?.trim()) {
		const byUid = params.find(
			(param) => param.schemaFieldUid === rule.schemaFieldUid,
		);
		if (byUid) return byUid;
	}

	const direct =
		findWorkSchemaParameter(params, rule.paramCode, rule.paramName) ??
		undefined;
	if (direct) return direct;

	if (isSourceTypeTriggerParam(rule.paramCode, rule.paramName)) {
		return (
			params.find((param) => param.code === "type") ??
			params.find((param) => /тип.*источник/i.test(param.name))
		);
	}

	if (isControlTypeTriggerParam(rule.paramCode, rule.paramName)) {
		const controlField =
			params.find((param) => param.code === "вид_контроля") ??
			params.find(
				(param) =>
					/^вид контроля$/i.test(
						stripParamNameSourceKeys(param.name).trim(),
					),
			) ??
			params.find((param) =>
				param.values?.some(
					(value) =>
						/^(КД|ТМ|ОК|АК|КМЗ|ОВ)\s*—/i.test(value.label) ||
						/^(кд|тм|ок|ак|кмз|ов)$/i.test(value.code),
				),
			) ??
			params.find((param) => /вид контроля/i.test(param.name));
		if (controlField) return controlField;
	}

	return undefined;
}

export function resolveTypicalWorkRulesForSourceMatch<
	T extends TypicalWorkRuleLike,
>(rules: T[], schemaParams: WorkSchemaParamDef[] | undefined): T[] {
	if (!schemaParams?.length) return rules;
	return rules.map((rule) => {
		const resolved = resolveWorkSchemaParamForRule(rule, schemaParams);
		if (!resolved) return rule;
		return {
			...rule,
			paramCode: resolved.code,
			paramName: formatParamNameWithSourceKeys(
				resolved.name,
				resolved.sourceKeys,
			),
		};
	});
}

export function typicalWorkRulesMatchSourceWithSchema(
	rules: TypicalWorkRuleLike[],
	source: Record<string, unknown>,
	schemaParams?: WorkSchemaParamDef[],
	formData?: Record<string, unknown>,
	triggerArchCount?: TypicalWorkTriggerArchCountLike | null,
): boolean {
	return typicalWorkRulesMatchSource(
		resolveTypicalWorkRulesForSourceMatch(rules, schemaParams),
		source,
		formData,
		triggerArchCount,
	);
}

export type LaborCoefficientRowRef = {
	paramCode: string;
	paramName?: string | null;
	valueCode: string | null;
	valueLabel: string | null;
	coefficient: number;
};

export function remapLaborCoefficientRowsForSchema<
	T extends LaborCoefficientRowRef,
>(rows: readonly T[], schemaParams: WorkSchemaParamDef[] | undefined): T[] {
	if (!schemaParams?.length) return [...rows];
	return rows.map((row) => {
		const resolved = resolveWorkSchemaParamForRule(row, schemaParams);
		if (!resolved) return row;
		return {
			...row,
			paramCode: resolved.code,
			paramName: formatParamNameWithSourceKeys(
				resolved.name,
				resolved.sourceKeys,
			),
		};
	});
}
