import type {
	V2TypicalWorkFormulaDto,
	V2TypicalWorkFormulaBadgeDto,
	V2WorkFormulaToken,
} from "./v2-typical-work.types";
import type {
	V2TypicalWorkFormulaTermsDto,
	V2WorkFormulaFactorDto,
	V2WorkFormulaTermDto,
} from "./v2-typical-work-v4.types";
import { isTransitiveOnlyFormula, isParamToken, parseWorkFormulaText, tokensToText } from "./v2-work-formula.util";

export function createTermId(prefix = "term"): string {
	return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultBaseNormTerm(): V2WorkFormulaTermDto {
	return {
		id: createTermId("base"),
		kind: "base_norm",
		title: "Базовый норматив работы",
		order: 0,
		factors: [],
	};
}

export function defaultTermsFormula(): V2TypicalWorkFormulaTermsDto {
	const terms = [defaultBaseNormTerm()];
	return {
		version: 2,
		terms,
		text: formatTermsSummary(terms),
	};
}

export function isTermsFormulaPayload(
	formula: unknown,
): formula is V2TypicalWorkFormulaTermsDto {
	return (
		typeof formula === "object" &&
		formula !== null &&
		(formula as V2TypicalWorkFormulaTermsDto).version === 2 &&
		Array.isArray((formula as V2TypicalWorkFormulaTermsDto).terms)
	);
}

function factorFromParamToken(
	token: Extract<V2WorkFormulaToken, { kind: "param_coeff" | "param_anyof" }>,
	order: number,
): V2WorkFormulaFactorDto {
	return {
		id: createTermId("factor"),
		paramCode: token.paramCode,
		paramName: token.paramName ?? null,
		order,
	};
}

function splitTokensByAdditiveOps(tokens: V2WorkFormulaToken[]): V2WorkFormulaToken[][] {
	const segments: V2WorkFormulaToken[][] = [];
	let current: V2WorkFormulaToken[] = [];
	let depth = 0;

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i]!;
		if (token.kind === "paren_open") {
			depth++;
			current.push(token);
			continue;
		}
		if (token.kind === "paren_close") {
			depth--;
			current.push(token);
			continue;
		}
		if (depth === 0 && token.kind === "operator" && token.op === "+") {
			const rest = tokens.slice(i + 1);
			if (
				current.length === 1 &&
				current[0]?.kind === "norm" &&
				rest[0]?.kind === "number" &&
				rest.some((t) => t.kind === "operator" && t.op === "*")
			) {
				current.push(token);
				continue;
			}
			segments.push(current);
			current = [];
			continue;
		}
		current.push(token);
	}
	segments.push(current);
	return segments.filter((segment) => segment.length > 0);
}

/** Снимает одну внешнюю пару скобок, если формула целиком в (…). */
function unwrapParenthesizedFormulaTokens(
	tokens: V2WorkFormulaToken[],
): V2WorkFormulaToken[] {
	if (tokens[0]?.kind !== "paren_open") return tokens;
	let depth = 0;
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (token?.kind === "paren_open") depth++;
		else if (token?.kind === "paren_close") {
			depth--;
			if (depth === 0) {
				const tail = tokens.slice(i + 1);
				if (tail.length === 0) {
					return tokens.slice(1, i);
				}
				return [...tokens.slice(1, i), ...tail];
			}
		}
	}
	return tokens;
}

function normalizeMultSegmentTokens(
	segment: V2WorkFormulaToken[],
): V2WorkFormulaToken[] {
	let normalized = unwrapParenthesizedFormulaTokens(segment);
	while (normalized[0]?.kind === "paren_open") {
		const next = unwrapParenthesizedFormulaTokens(normalized);
		if (next.length === normalized.length) break;
		normalized = next;
	}
	return normalized;
}

