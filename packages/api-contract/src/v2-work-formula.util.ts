import type {
	V2TypicalWorkFormulaDto,
	V2TypicalWorkRoundingDto,
	V2WorkFormulaToken,
	V2WorkRoundingMode,
} from "./v2-typical-work.types";
import { slugParamCode } from "./v2-param-slug.util";
import {
	parseParamNameSourceKeys,
	stripParamNameSourceKeys,
} from "./v2-work-param-source-keys.util";
import {
	formatArchCountCoeffSteps,
	formatWorkArchCountKindLabel,
	parseArchCountCoeffSteps,
	parseWorkArchCountKindLabel,
	resolveArchCountCoeffFromToken,
	validateArchCountCoeffSteps,
} from "./v2-work-arch-count-coeff.util";

export type WorkFormulaEvalContext = {
	norm: number;
	paramCoefficients: Record<string, number>;
	/** Полный formData анкеты — для arch_count_coeff. */
	formData?: Record<string, unknown>;
};

export type WorkFormulaEvalResult = {
	symbolic: string;
	expanded: string;
	value: number | null;
	error: string | null;
};

const OP_SYMBOL: Record<string, string> = {
	"+": "+",
	"-": "−",
	"*": "×",
	"/": "÷",
};

export function isTransitiveOnlyFormula(tokens: V2WorkFormulaToken[]): boolean {
	return tokens.length === 1 && tokens[0]?.kind === "work_ref";
}

export function hasWorkRefToken(tokens: V2WorkFormulaToken[]): boolean {
	return tokens.some((token) => token.kind === "work_ref");
}

export function isParamToken(
	token: V2WorkFormulaToken,
): token is Extract<
	V2WorkFormulaToken,
	{ kind: "param_coeff" | "param_anyof" }
> {
	return token.kind === "param_coeff" || token.kind === "param_anyof";
}

export type WorkFormulaLaborParamRef = {
	paramCode: string;
	paramName?: string | null;
};

function collectParamRefKeys(ref: WorkFormulaLaborParamRef): Set<string> {
	const keys = new Set<string>();
	const code = ref.paramCode.trim();
	if (code) keys.add(code);
	const { displayName, sourceKeys } = parseParamNameSourceKeys(ref.paramName);
	for (const key of sourceKeys) {
		if (key.trim()) keys.add(key.trim());
	}
	for (const label of [
		displayName,
		stripParamNameSourceKeys(ref.paramName ?? ""),
	]) {
		const slug = slugParamCode(label.trim());
		if (slug) keys.add(slug);
	}
	return keys;
}

/** Сопоставление токена формулы с параметром из блока трудоёмкости (код, подпись, sourceKeys). */
export function workFormulaLaborParamMatches(
	token: { paramCode: string; paramName?: string | null },
	group: WorkFormulaLaborParamRef,
): boolean {
	if (group.paramCode === token.paramCode) return true;
	if (token.paramName != null && group.paramName === token.paramName) return true;
	if (token.paramName != null && group.paramCode === token.paramName) return true;
	if (group.paramName != null && group.paramName === token.paramCode) return true;

	const tokenDisplay = stripParamNameSourceKeys(token.paramName ?? "")
		.trim()
		.toLowerCase();
	const groupDisplay = stripParamNameSourceKeys(group.paramName ?? "")
		.trim()
		.toLowerCase();
	if (tokenDisplay && groupDisplay && tokenDisplay === groupDisplay) {
		return true;
	}

	const tokenKeys = collectParamRefKeys({
		paramCode: token.paramCode,
		paramName: token.paramName,
	});
	const groupKeys = collectParamRefKeys(group);
	for (const key of tokenKeys) {
		if (groupKeys.has(key)) return true;
	}
	return false;
}

export function isWorkFormulaLaborParamKnown(
	token: Extract<V2WorkFormulaToken, { kind: "param_coeff" | "param_anyof" }>,
	laborParams: readonly WorkFormulaLaborParamRef[],
): boolean {
	return laborParams.some((group) => workFormulaLaborParamMatches(token, group));
}

export function normalizeWorkFormulaLaborParamTokens(
	tokens: V2WorkFormulaToken[],
	laborParams: readonly WorkFormulaLaborParamRef[],
): V2WorkFormulaToken[] {
	return tokens.map((token) => {
		if (token.kind !== "param_coeff" && token.kind !== "param_anyof") {
			return token;
		}
		const group = laborParams.find((g) => workFormulaLaborParamMatches(token, g));
		if (!group) return token;
		return {
			kind: token.kind,
			paramCode: group.paramCode,
			paramName: group.paramName ?? group.paramCode,
		};
	});
}

