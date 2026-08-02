import type {
	V2TypicalWorkCardDto,
	V2TypicalWorkLaborParamGroupDto,
	V2TypicalWorkRuleDto,
	V2WorkFormulaToken,
} from "./v2-typical-work.types";
import {
	normalizeStoredValueCode,
	normalizeStoredValueLabel,
	slugParamCode,
} from "./v2-param-slug.util";
import { schemaEnumValueMatchesRule } from "./v2-template-work-schema-params.util";
import {
	formatParamNameWithSourceKeys,
	parseParamNameSourceKeys,
	stripParamNameSourceKeys,
} from "./v2-work-param-source-keys.util";
import {
	isParamToken,
	markUnknownFormulaLaborParamTokensInvalid,
	reconcileFormulaLaborParamTokens,
	tokensToText,
} from "./v2-work-formula.util";

export type V2TypicalWorkSchemaFieldSyncRequestDto = {
	templateVersionId: string;
	mode: "dryRun" | "apply";
	operation: "upsert" | "delete";
	/**
	 * Uid-ы полей, которых больше нет в схеме версии. Ссылки работ на них
	 * считаются непривязанными: иначе поле, пересозданное в конструкторе,
	 * навсегда остаётся с мёртвой привязкой (матч по коду/имени блокируется
	 * при заполненном schemaFieldUid).
	 */
	staleSchemaFieldUids?: string[];
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

/** Работа, которую затронет синхронизация, — для предпросмотра перед apply. */
export type V2TypicalWorkSchemaSyncAffectedWorkDto = {
	workId: string;
	workName: string;
	streamExecutor: string;
	rulesUpdated: number;
	rulesRemoved: number;
	laborParamsUpdated: number;
	laborParamsRemoved: number;
	formulaInvalidated: boolean;
};

export type V2TypicalWorkSchemaFieldSyncImpactDto = {
	worksMatched: number;
	worksUpdated: number;
	rulesUpdated: number;
	rulesRemoved: number;
	laborParamsUpdated: number;
	laborParamsRemoved: number;
	formulasInvalidated: number;
	affectedWorks: V2TypicalWorkSchemaSyncAffectedWorkDto[];
};

/** Слияние записей об одной работе, затронутой несколькими полями схемы. */
export function mergeSchemaSyncAffectedWorks(
	target: V2TypicalWorkSchemaSyncAffectedWorkDto[],
	incoming: V2TypicalWorkSchemaSyncAffectedWorkDto[],
): V2TypicalWorkSchemaSyncAffectedWorkDto[] {
	const byKey = new Map(
		target.map((work) => [`${work.workId}:${work.streamExecutor}`, work]),
	);
	for (const work of incoming) {
		const key = `${work.workId}:${work.streamExecutor}`;
		const existing = byKey.get(key);
		if (!existing) {
			byKey.set(key, { ...work });
			continue;
		}
		existing.rulesUpdated += work.rulesUpdated;
		existing.rulesRemoved += work.rulesRemoved;
		existing.laborParamsUpdated += work.laborParamsUpdated;
		existing.laborParamsRemoved += work.laborParamsRemoved;
		existing.formulaInvalidated =
			existing.formulaInvalidated || work.formulaInvalidated;
	}
	return [...byKey.values()];
}

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

/**
 * Сравниваем подписи полей без декоративного префикса «Маркер:» и регистра.
 * Иначе после правок CSV/factory bulk dryRun на проде вечно предлагает
 * «обновить типовые работы», хотя смысл привязки не менялся.
 */
function normalizeSchemaFieldDisplayName(name: string | null | undefined): string {
	return stripParamNameSourceKeys(name)
		.replace(/^Маркер:\s*/i, "")
		.trim()
		.toLocaleLowerCase("ru");
}

/**
 * Привязка уже соответствует полю схемы: тот же uid, код и отображаемое имя.
 * В этом случае нельзя переписывать `paramName` (добавлять `@ field_xxx` / алиасы) —
 * иначе bulk dryRun на нетронутой схеме вечно предлагает «обновить типовые работы».
 */
function isSchemaFieldBindingCurrent(
	ref: {
		schemaFieldUid?: string | null;
		paramCode: string;
		paramName?: string | null;
	},
	request: V2TypicalWorkSchemaFieldSyncRequestDto,
	nextCode: string,
): boolean {
	if (ref.schemaFieldUid !== request.field.schemaFieldUid) return false;
	if (ref.paramCode !== nextCode) return false;
	const currentDisplay = normalizeSchemaFieldDisplayName(ref.paramName);
	const nextDisplay = normalizeSchemaFieldDisplayName(
		request.field.name ?? ref.paramName ?? "",
	);
	if (!nextDisplay) return true;
	// Пустой/битый display (`" @ field|…"` после старого truncate) или
	// реальное переименование / обрезка varchar — один rewrite, затем equal.
	if (!currentDisplay) return false;
	return currentDisplay === nextDisplay;
}

function formatSyncedParamName(
	request: V2TypicalWorkSchemaFieldSyncRequestDto,
	currentName: string | null | undefined,
	nextCode: string,
	previousCode?: string | null,
): string | null {
	const displayName = stripParamNameSourceKeys(
		request.field.name ?? currentName ?? "",
	).trim();
	if (!displayName) return currentName ?? null;
	/**
	 * Уже накопленные алиасы переносим, а слаг прежнего имени добавляем только при
	 * реальном переименовании. Иначе каждый прогон подменяет слаг на текущее имя,
	 * реконсиляция не сходится и bulk dryRun вечно рапортует «схема изменилась».
	 */
	const current = parseParamNameSourceKeys(currentName);
	const currentNorm = normalizeSchemaFieldDisplayName(current.displayName);
	const nextNorm = normalizeSchemaFieldDisplayName(displayName);
	if (
		currentNorm === nextNorm &&
		(previousCode ?? nextCode) === nextCode &&
		(current.sourceKeys.length === 0 || current.sourceKeys.includes(nextCode))
	) {
		// Код и имя не менялись (в т.ч. только «Маркер:» / регистр) —
		// не дописываем декоративный `@ code` и лишние алиасы.
		return currentName ?? null;
	}
	const truncationArtifact =
		Boolean(currentNorm) &&
		Boolean(nextNorm) &&
		(nextNorm.startsWith(currentNorm) || currentNorm.startsWith(nextNorm));
	const aliasCodes = [
		nextCode,
		previousCode,
		request.field.previousCode,
		...(request.field.aliasCodes ?? []),
		...current.sourceKeys,
		// Слаг от обрезанного displayName только размножает мусорные алиасы.
		!truncationArtifact &&
		current.displayName &&
		currentNorm !== nextNorm
			? slugParamCode(current.displayName)
			: null,
	].filter((code): code is string => Boolean(code?.trim()));
	return formatParamNameWithSourceKeys(displayName, [...new Set(aliasCodes)]);
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

	/** Уже привязан к другому живому полю — не перехватывать по коду/имени. */
	const refUid = ref.schemaFieldUid?.trim();
	if (refUid && !request.staleSchemaFieldUids?.includes(refUid)) {
		return false;
	}

	const aliases = collectFieldAliasCodes(request);
	if (aliases.has(ref.paramCode)) return true;

	if (request.field.name?.trim() && ref.paramName?.trim()) {
		const fieldName = normalizeSchemaFieldDisplayName(request.field.name);
		const refName = normalizeSchemaFieldDisplayName(ref.paramName);
		if (fieldName && fieldName === refName) return true;
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
		const nextCode = request.field.code ?? rule.paramCode;
		if (isSchemaFieldBindingCurrent(rule, request, nextCode)) {
			return rule;
		}
		return {
			...rule,
			schemaFieldUid: request.field.schemaFieldUid,
			paramCode: nextCode,
			paramName:
				formatSyncedParamName(
					request,
					rule.paramName,
					nextCode,
					rule.paramCode,
				) ?? rule.paramName,
		};
	}
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
		paramName:
			formatSyncedParamName(
				request,
				rule.paramName,
				request.field.code ?? rule.paramCode,
				rule.paramCode,
			) ?? rule.paramName,
		valueCode: isSetOperator
			? null
			: scalarAvailable
				? normalizeStoredValueCode(scalarMatch.code, scalarMatch.label)
				: null,
		valueLabel: isSetOperator
			? null
			: scalarAvailable
				? normalizeStoredValueLabel(scalarMatch.label ?? rule.valueLabel)
				: null,
		values: nextValues,
	};
}