function appendMultChainTerms(
	segment: V2WorkFormulaToken[],
	startIndex: number,
	startOrder: number,
	terms: V2WorkFormulaTermDto[],
): number {
	let order = startOrder;
	let i = startIndex;

	while (i < segment.length) {
		const direct = segment[i];
		if (isParamToken(direct)) {
			terms.push({
				id: createTermId("mult"),
				kind: "multiplier",
				title: direct.paramName ?? direct.paramCode,
				order: order++,
				baseValue: 1,
				factors: [factorFromParamToken(direct, 0)],
			});
			i += 1;
			continue;
		}

		const op = segment[i];
		if (op?.kind !== "operator" || (op.op !== "*" && op.op !== "/")) break;
		const operand = segment[i + 1];
		if (!operand) break;

		if (operand.kind === "number") {
			terms.push({
				id: createTermId("mult"),
				kind: "multiplier",
				title: `× ${operand.value}`,
				order: order++,
				baseValue: operand.value,
				factors: [],
			});
			i += 2;
			continue;
		}

		if (isParamToken(operand)) {
			terms.push({
				id: createTermId("mult"),
				kind: "multiplier",
				title: operand.paramName ?? operand.paramCode,
				order: order++,
				baseValue: 1,
				factors: [factorFromParamToken(operand, 0)],
			});
			i += 2;
			continue;
		}

		break;
	}

	return order;
}

function parseMultSegment(
	segment: V2WorkFormulaToken[],
	startOrder: number,
): { terms: V2WorkFormulaTermDto[]; nextOrder: number } {
	const normalized = normalizeMultSegmentTokens(segment);
	const terms: V2WorkFormulaTermDto[] = [];
	let order = startOrder;

	if (
		normalized[0]?.kind === "norm" &&
		normalized[1]?.kind === "operator" &&
		normalized[1].op === "+" &&
		normalized[2]?.kind === "number"
	) {
		const baseTerm = defaultBaseNormTerm();
		baseTerm.order = order++;
		terms.push(baseTerm);
		terms.push({
			id: createTermId("add"),
			kind: "additive",
			title: `+ ${normalized[2].value}`,
			order: order++,
			baseValue: normalized[2].value,
			factors: [],
		});
		const nextOrder = appendMultChainTerms(normalized, 3, order, terms);
		return { terms, nextOrder };
	}

	if (normalized[0]?.kind !== "norm") {
		return { terms: [defaultBaseNormTerm()], nextOrder: startOrder + 1 };
	}

	const baseTerm = defaultBaseNormTerm();
	baseTerm.order = order++;
	terms.push(baseTerm);

	const nextOrder = appendMultChainTerms(normalized, 1, order, terms);
	return { terms, nextOrder };
}

function parseAddSegment(
	segment: V2WorkFormulaToken[],
	order: number,
): V2WorkFormulaTermDto {
	let i = 0;
	let baseValue = 1;
	const factors: V2WorkFormulaFactorDto[] = [];
	let title = "Слагаемое";

	if (segment[0]?.kind === "number") {
		baseValue = segment[0].value;
		title = `+ ${baseValue}`;
		i = 1;
	} else if (isParamToken(segment[0])) {
		factors.push(factorFromParamToken(segment[0], 0));
		title = segment[0].paramName ?? segment[0].paramCode;
		i = 1;
	}

	while (i < segment.length) {
		const op = segment[i];
		if (op?.kind !== "operator" || op.op !== "*") break;
		const operand = segment[i + 1];
		if (!operand) break;

		if (operand.kind === "number") {
			baseValue *= operand.value;
			title = `+ ${baseValue}`;
			i += 2;
			continue;
		}
		if (isParamToken(operand)) {
			factors.push(factorFromParamToken(operand, factors.length));
			i += 2;
			continue;
		}
		break;
	}

	return {
		id: createTermId("add"),
		kind: "additive",
		title,
		order,
		baseValue,
		factors,
	};
}

export function tokensToTermsFormula(
	formula: V2TypicalWorkFormulaDto,
): V2TypicalWorkFormulaTermsDto {
	if (isTransitiveOnlyFormula(formula.tokens)) {
		const ref = formula.tokens[0];
		if (ref?.kind === "work_ref") {
			const terms: V2WorkFormulaTermDto[] = [
				{
					id: createTermId("trans"),
					kind: "transitive",
					title: "Транзитивная ссылка",
					order: 0,
					factors: [],
					sourceAssignmentId: ref.assignmentId,
					sourceWorkName: ref.workName ?? null,
					sourceWorkId: null,
				},
			];
			return {
				version: 2,
				terms,
				text: formula.text || formatTermsSummary(terms),
			};
		}
	}

	const normalizedTokens = unwrapParenthesizedFormulaTokens(formula.tokens);
	const segments = splitTokensByAdditiveOps(normalizedTokens);
	if (segments.length === 0) {
		return defaultTermsFormula();
	}

	const multParsed = parseMultSegment(segments[0] ?? [], 0);
	const terms = [...multParsed.terms];
	let order = multParsed.nextOrder;

	for (let segIdx = 1; segIdx < segments.length; segIdx++) {
		terms.push(parseAddSegment(segments[segIdx] ?? [], order++));
	}

	return {
		version: 2,
		terms,
		text: formula.text || formatTermsSummary(terms),
	};
}