/** Сопоставляет param-токены формулы с блоком трудоёмкости и снимает invalid при совпадении. */
export function reconcileFormulaLaborParamTokens(
	tokens: V2WorkFormulaToken[],
	laborParams: readonly WorkFormulaLaborParamRef[],
): V2WorkFormulaToken[] {
	const normalized = normalizeWorkFormulaLaborParamTokens(tokens, laborParams);
	return normalized.map((token) => {
		if (!isParamToken(token)) return token;
		if (!isWorkFormulaLaborParamKnown(token, laborParams)) return token;
		if (!token.invalid) return token;
		const { invalid: _invalid, ...rest } = token;
		return rest;
	});
}

function formatWorkFormulaParamRef(
	paramCode: string,
	paramName?: string | null,
): string {
	const code = paramCode.trim();
	const name = paramName?.trim();
	if (name && /[()"']/.test(name)) {
		return `"${name.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
	}
	return code || name || "";
}

export function tokensToText(tokens: V2WorkFormulaToken[]): string {
	return tokens
		.map((token) => {
			switch (token.kind) {
				case "norm":
					return "N";
				case "param_coeff":
					return token.invalid
						? `коэф(${formatWorkFormulaParamRef(token.paramCode, token.paramName)})?`
						: `коэф(${formatWorkFormulaParamRef(token.paramCode, token.paramName)})`;
				case "param_anyof":
					return token.invalid
						? `anyof(${formatWorkFormulaParamRef(token.paramCode, token.paramName)})?`
						: `anyof(${formatWorkFormulaParamRef(token.paramCode, token.paramName)})`;
				case "work_ref":
					return token.invalid
						? `работа(${token.assignmentId})?`
						: `работа(${token.assignmentId})`;
				case "arch_count_coeff":
					return `архкоэф(${formatWorkArchCountKindLabel(token.archComponentKind)}; ${formatArchCountCoeffSteps(token.steps)})`;
				case "number":
					return String(token.value);
				case "operator":
					return OP_SYMBOL[token.op] ?? token.op;
				case "paren_open":
					return "(";
				case "paren_close":
					return ")";
				default:
					return "";
			}
		})
		.join(" ")
		.replace(/\(\s+/g, "(")
		.replace(/\s+\)/g, ")")
		.replace(/\s+/g, " ")
		.trim();
}

const GENERAL_OP_SYMBOL: Record<string, string> = {
	"+": "+",
	"-": "−",
	"*": "*",
	"/": "/",
};

/** Краткая запись для блока «Общая формула норматива» (N, Кэф-П1, …). */
export function formatWorkFormulaGeneralSummary(
	tokens: V2WorkFormulaToken[],
	paramOrder: readonly string[],
): string {
	const indexByCode = new Map(
		paramOrder.map((code, index) => [code, index + 1]),
	);
	return tokens
		.map((token) => {
			switch (token.kind) {
				case "norm":
					return "N";
				case "param_coeff":
				case "param_anyof": {
					const idx = indexByCode.get(token.paramCode);
					const prefix = token.kind === "param_anyof" ? "Any-П" : "Кэф-П";
					if (idx != null) return `${prefix}${idx}`;
					return `${prefix}[${token.paramName ?? token.paramCode}]`;
				}
				case "work_ref":
					return token.workName ? `→${token.workName}` : "→работа";
				case "arch_count_coeff":
					return `Кол-${formatWorkArchCountKindLabel(token.archComponentKind)}`;
				case "number":
					return String(token.value);
				case "operator":
					return GENERAL_OP_SYMBOL[token.op] ?? token.op;
				case "paren_open":
					return "(";
				case "paren_close":
					return ")";
				default:
					return "";
			}
		})
		.join(" ")
		.replace(/\(\s+/g, "(")
		.replace(/\s+\)/g, ")")
		.replace(/\s+/g, " ")
		.trim();
}

export function parseWorkFormulaText(text: string): {
	tokens: V2WorkFormulaToken[];
	error: string | null;
} {
	const input = text.trim();
	if (!input) {
		return { tokens: [{ kind: "norm" }], error: null };
	}

	const tokens: V2WorkFormulaToken[] = [];
	let i = 0;

	const skipWs = () => {
		while (i < input.length && /\s/.test(input[i] ?? "")) i++;
	};

	const readNumber = (): V2WorkFormulaToken | null => {
		const start = i;
		if (input[i] === ",") i++;
		while (i < input.length && /[\d.,]/.test(input[i] ?? "")) i++;
		const raw = input.slice(start, i).replace(",", ".");
		if (!raw || raw === ".") return null;
		const value = Number(raw);
		if (!Number.isFinite(value)) return null;
		if (value < 0) return null;
		return { kind: "number", value };
	};

	const readFormulaParamRef = (
		refStart: number,
	): { value: string; nextIndex: number } | null => {
		let pos = refStart;
		const quote = input[pos];
		if (quote === '"' || quote === "'") {
			pos++;
			let value = "";
			while (pos < input.length) {
				const ch = input[pos] ?? "";
				if (ch === "\\" && pos + 1 < input.length) {
					value += input[pos + 1] ?? "";
					pos += 2;
					continue;
				}
				if (ch === quote) {
					pos++;
					return { value, nextIndex: pos };
				}
				value += ch;
				pos++;
			}
			return null;
		}

		const valueStart = pos;
		let depth = 0;
		while (pos < input.length) {
			const ch = input[pos] ?? "";
			if (ch === "(") depth++;
			else if (ch === ")") {
				if (depth === 0) break;
				depth--;
			}
			pos++;
		}
		const value = input.slice(valueStart, pos).trim();
		if (!value) return null;
		return { value, nextIndex: pos };
	};

	const readFunctionCall = (
		fnName: string,
	): {
		kind: "param_coeff" | "param_anyof" | "work_ref";
		id: string;
	} | null => {
		const start = i;
		const nameLen = fnName.length;
		if (input.slice(i, i + nameLen).toLowerCase() !== fnName.toLowerCase())
			return null;
		i += nameLen;
		skipWs();
		if (input[i] !== "(") {
			i = start;
			return null;
		}
		i++;
		skipWs();
		const ref = readFormulaParamRef(i);
		if (!ref) {
			i = start;
			return null;
		}
		const id = ref.value;
		i = ref.nextIndex;
		skipWs();
		if (input[i] !== ")") {
			i = start;
			return null;
		}
		i++;
		if (!id) {
			i = start;
			return null;
		}
		if (fnName.toLowerCase() === "anyof") {
			return { kind: "param_anyof", id };
		}
		if (fnName.toLowerCase() === "работа") {
			return { kind: "work_ref", id };
		}
		return { kind: "param_coeff", id };
	};

	const readArchCountCoeffCall = (): V2WorkFormulaToken | null => {
		const fnName = "архкоэф";
		const start = i;
		if (input.slice(i, i + fnName.length).toLowerCase() !== fnName) return null;
		i += fnName.length;
		skipWs();
		if (input[i] !== "(") {
			i = start;
			return null;
		}
		i++;
		skipWs();
		const kindStart = i;
		while (i < input.length && input[i] !== ";" && input[i] !== ")") i++;
		const kindLabel = input.slice(kindStart, i).trim();
		const kind = parseWorkArchCountKindLabel(kindLabel);
		if (!kind) {
			i = start;
			return null;
		}
		skipWs();
		if (input[i] !== ";") {
			i = start;
			return null;
		}
		i++;
		skipWs();
		const stepsStart = i;
		let depth = 1;
		while (i < input.length && depth > 0) {
			const ch = input[i] ?? "";
			if (ch === "(") depth += 1;
			else if (ch === ")") depth -= 1;
			if (depth > 0) i += 1;
		}
		const stepsRaw = input.slice(stepsStart, i).trim();
		if (!stepsRaw) {
			i = start;
			return null;
		}
		const steps = parseArchCountCoeffSteps(stepsRaw);
		if (!steps) {
			i = start;
			return null;
		}
		i++;
		return {
			kind: "arch_count_coeff",
			archComponentKind: kind,
			steps,
		};
	};

	while (i < input.length) {
		skipWs();
		if (i >= input.length) break;
		const ch = input[i] ?? "";

		if (
			input.slice(i, i + 8).toLowerCase() === "норма_n" ||
			input.slice(i, i + 7).toLowerCase() === "norma_n"
		) {
			tokens.push({ kind: "norm" });
			i += input.slice(i, i + 8).toLowerCase() === "норма_n" ? 8 : 7;
			continue;
		}

		const normWord = input.slice(i, i + 5).toLowerCase();
		if (
			(normWord === "норма" || normWord === "norma") &&
			!/[A-Za-zА-Яа-я0-9_]/.test(input[i + 5] ?? "")
		) {
			tokens.push({ kind: "norm" });
			i += 5;
			continue;
		}

		const archCountToken = readArchCountCoeffCall();
		if (archCountToken) {
			tokens.push(archCountToken);
			continue;
		}

		const fnCall =
			readFunctionCall("коэф") ??
			readFunctionCall("anyof") ??
			readFunctionCall("работа");
		if (fnCall) {
			skipWs();
			const invalid = input[i] === "?";
			if (invalid) i++;

			if (fnCall.kind === "work_ref") {
				tokens.push({
					kind: "work_ref",
					assignmentId: fnCall.id,
					...(invalid ? { invalid: true } : {}),
				});
			} else {
				tokens.push({
					kind: fnCall.kind,
					paramCode: fnCall.id,
					paramName: fnCall.id,
					...(invalid ? { invalid: true } : {}),
				});
			}
			continue;
		}

		if (ch === "N" || ch === "n" || ch === "H" || ch === "h") {
			if (/[A-Za-zА-Яа-я0-9_]/.test(input[i + 1] ?? "")) {
				return { tokens: [], error: `Неизвестный токен на позиции ${i + 1}` };
			}
			tokens.push({ kind: "norm" });
			i++;
			continue;
		}

		if (ch === "P" && input[i + 1] === "[") {
			const close = input.indexOf("]", i + 2);
			if (close < 0) {
				return {
					tokens: [],
					error: `Незакрытая ссылка P[…] на позиции ${i + 1}`,
				};
			}
			const inner = input.slice(i + 2, close).trim();
			if (!inner) {
				return { tokens: [], error: `Пустая ссылка P[…] на позиции ${i + 1}` };
			}
			tokens.push({
				kind: "param_coeff",
				paramCode: inner,
				paramName: inner,
			});
			i = close + 1;
			continue;
		}

		if (ch === "(") {
			tokens.push({ kind: "paren_open" });
			i++;
			continue;
		}
		if (ch === ")") {
			tokens.push({ kind: "paren_close" });
			i++;
			continue;
		}

		if ("+-×÷*/−".includes(ch)) {
			const op =
				ch === "×"
					? "*"
					: ch === "÷"
						? "/"
						: ch === "−"
							? "-"
							: (ch as "+" | "-" | "*" | "/");
			tokens.push({ kind: "operator", op });
			i++;
			continue;
		}

		if (/[\d,]/.test(ch)) {
			const num = readNumber();
			if (!num) {
				return { tokens: [], error: `Некорректное число на позиции ${i + 1}` };
			}
			tokens.push(num);
			continue;
		}

		return {
			tokens: [],
			error: `Неизвестный символ «${ch}» на позиции ${i + 1}`,
		};
	}

	const validation = validateWorkFormulaTokens(tokens);

	if (validation) {
		return { tokens: [], error: validation };
	}

	return { tokens, error: null };
}

const WORK_FORMULA_OPERATORS_HINT = "+, −, ×, ÷";

function describeWorkFormulaTokenLabel(token: V2WorkFormulaToken): string {
	switch (token.kind) {
		case "norm":
			return "N";
		case "param_coeff":
			return `коэф(${token.paramName ?? token.paramCode})`;
		case "param_anyof":
			return `anyof(${token.paramName ?? token.paramCode})`;
		case "work_ref":
			return token.workName
				? `работа(${token.workName})`
				: `работа(${token.assignmentId})`;
		case "arch_count_coeff":
			return `архкоэф(${formatWorkArchCountKindLabel(token.archComponentKind)})`;
		case "number":
			return String(token.value);
		case "operator":
			return OP_SYMBOL[token.op] ?? token.op;
		case "paren_open":
			return "(";
		case "paren_close":
			return ")";
		default:
			return "?";
	}
}

function formatWorkFormulaTokenPosition(
	tokens: V2WorkFormulaToken[],
	idx: number,
): string {
	const token = tokens[idx];
	if (!token) return `позиция ${idx + 1} из ${tokens.length}`;
	return `токен ${idx + 1} из ${tokens.length} («${describeWorkFormulaTokenLabel(token)}»)`;
}

export type ValidateWorkFormulaTokenOptions = {
	allowedParamCodes?: Set<string>;
	laborParams?: readonly WorkFormulaLaborParamRef[];
	/** Разрешить сохранение формулы с помеченными invalid ссылками на параметры */
	allowInvalidParamRefs?: boolean;
	/** Строгая политика: транзитивная ссылка — единственный элемент */
	strictTransitiveExclusive?: boolean;
};

export function validateWorkFormulaTokens(
	tokens: V2WorkFormulaToken[],
	options?: Set<string> | ValidateWorkFormulaTokenOptions,
): string | null {
	const opts: ValidateWorkFormulaTokenOptions =
		options instanceof Set ? { allowedParamCodes: options } : (options ?? {});
	const {
		allowedParamCodes,
		laborParams,
		allowInvalidParamRefs = false,
		strictTransitiveExclusive = true,
	} = opts;
	if (tokens.length === 0) {
		return "Формула не может быть пустой — добавьте хотя бы один токен";
	}

	const workRefCount = tokens.filter(
		(token) => token.kind === "work_ref",
	).length;
	if (strictTransitiveExclusive && workRefCount > 0) {
		if (tokens.length > 1) {
			return "Ссылка на значение работы должна быть единственным элементом формулы";
		}
		if (workRefCount !== 1) {
			return "Ссылка на значение работы должна быть единственным элементом формулы";
		}
	}

	if (isTransitiveOnlyFormula(tokens)) {
		const ref = tokens[0];
		if (ref?.kind === "work_ref" && ref.invalid) {
			return "Значение недоступно";
		}
		return null;
	}

	let balance = 0;
	let expectOperand = true;

	for (let idx = 0; idx < tokens.length; idx++) {
		const token = tokens[idx];
		if (!token) continue;

		if (token.kind === "paren_open") {
			if (!expectOperand) {
				const prev = tokens[idx - 1];
				return `Между «${prev ? describeWorkFormulaTokenLabel(prev) : "операндом"}» и «(» (${formatWorkFormulaTokenPosition(tokens, idx)}) нужен оператор (${WORK_FORMULA_OPERATORS_HINT})`;
			}
			balance++;
			expectOperand = true;
			continue;
		}
		if (token.kind === "paren_close") {
			if (expectOperand) return "Проверьте скобки в формуле";
			balance--;
			if (balance < 0) return "Проверьте скобки в формуле";
			expectOperand = false;
			continue;
		}

		if (token.kind === "operator") {
			if (expectOperand) {
				return `Лишний оператор «${OP_SYMBOL[token.op] ?? token.op}» (${formatWorkFormulaTokenPosition(tokens, idx)}): перед ним ожидался операнд (N, число, коэф/anyof параметра)`;
			}
			expectOperand = true;
			continue;
		}

		if (!expectOperand) {
			const prev = tokens[idx - 1];
			return `Между «${prev ? describeWorkFormulaTokenLabel(prev) : "операндом"}» и «${describeWorkFormulaTokenLabel(token)}» (${formatWorkFormulaTokenPosition(tokens, idx)}) нужен оператор (${WORK_FORMULA_OPERATORS_HINT}) — два операнда подряд без знака`;
		}

		if (token.kind === "number" && token.value < 0) {
			return "Число должно быть неотрицательным — используйте оператор «−» для вычитания";
		}

		if (isParamToken(token)) {
			if (token.invalid) {
				if (allowInvalidParamRefs) {
					expectOperand = false;
					continue;
				}
				return `Параметр «${token.paramName ?? token.paramCode}» удалён из блока параметров трудоёмкости`;
			}
			const laborAllowed =
				laborParams && laborParams.length > 0
					? isWorkFormulaLaborParamKnown(token, laborParams)
					: allowedParamCodes
						? allowedParamCodes.has(token.paramCode)
						: true;
			if (!laborAllowed) {
				return `Параметр «${token.paramName ?? token.paramCode}» отсутствует в блоке параметров трудоёмкости`;
			}
		}

		if (token.kind === "work_ref" && token.invalid) {
			return "Значение недоступно";
		}

		if (token.kind === "arch_count_coeff") {
			const stepsErr = validateArchCountCoeffSteps(
				token.archComponentKind,
				token.steps,
			);
			if (stepsErr) return stepsErr;
		}

		expectOperand = false;
	}

	if (balance !== 0) return "Проверьте скобки в формуле";
	if (expectOperand && tokens.length > 0) {
		return "Выражение не может заканчиваться оператором";
	}

	// Деление на ноль (константа-делитель = 0)
	for (let idx = 0; idx < tokens.length - 2; idx++) {
		const op = tokens[idx + 1];
		const divisor = tokens[idx + 2];
		if (
			op?.kind === "operator" &&
			op.op === "/" &&
			divisor?.kind === "number" &&
			divisor.value === 0
		) {
			return "Деление на ноль недопустимо";
		}
	}

	return null;
}

export function isParamUsedInFormula(
	tokens: V2WorkFormulaToken[],
	paramCode: string,
): boolean {
	return tokens.some(
		(token) =>
			isParamToken(token) && token.paramCode === paramCode && !token.invalid,
	);
}

export function markFormulaParamInvalid(
	tokens: V2WorkFormulaToken[],
	paramCode: string,
): V2WorkFormulaToken[] {
	return tokens.map((token) =>
		isParamToken(token) && token.paramCode === paramCode
			? { ...token, invalid: true }
			: token,
	);
}

/** Помечает param-токены формулы invalid, если их нет в блоке трудоёмкости. */
export function markUnknownFormulaLaborParamTokensInvalid(
	tokens: V2WorkFormulaToken[],
	laborParams: readonly WorkFormulaLaborParamRef[],
): V2WorkFormulaToken[] {
	return tokens.map((token) => {
		if (!isParamToken(token) || token.invalid) return token;
		if (isWorkFormulaLaborParamKnown(token, laborParams)) return token;
		return { ...token, invalid: true };
	});
}

export function evaluateWorkFormula(
	formula: V2TypicalWorkFormulaDto,
	ctx: WorkFormulaEvalContext,
): WorkFormulaEvalResult {
	const symbolic = formula.text || tokensToText(formula.tokens);
	const validation = validateWorkFormulaTokens(formula.tokens);
	if (validation) {
		return { symbolic, expanded: "", value: null, error: validation };
	}

	const values: number[] = [];
	const labels: string[] = [];
	let expectOperand = true;
	const opStack: Array<{
		prec: number;
		fn: (a: number, b: number) => number;
		sym: string;
	}> = [];

	const applyTop = (): string | null => {
		const op = opStack.pop();
		const b = values.pop();
		const a = values.pop();
		const lb = labels.pop();
		const la = labels.pop();
		if (!op || a == null || b == null || la == null || lb == null) {
			return "Некорректное выражение";
		}
		const result = op.fn(a, b);
		if (!Number.isFinite(result))
			return "Деление на ноль или некорректный результат";
		values.push(result);
		labels.push(`(${la} ${op.sym} ${lb})`);
		return null;
	};

	const prec = (op: string) => (op === "+" || op === "-" ? 1 : 2);

	for (const token of formula.tokens) {
		if (token.kind === "norm") {
			if (!expectOperand)
				return {
					symbolic,
					expanded: "",
					value: null,
					error: "Ожидался оператор",
				};
			values.push(ctx.norm);
			labels.push(String(ctx.norm));
			expectOperand = false;
			continue;
		}
		if (token.kind === "number") {
			if (!expectOperand)
				return {
					symbolic,
					expanded: "",
					value: null,
					error: "Ожидался оператор",
				};
			values.push(token.value);
			labels.push(String(token.value));
			expectOperand = false;
			continue;
		}
		if (token.kind === "param_coeff" || token.kind === "param_anyof") {
			if (!expectOperand)
				return {
					symbolic,
					expanded: "",
					value: null,
					error: "Ожидался оператор",
				};
			if (token.invalid) {
				return {
					symbolic,
					expanded: "",
					value: null,
					error: `Параметр «${token.paramName ?? token.paramCode}» удалён из блока параметров трудоёмкости`,
				};
			}
			const coeff = ctx.paramCoefficients[token.paramCode];
			if (coeff == null || !Number.isFinite(coeff)) {
				return {
					symbolic,
					expanded: "",
					value: null,
					error: `Коэффициент параметра «${token.paramName ?? token.paramCode}» не задан`,
				};
			}
			values.push(coeff);
			labels.push(String(coeff));
			expectOperand = false;
			continue;
		}
		if (token.kind === "work_ref") {
			return {
				symbolic,
				expanded: "",
				value: null,
				error: "Транзитивная ссылка вычисляется отдельно",
			};
		}
		if (token.kind === "arch_count_coeff") {
			if (!expectOperand)
				return {
					symbolic,
					expanded: "",
					value: null,
					error: "Ожидался оператор",
				};
			const stepsErr = validateArchCountCoeffSteps(
				token.archComponentKind,
				token.steps,
			);
			if (stepsErr) {
				return { symbolic, expanded: "", value: null, error: stepsErr };
			}
			const formData = ctx.formData ?? {};
			const coeff = resolveArchCountCoeffFromToken(
				formData,
				token.archComponentKind,
				token.steps,
			);
			values.push(coeff);
			labels.push(String(coeff));
			expectOperand = false;
			continue;
		}
		if (token.kind === "paren_open") {
			if (!expectOperand)
				return {
					symbolic,
					expanded: "",
					value: null,
					error: "Ожидался оператор перед «(»",
				};
			opStack.push({ prec: -1, fn: () => 0, sym: "(" });
			continue;
		}
		if (token.kind === "paren_close") {
			while (opStack.length > 0 && opStack[opStack.length - 1]?.sym !== "(") {
				const err = applyTop();
				if (err) return { symbolic, expanded: "", value: null, error: err };
			}
			if (opStack.length === 0) {
				return {
					symbolic,
					expanded: "",
					value: null,
					error: "Несбалансированные скобки",
				};
			}
			opStack.pop();
			expectOperand = false;
			continue;
		}
		if (token.kind === "operator") {
			if (expectOperand)
				return {
					symbolic,
					expanded: "",
					value: null,
					error: "Лишний оператор",
				};
			const p = prec(token.op);
			while (
				opStack.length > 0 &&
				opStack[opStack.length - 1]?.sym !== "(" &&
				(opStack[opStack.length - 1]?.prec ?? 0) >= p
			) {
				const err = applyTop();
				if (err) return { symbolic, expanded: "", value: null, error: err };
			}
			const sym = OP_SYMBOL[token.op] ?? token.op;
			opStack.push({
				prec: p,
				sym,
				fn:
					token.op === "+"
						? (a, b) => a + b
						: token.op === "-"
							? (a, b) => a - b
							: token.op === "*"
								? (a, b) => a * b
								: (a, b) => a / b,
			});
			expectOperand = true;
		}
	}

	while (opStack.length > 0) {
		if (opStack[opStack.length - 1]?.sym === "(") {
			return {
				symbolic,
				expanded: "",
				value: null,
				error: "Несбалансированные скобки",
			};
		}
		const err = applyTop();
		if (err) return { symbolic, expanded: "", value: null, error: err };
	}

	if (values.length !== 1) {
		return {
			symbolic,
			expanded: "",
			value: null,
			error: "Некорректное выражение",
		};
	}

	return {
		symbolic,
		expanded: labels[0] ?? "",
		value: values[0] ?? null,
		error: null,
	};
}

/** Трудозатраты (ч/д) не могут быть отрицательными. */
export function clampTypicalWorkEffort(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, value);
}

/** Округление без ограничения снизу — для валидации формулы перед сохранением. */
export function roundWorkEffortValue(
	value: number,
	rounding: V2TypicalWorkRoundingDto,
): number {
	if (rounding.mode === "NONE") return value;
	const step = rounding.step ?? 0.1;
	if (step <= 0) return value;
	const scaled = value / step;
	switch (rounding.mode as V2WorkRoundingMode) {
		case "CEIL":
			return Math.ceil(scaled - 1e-9) * step;
		case "FLOOR":
			return Math.floor(scaled + 1e-9) * step;
		case "ROUND":
			return Math.round(scaled) * step;
		default:
			return value;
	}
}

export function applyWorkRounding(
	value: number,
	rounding: V2TypicalWorkRoundingDto,
): number {
	return clampTypicalWorkEffort(roundWorkEffortValue(value, rounding));
}

export function previewWorkFormula(
	formula: V2TypicalWorkFormulaDto,
	rounding: V2TypicalWorkRoundingDto,
	ctx: WorkFormulaEvalContext,
): WorkFormulaEvalResult {
	const evaluated = evaluateWorkFormula(formula, ctx);
	if (evaluated.error || evaluated.value == null) return evaluated;
	const rounded = applyWorkRounding(evaluated.value, rounding);
	return {
		...evaluated,
		value: rounded,
		expanded: `${evaluated.expanded} → ${rounded}`,
	};
}