function normalizeLaborValueIdentity(value: string | null | undefined): string {
	return (value ?? "")
		.trim()
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/\s+/g, "");
}

/** Ключ совпадения для uq_v2_typical_work_labor (work, stream, param_code, value_code). */
export function laborCoefficientStoredKey(row: {
	valueCode?: string | null;
	valueLabel?: string | null;
}): string {
	if (row.valueCode == null && !row.valueLabel?.trim()) return "";
	return normalizeLaborValueIdentity(
		normalizeStoredValueCode(
			row.valueCode ?? row.valueLabel ?? "",
			row.valueLabel,
		),
	);
}

export function dedupeLaborCoefficientsByStoredValue<
	T extends { valueCode?: string | null; valueLabel?: string | null },
>(coefficients: readonly T[]): T[] {
	const seen = new Set<string>();
	const result: T[] = [];
	for (const row of coefficients) {
		const key = laborCoefficientStoredKey(row);
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(row);
	}
	return result;
}

function laborCoefficientIdentity(row: {
	valueCode?: string | null;
	valueLabel?: string | null;
}): string {
	return laborCoefficientStoredKey(row);
}

type MergeableLaborParamGroup = {
	paramCode: string;
	schemaFieldUid?: string | null;
	paramName?: string | null;
	kind?: "by_value" | "any_of";
	coefficients?: Array<{
		valueCode?: string | null;
		valueLabel?: string | null;
	}>;
	anyOf?: V2TypicalWorkLaborParamGroupDto["anyOf"];
};