export function normalizeStoredFormula(
	raw: unknown,
	fallbackText?: string | null,
): V2TypicalWorkFormulaTermsDto {
	if (isTermsFormulaPayload(raw)) {
		return {
			version: 2,
			terms: sortTerms(raw.terms),
			text: raw.text || formatTermsSummary(raw.terms),
		};
	}

	if (Array.isArray(raw)) {
		return tokensToTermsFormula({
			tokens: raw as V2WorkFormulaToken[],
			text: fallbackText ?? "H",
		});
	}

	return defaultTermsFormula();
}

/** Token-формула version_config: приоритет formulaText (скобки, группировка). */
export function resolveVersionConfigTokenFormula(
	formula: unknown,
	formulaText?: string | null,
): V2TypicalWorkFormulaDto {
	const trimmed = formulaText?.trim();
	if (trimmed) {
		const parsed = parseWorkFormulaText(trimmed);
		if (!parsed.error && parsed.tokens.length > 0) {
			return { tokens: parsed.tokens, text: trimmed };
		}
	}
	if (Array.isArray(formula) && formula.length > 0) {
		const tokens = formula as V2WorkFormulaToken[];
		if (tokens.every((t) => t && typeof t === "object" && "kind" in t)) {
			return { tokens, text: tokensToText(tokens) };
		}
	}
	return termsToTokenFormula(normalizeStoredFormula(formula, formulaText));
}

function sortTerms(terms: V2WorkFormulaTermDto[]): V2WorkFormulaTermDto[] {
	return [...terms].sort((a, b) => a.order - b.order);
}

export function formatTermsSummary(terms: V2WorkFormulaTermDto[]): string {
	const sorted = sortTerms(terms);
	if (sorted.length === 0) return "H";

	const parts: string[] = [];
	for (const term of sorted) {
		if (term.kind === "base_norm") {
			parts.push("H");
			continue;
		}
		if (term.kind === "transitive") {
			return term.sourceWorkName
				? `→ ${term.sourceWorkName}`
				: "→ (транзитивная ссылка)";
		}
		const factorLabels = term.factors.map(
			(f) => f.paramName ?? f.paramCode,
		);
		const base = term.baseValue ?? 1;
		if (term.factors.length === 0) {
			parts.push(term.kind === "additive" ? `+ ${base}` : `× ${base}`);
		} else {
			const factorPart = factorLabels.map((f) => `P[${f}]`).join(" × ");
			parts.push(
				term.kind === "additive"
					? `+ ${base} × ${factorPart}`
					: `× ${base} × ${factorPart}`,
			);
		}
	}

	const hasTransitive = sorted.some((t) => t.kind === "transitive");
	if (hasTransitive) return parts.join(" ");

	const mult = parts.filter((p) => p.startsWith("×") || p === "H");
	const add = parts.filter((p) => p.startsWith("+"));
	if (mult.length === 0 && add.length === 0) return "H";
	if (add.length === 0) return mult.join(" ");
	return `${mult.join(" ")} ${add.join(" ")}`.trim();
}

function formatFormulaNumber(value: number): string {
	if (!Number.isFinite(value)) return "—";
	const rounded = Math.round(value * 10000) / 10000;
	if (Number.isInteger(rounded)) return String(rounded);
	return String(rounded)
		.replace(/(\.\d*?)0+$/, "$1")
		.replace(/\.$/, "");
}

/** Показывать развёрнутую формулу коэффициента (с подставленными значениями). */
export function shouldShowTypicalWorkCoefficientBreakdown(
	terms: V2WorkFormulaTermDto[],
): boolean {
	const sorted = sortTerms(terms);
	if (sorted.some((t) => t.kind === "transitive")) return true;
	const base = sorted.find((t) => t.kind === "base_norm");
	const extra = sorted.filter((t) => t.kind !== "base_norm");
	if (extra.some((t) => t.kind === "additive")) return true;
	const paramFactorCount =
		(base?.factors.length ?? 0) +
		extra.reduce((acc, term) => acc + term.factors.length, 0);
	if (paramFactorCount > 0) return true;
	if (extra.filter((t) => t.kind === "multiplier").length > 1) return true;
	const singleMult = extra.find((t) => t.kind === "multiplier");
	if (singleMult && (singleMult.baseValue ?? 1) !== 1) return true;
	return false;
}