/** Схлопывает группы с одним paramCode — иначе patchWork ловит uq_v2_typical_work_labor_param. */
export function mergeLaborParamGroupsByParamCode<
	T extends MergeableLaborParamGroup,
>(groups: T[]): T[] {
	const merged = new Map<string, T>();

	for (const group of groups) {
		const key = group.paramCode.trim();
		if (!key) continue;

		const existing = merged.get(key);
		if (!existing) {
			merged.set(key, {
				...group,
				coefficients: dedupeLaborCoefficientsByStoredValue(
					group.coefficients ?? [],
				),
			} as T);
			continue;
		}

		const coefficientsByIdentity = new Map<
			string,
			NonNullable<T["coefficients"]>[number]
		>();
		for (const row of [
			...(existing.coefficients ?? []),
			...(group.coefficients ?? []),
		]) {
			const identity = laborCoefficientIdentity(row);
			if (!coefficientsByIdentity.has(identity)) {
				coefficientsByIdentity.set(identity, row);
			}
		}

		merged.set(key, {
			...existing,
			schemaFieldUid: group.schemaFieldUid ?? existing.schemaFieldUid,
			paramName: group.paramName ?? existing.paramName,
			kind: group.kind ?? existing.kind,
			anyOf: group.anyOf ?? existing.anyOf,
			coefficients: dedupeLaborCoefficientsByStoredValue([
				...coefficientsByIdentity.values(),
			]),
		} as T);
	}

	return [...merged.values()];
}

function findMatchingLaborCoefficient(
	group: V2TypicalWorkLaborParamGroupDto,
	value: { code: string; label: string },
) {
	return group.coefficients.find(
		(row) =>
			schemaEnumValueMatchesRule(value, {
				valueCode: row.valueCode,
				valueLabel: row.valueLabel,
			}) ||
			normalizeLaborValueIdentity(row.valueCode) ===
				normalizeLaborValueIdentity(value.code) ||
			normalizeLaborValueIdentity(row.valueLabel) ===
				normalizeLaborValueIdentity(value.label),
	);
}