/** Человекочитаемое представление коэффициента: число или формула с конкретными значениями. */
export function formatTypicalWorkCoefficientDisplay(params: {
	terms: V2WorkFormulaTermDto[];
	baseNorm: number;
	paramCoefficients: Record<string, number>;
	coefficient: number;
}): string {
	const sorted = sortTerms(params.terms);
	if (!shouldShowTypicalWorkCoefficientBreakdown(sorted)) {
		return formatFormulaNumber(params.coefficient);
	}

	const transitive = sorted.find((t) => t.kind === "transitive");
	if (transitive) {
		return transitive.sourceWorkName
			? `→ ${transitive.sourceWorkName}`
			: "→ (транзитивная ссылка)";
	}

	const resolveFactor = (paramCode: string): number =>
		params.paramCoefficients[paramCode] ?? 1;

	const multTerms = sorted.filter((t) => t.kind === "multiplier");
	const firstMultOrder =
		multTerms.length > 0
			? Math.min(...multTerms.map((term) => term.order))
			: Number.POSITIVE_INFINITY;

	const joinNumericFactors = (values: number[]): string => {
		const parts = values
			.map((value) => formatFormulaNumber(value))
			.filter((value) => value !== "1");
		return parts.join(" × ");
	};

	const parts: string[] = [];
	let effectiveBase = formatFormulaNumber(params.baseNorm);
	for (const term of sorted) {
		if (term.kind === "base_norm") {
			const factors = term.factors.map((f) => resolveFactor(f.paramCode));
			const tail = joinNumericFactors(factors);
			if (multTerms.length > 0) {
				for (const addTerm of sorted) {
					if (addTerm.kind !== "additive" || addTerm.order >= firstMultOrder) {
						continue;
					}
					const addValue = formatFormulaNumber(
						(addTerm.baseValue ?? 1) *
							addTerm.factors.reduce(
								(acc, f) => acc * resolveFactor(f.paramCode),
								1,
							),
					);
					effectiveBase = `(${effectiveBase} + ${addValue})`;
				}
			}
			parts.push(tail ? `${effectiveBase} × ${tail}` : effectiveBase);
			continue;
		}
		if (term.kind === "multiplier") {
			const values = [
				term.baseValue ?? 1,
				...term.factors.map((f) => resolveFactor(f.paramCode)),
			];
			const chunk = joinNumericFactors(values);
			if (chunk) parts.push(`× ${chunk}`);
		}
		if (term.kind === "additive") {
			if (multTerms.length > 0 && term.order < firstMultOrder) continue;
			const values = [
				term.baseValue ?? 1,
				...term.factors.map((f) => resolveFactor(f.paramCode)),
			];
			const chunk = joinNumericFactors(values);
			if (chunk) parts.push(`+ ${chunk}`);
		}
	}

	const mult = parts.filter((p) => !p.startsWith("+"));
	const add = parts.filter((p) => p.startsWith("+"));
	if (add.length === 0) return mult.join(" ");
	return `${mult.join(" ")} ${add.join(" ")}`.trim();
}

export function validateTermsFormula(
	terms: V2WorkFormulaTermDto[],
): string | null {
	const sorted = sortTerms(terms);
	const transitive = sorted.filter((t) => t.kind === "transitive");

	if (transitive.length === 1 && sorted.length === 1) {
		const term = transitive[0];
		if (!term?.sourceAssignmentId && !term?.sourceWorkId) {
			return "Укажите работу-источник для транзитивной ссылки";
		}
		return null;
	}

	const baseCount = sorted.filter((t) => t.kind === "base_norm").length;
	if (baseCount !== 1) {
		return "В формуле должен быть ровно один член «Базовый норматив работы»";
	}
	const others = sorted.filter(
		(t) => t.kind !== "transitive" && t.kind !== "base_norm",
	);
	if (transitive.length > 0 && others.length > 0) {
		return "Транзитивная ссылка не сочетается с другими членами формулы";
	}
	if (transitive.length > 1) {
		return "Допускается только одна транзитивная ссылка";
	}
	for (const term of transitive) {
		if (!term.sourceAssignmentId && !term.sourceWorkId) {
			return "Укажите работу-источник для транзитивной ссылки";
		}
	}

	for (const term of sorted) {
		if (term.kind === "multiplier" || term.kind === "additive") {
			if (!term.title?.trim()) {
				return "Заполните название члена формулы";
			}
			if (term.baseValue != null && term.baseValue < 0) {
				return "Базовое значение члена должно быть неотрицательным";
			}
			const seen = new Set<string>();
			for (const factor of term.factors) {
				if (seen.has(factor.paramCode)) {
					return "Параметр уже используется как фактор этого члена";
				}
				seen.add(factor.paramCode);
			}
		}
	}

	return null;
}

export function detectTransitiveCycle(
	assignmentId: string,
	targetAssignmentId: string,
	edges: ReadonlyMap<string, string | null | undefined>,
): string[] | null {
	if (!targetAssignmentId) return null;
	if (assignmentId === targetAssignmentId) {
		return [assignmentId];
	}

	const visited = new Set<string>();
	let current: string | null | undefined = targetAssignmentId;
	const path: string[] = [];

	while (current) {
		if (current === assignmentId) {
			return [...path, assignmentId];
		}
		if (visited.has(current)) break;
		visited.add(current);
		path.push(current);
		current = edges.get(current);
	}

	return null;
}

export function computeFormulaBadge(
	terms: V2WorkFormulaTermDto[],
): V2TypicalWorkFormulaBadgeDto {
	const extra = terms.filter((t) => t.kind !== "base_norm");
	if (extra.length === 0) return "none";
	if (extra.some((t) => t.kind === "transitive")) return "transitive";
	const hasMult = extra.some((t) => t.kind === "multiplier");
	const hasAdd = extra.some((t) => t.kind === "additive");
	if (hasMult && hasAdd) return "mixed";
	if (hasAdd) return "additive";
	return "multiplier";
}

export function evaluateTermsFormula(params: {
	terms: V2WorkFormulaTermDto[];
	baseNorm: number;
	resolveFactorCoeff: (paramCode: string) => number;
	resolveTransitive?: (sourceAssignmentId: string) => number | null;
}): number | null {
	const error = validateTermsFormula(params.terms);
	if (error) return null;

	const sorted = sortTerms(params.terms);
	const transitive = sorted.find((t) => t.kind === "transitive");
	if (transitive?.sourceAssignmentId && params.resolveTransitive) {
		return params.resolveTransitive(transitive.sourceAssignmentId);
	}

	const multTerms = sorted.filter((t) => t.kind === "multiplier");
	const firstMultOrder =
		multTerms.length > 0
			? Math.min(...multTerms.map((term) => term.order))
			: Number.POSITIVE_INFINITY;

	let effectiveBase = params.baseNorm;
	if (multTerms.length > 0) {
		for (const term of sorted) {
			if (term.kind !== "additive" || term.order >= firstMultOrder) continue;
			const base = term.baseValue ?? 1;
			const coeff = term.factors.reduce(
				(acc, f) => acc * params.resolveFactorCoeff(f.paramCode),
				1,
			);
			effectiveBase += base * coeff;
		}
	}

	let product = 1;
	let sum = 0;
	let hasMult = false;

	for (const term of sorted) {
		if (term.kind === "base_norm") {
			const coeff = term.factors.reduce(
				(acc, f) => acc * params.resolveFactorCoeff(f.paramCode),
				1,
			);
			product *= effectiveBase * coeff;
			hasMult = true;
			continue;
		}
		if (term.kind === "multiplier") {
			const base = term.baseValue ?? 1;
			const coeff = term.factors.reduce(
				(acc, f) => acc * params.resolveFactorCoeff(f.paramCode),
				1,
			);
			product *= base * coeff;
			hasMult = true;
		}
		if (term.kind === "additive") {
			if (multTerms.length > 0 && term.order < firstMultOrder) continue;
			const base = term.baseValue ?? 1;
			const coeff = term.factors.reduce(
				(acc, f) => acc * params.resolveFactorCoeff(f.paramCode),
				1,
			);
			sum += base * coeff;
		}
	}

	if (!hasMult) return null;
	return product + sum;
}