function reconcileLaborParam(
	group: V2TypicalWorkLaborParamGroupDto,
	request: V2TypicalWorkSchemaFieldSyncRequestDto,
): V2TypicalWorkLaborParamGroupDto | null {
	if (!matchesField(group, request)) return group;
	if (request.operation === "delete") return null;

	const values = request.field.values;
	const nextCode = request.field.code ?? group.paramCode;
	if (values === undefined && isSchemaFieldBindingCurrent(group, request, nextCode)) {
		return group;
	}
	const nextBase = {
		...group,
		schemaFieldUid: request.field.schemaFieldUid,
		paramCode: nextCode,
		paramName:
			formatSyncedParamName(
				request,
				group.paramName,
				nextCode,
				group.paramCode,
			) ?? group.paramName,
	};
	if (values === undefined) return nextBase;

	if ((group.kind ?? "by_value") === "any_of") {
		const selected = new Set(group.anyOf?.valueCodes ?? []);
		const selectedValues = values.filter((value) => selected.has(value.code));
		return {
			...nextBase,
			anyOf: {
				valueCodes: selectedValues.map((value) =>
					normalizeStoredValueCode(value.code, value.label),
				),
				valueLabels: selectedValues.map(
					(value) => normalizeStoredValueLabel(value.label) ?? value.label,
				),
				coeffOn: group.anyOf?.coeffOn ?? 1,
				coeffOff: group.anyOf?.coeffOff ?? 1,
			},
		};
	}

	const matchedExisting = new Set<string>();
	const synced = values.map((value, index) => {
		const existing = findMatchingLaborCoefficient(group, value);
		if (existing) {
			matchedExisting.add(
				existing.id ??
					`${normalizeLaborValueIdentity(existing.valueCode)}\0${normalizeLaborValueIdentity(existing.valueLabel)}`,
			);
		}
		return {
			id: existing?.id ?? `sync-${index}-${value.code}`,
			streamExecutor:
				existing?.streamExecutor ??
				group.coefficients[0]?.streamExecutor ??
				"",
			paramCode: request.field.code ?? group.paramCode,
			paramName: request.field.name ?? group.paramName,
			valueCode: normalizeStoredValueCode(value.code, value.label),
			valueLabel: normalizeStoredValueLabel(value.label),
			coefficient: existing?.coefficient ?? 1,
		};
	});
	/** Не дропать строки, которых нет в values — иначе bulk/словарь затирает правки админа. */
	const orphans = group.coefficients.filter((row) => {
		if (!row.valueCode && !row.valueLabel) return false;
		const key =
			row.id ??
			`${normalizeLaborValueIdentity(row.valueCode)}\0${normalizeLaborValueIdentity(row.valueLabel)}`;
		if (matchedExisting.has(key)) return false;
		return !values.some(
			(value) =>
				schemaEnumValueMatchesRule(value, {
					valueCode: row.valueCode,
					valueLabel: row.valueLabel,
				}) ||
				normalizeLaborValueIdentity(row.valueCode) ===
					normalizeLaborValueIdentity(value.code) ||
				normalizeLaborValueIdentity(row.valueLabel) ===
					normalizeLaborValueIdentity(value.label),
		);
	});

	return {
		...nextBase,
		coefficients: dedupeLaborCoefficientsByStoredValue([...synced, ...orphans]),
	};
}

function reconcileFormulaTokensForField(
	tokens: V2WorkFormulaToken[],
	request: V2TypicalWorkSchemaFieldSyncRequestDto,
): { tokens: V2WorkFormulaToken[]; invalidated: boolean } {
	const aliases = collectFieldAliasCodes(request);
	let invalidated = false;
	return {
		tokens: tokens.map((token) => {
			if (!isParamToken(token)) return token;
			if (!aliases.has(token.paramCode)) return token;
			if (request.operation === "delete") {
				invalidated = true;
				return { ...token, invalid: true };
			}
			const nextCode = request.field.code ?? token.paramCode;
			const nextName =
				formatSyncedParamName(
					request,
					token.paramName,
					nextCode,
					token.paramCode,
				) ?? token.paramName;
			if (
				token.paramCode === nextCode &&
				token.paramName === nextName &&
				!token.invalid
			) {
				return token;
			}
			const { invalid: _invalid, ...rest } = token;
			return {
				...rest,
				paramCode: nextCode,
				paramName: nextName,
			};
		}),
		invalidated,
	};
}

function sanitizeFormulaAgainstLaborParams(
	tokens: V2WorkFormulaToken[],
	laborParams: V2TypicalWorkLaborParamGroupDto[],
): { tokens: V2WorkFormulaToken[]; invalidated: boolean } {
	const laborRefs = laborParams.map((group) => ({
		paramCode: group.paramCode,
		paramName: group.paramName ?? null,
	}));
	const nextTokens = markUnknownFormulaLaborParamTokensInvalid(tokens, laborRefs);
	const invalidated = nextTokens.some(
		(token, index) =>
			isParamToken(token) &&
			token.invalid &&
			isParamToken(tokens[index]!) &&
			!tokens[index]!.invalid,
	);
	return { tokens: nextTokens, invalidated };
}