/** Конвертация terms → token-формула для JsonLogic. */
export function termsToTokenFormula(
	termsDto: V2TypicalWorkFormulaTermsDto,
): V2TypicalWorkFormulaDto {
	const sorted = sortTerms(termsDto.terms);
	const transitive = sorted.find((t) => t.kind === "transitive");
	if (transitive?.sourceAssignmentId) {
		return {
			tokens: [
				{
					kind: "work_ref",
					assignmentId: transitive.sourceAssignmentId,
					workName: transitive.sourceWorkName ?? undefined,
				},
			],
			text: termsDto.text || formatTermsSummary(sorted),
		};
	}

	const tokens: V2WorkFormulaToken[] = [{ kind: "norm" }];
	const multParts: V2WorkFormulaTermDto[] = [];
	const addParts: V2WorkFormulaTermDto[] = [];

	for (const term of sorted) {
		if (term.kind === "multiplier" || term.kind === "base_norm") {
			multParts.push(term);
		} else if (term.kind === "additive") {
			addParts.push(term);
		}
	}

	const appendTermFactors = (term: V2WorkFormulaTermDto, prefixOp?: "+" | "*") => {
		if (prefixOp && tokens.length > 0) {
			tokens.push({ kind: "operator", op: prefixOp });
		}
		const base = term.baseValue ?? 1;
		const hasFactors = term.factors.length > 0;

		if (term.kind === "additive" && !hasFactors) {
			tokens.push({ kind: "number", value: base });
			return;
		}

		if (term.kind !== "base_norm" && base !== 1) {
			if (tokens.length > 1 && term.kind === "multiplier") {
				tokens.push({ kind: "operator", op: "*" });
			}
			tokens.push({ kind: "number", value: base });
		}
		for (const [index, factor] of term.factors.entries()) {
			if (index > 0 || (term.kind !== "base_norm" && base !== 1)) {
				tokens.push({ kind: "operator", op: "*" });
			} else if (tokens.length > 1 && term.kind === "base_norm") {
				tokens.push({ kind: "operator", op: "*" });
			}
			tokens.push({
				kind: "param_coeff",
				paramCode: factor.paramCode,
				paramName: factor.paramName ?? undefined,
			});
		}
	};

	for (const term of multParts) {
		if (term.kind === "base_norm") {
			appendTermFactors(term);
			continue;
		}
		appendTermFactors(term, tokens.length > 1 ? "*" : undefined);
	}

	for (const [index, term] of addParts.entries()) {
		appendTermFactors(term, index === 0 && tokens.length === 1 ? "+" : "+");
	}

	return {
		tokens: tokens.length ? tokens : [{ kind: "norm" }],
		text: termsDto.text || formatTermsSummary(sorted),
	};
}

/** Синхронизация formulaTerms из token-формулы (для автосохранения). */
export function syncTermsFromTokenFormula(
	formula: V2TypicalWorkFormulaDto,
): V2TypicalWorkFormulaTermsDto {
	if (isTransitiveOnlyFormula(formula.tokens)) {
		const ref = formula.tokens[0];
		if (ref?.kind === "work_ref") {
			const terms: V2WorkFormulaTermDto[] = [
				{
					id: createTermId("trans"),
					kind: "transitive",
					title: "Транзитивная ссылка",
					order: 0,
					factors: [],
					sourceAssignmentId: ref.assignmentId,
					sourceWorkName: ref.workName ?? null,
					sourceWorkId: null,
				},
			];
			return {
				version: 2,
				terms,
				text: formula.text || formatTermsSummary(terms),
			};
		}
	}

	return tokensToTermsFormula(formula);
}

export function computeFormulaBadgeFromTokens(
	tokens: V2WorkFormulaToken[],
): V2TypicalWorkFormulaBadgeDto {
	if (isTransitiveOnlyFormula(tokens)) return "transitive";
	return computeFormulaBadge(syncTermsFromTokenFormula({ tokens, text: "" }).terms);
}

export function buildTransitiveEdges(
	assignments: Array<{ id: string; terms?: V2WorkFormulaTermDto[] }>,
): Map<string, string | null | undefined> {
	const edges = new Map<string, string | null | undefined>();
	for (const assignment of assignments) {
		const transitive = assignment.terms?.find((t) => t.kind === "transitive");
		edges.set(assignment.id, transitive?.sourceAssignmentId ?? null);
	}
	return edges;
}