export function reconcileTypicalWorkCardWithSchemaField(
	card: V2TypicalWorkCardDto,
	request: V2TypicalWorkSchemaFieldSyncRequestDto,
): {
	card: V2TypicalWorkCardDto;
	changed: boolean;
	impact: Omit<
		V2TypicalWorkSchemaFieldSyncImpactDto,
		"worksMatched" | "worksUpdated" | "affectedWorks"
	>;
} {
	const matchingRules = card.rules.filter((rule) =>
		matchesField(rule, request),
	);
	const matchingLabor = card.laborParams.filter((group) =>
		matchesField(group, request),
	);

	/** Поле схемы не ссылается на эту карточку — не гонять merge/formula. */
	if (matchingRules.length === 0 && matchingLabor.length === 0) {
		return {
			card,
			changed: false,
			impact: {
				rulesUpdated: 0,
				rulesRemoved: 0,
				laborParamsUpdated: 0,
				laborParamsRemoved: 0,
				formulasInvalidated: 0,
			},
		};
	}

	/**
	 * Bulk dryRun идёт по каждому полю схемы (в т.ч. десятки дублей workType).
	 * Если uid+code+имя уже совпадают — не трогаем карточку: иначе
	 * formatSyncedParamName / mergeLaborParamGroups переписывают aliases и
	 * формулу на каждом заходе, и редактор вечно предлагает синхронизацию
	 * даже на только что созданной схеме.
	 */
	const bindingsAlreadyCurrent =
		request.operation === "upsert" &&
		request.field.values === undefined &&
		(matchingRules.length > 0 || matchingLabor.length > 0) &&
		matchingRules.every((rule) =>
			isSchemaFieldBindingCurrent(
				rule,
				request,
				request.field.code ?? rule.paramCode,
			),
		) &&
		matchingLabor.every((group) =>
			isSchemaFieldBindingCurrent(
				group,
				request,
				request.field.code ?? group.paramCode,
			),
		);
	if (bindingsAlreadyCurrent) {
		return {
			card,
			changed: false,
			impact: {
				rulesUpdated: 0,
				rulesRemoved: 0,
				laborParamsUpdated: 0,
				laborParamsRemoved: 0,
				formulasInvalidated: 0,
			},
		};
	}

	const rules = card.rules
		.map((rule) => reconcileRule(rule, request))
		.filter((rule): rule is V2TypicalWorkRuleDto => rule != null);
	const laborParams = mergeLaborParamGroupsByParamCode(
		card.laborParams
			.map((group) => reconcileLaborParam(group, request))
			.filter((group): group is V2TypicalWorkLaborParamGroupDto => group != null),
	);

	const formulaReconciled =
		matchingRules.length > 0 || matchingLabor.length > 0
			? reconcileFormulaTokensForField(card.formula.tokens, request)
			: { tokens: card.formula.tokens, invalidated: false };
	let formulaTokens = formulaReconciled.tokens;
	let formulasInvalidated = formulaReconciled.invalidated ? 1 : 0;

	const formulaSanitized = sanitizeFormulaAgainstLaborParams(
		formulaTokens,
		laborParams,
	);
	formulaTokens = reconcileFormulaLaborParamTokens(
		formulaSanitized.tokens,
		laborParams.map((group) => ({
			paramCode: group.paramCode,
			paramName: group.paramName ?? null,
		})),
	);
	if (formulaSanitized.invalidated) {
		formulasInvalidated = 1;
	}

	/**
	 * «Изменено» — только когда результат реконсиляции реально отличается от карточки.
	 * Совпадения по полю (`matchingRules`/`matchingLabor`) недостаточно: bulk dryRun
	 * идёт по всем полям схемы и иначе помечает как «затронутые» все работы с любой
	 * привязкой — на нетронутой схеме это даёт ложное предложение синхронизации.
	 */
	const changed =
		formulaReconciled.invalidated ||
		formulaSanitized.invalidated ||
		JSON.stringify(rules) !== JSON.stringify(card.rules) ||
		JSON.stringify(laborParams) !== JSON.stringify(card.laborParams) ||
		JSON.stringify(formulaTokens) !== JSON.stringify(card.formula.tokens);

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
