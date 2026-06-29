import type {
	V2TypicalWorkFormulaDto,
	V2TypicalWorkRoundingDto,
	V2WorkFormulaToken,
	V2WorkRoundingMode,
} from "./v2-typical-work.types";

export type WorkFormulaEvalContext = {
	norm: number;
	paramCoefficients: Record<string, number>;
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

export function tokensToText(tokens: V2WorkFormulaToken[]): string {
	return tokens
		.map((token) => {
			switch (token.kind) {
				case "norm":
					return "H";
				case "param_coeff":
					return token.invalid
						? `P[${token.paramName ?? token.paramCode}]?`
						: `P[${token.paramName ?? token.paramCode}]`;
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

/** Краткая запись для блока «Общая формула норматива» (H, Кэф-П1, …). */
export function formatWorkFormulaGeneralSummary(
	tokens: V2WorkFormulaToken[],
	paramOrder: readonly string[],
): string {
	const indexByCode = new Map(paramOrder.map((code, index) => [code, index + 1]));
	return tokens
		.map((token) => {
			switch (token.kind) {
				case "norm":
					return "H";
				case "param_coeff": {
					const idx = indexByCode.get(token.paramCode);
					if (idx != null) return `Кэф-П${idx}`;
					return `Кэф[${token.paramName ?? token.paramCode}]`;
				}
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
		return { kind: "number", value };
	};

	while (i < input.length) {
		skipWs();
		if (i >= input.length) break;
		const ch = input[i] ?? "";

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
				return { tokens: [], error: `Незакрытая ссылка P[…] на позиции ${i + 1}` };
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

		if ("+-×÷*/".includes(ch)) {
			const op =
				ch === "×"
					? "*"
					: ch === "÷"
						? "/"
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

		return { tokens: [], error: `Неизвестный символ «${ch}» на позиции ${i + 1}` };
	}

	const validation = validateWorkFormulaTokens(tokens);
	if (validation) {
		return { tokens: [], error: validation };
	}

	return { tokens, error: null };
}

export type ValidateWorkFormulaTokenOptions = {
	allowedParamCodes?: Set<string>;
	/** Разрешить сохранение формулы с помеченными invalid ссылками на параметры */
	allowInvalidParamRefs?: boolean;
};

export function isParamUsedInFormula(
	tokens: V2WorkFormulaToken[],
	paramCode: string,
): boolean {
	return tokens.some(
		(token) =>
			token.kind === "param_coeff" &&
			token.paramCode === paramCode &&
			!token.invalid,
	);
}

export function markFormulaParamInvalid(
	tokens: V2WorkFormulaToken[],
	paramCode: string,
): V2WorkFormulaToken[] {
	return tokens.map((token) =>
		token.kind === "param_coeff" && token.paramCode === paramCode
			? { ...token, invalid: true }
			: token,
	);
}

export function validateWorkFormulaTokens(
	tokens: V2WorkFormulaToken[],
	options?: Set<string> | ValidateWorkFormulaTokenOptions,
): string | null {
	const opts: ValidateWorkFormulaTokenOptions =
		options instanceof Set ? { allowedParamCodes: options } : (options ?? {});
	const { allowedParamCodes, allowInvalidParamRefs = false } = opts;
	if (tokens.length === 0) return "Формула не может быть пустой";

	let balance = 0;
	let expectOperand = true;

	for (let idx = 0; idx < tokens.length; idx++) {
		const token = tokens[idx];
		if (!token) continue;

		if (token.kind === "paren_open") {
			if (!expectOperand) return `Ожидался оператор перед «(», позиция ${idx + 1}`;
			balance++;
			expectOperand = true;
			continue;
		}
		if (token.kind === "paren_close") {
			if (expectOperand) return `Несбалансированные скобки на позиции ${idx + 1}`;
			balance--;
			if (balance < 0) return `Несбалансированные скобки на позиции ${idx + 1}`;
			expectOperand = false;
			continue;
		}

		if (token.kind === "operator") {
			if (expectOperand) return `Лишний оператор на позиции ${idx + 1}`;
			expectOperand = true;
			continue;
		}

		if (!expectOperand) {
			return `Ожидался оператор на позиции ${idx + 1}`;
		}

		if (token.kind === "param_coeff") {
			if (token.invalid) {
				if (allowInvalidParamRefs) {
					expectOperand = false;
					continue;
				}
				return `Параметр «${token.paramName ?? token.paramCode}» удалён из блока параметров трудоёмкости`;
			}
			if (allowedParamCodes && !allowedParamCodes.has(token.paramCode)) {
				return `Параметр «${token.paramName ?? token.paramCode}» отсутствует в блоке параметров трудоёмкости`;
			}
		}

		expectOperand = false;
	}

	if (balance !== 0) return "Несбалансированные скобки";
	if (expectOperand && tokens.length > 0) {
		return "Выражение не может заканчиваться оператором";
	}

	return null;
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
	const opStack: Array<{ prec: number; fn: (a: number, b: number) => number; sym: string }> =
		[];

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
		if (!Number.isFinite(result)) return "Деление на ноль или некорректный результат";
		values.push(result);
		labels.push(`(${la} ${op.sym} ${lb})`);
		return null;
	};

	const prec = (op: string) => (op === "+" || op === "-" ? 1 : 2);

	for (const token of formula.tokens) {
		if (token.kind === "norm") {
			if (!expectOperand) return { symbolic, expanded: "", value: null, error: "Ожидался оператор" };
			values.push(ctx.norm);
			labels.push(String(ctx.norm));
			expectOperand = false;
			continue;
		}
		if (token.kind === "number") {
			if (!expectOperand) return { symbolic, expanded: "", value: null, error: "Ожидался оператор" };
			values.push(token.value);
			labels.push(String(token.value));
			expectOperand = false;
			continue;
		}
		if (token.kind === "param_coeff") {
			if (!expectOperand) return { symbolic, expanded: "", value: null, error: "Ожидался оператор" };
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
		if (token.kind === "paren_open") {
			if (!expectOperand) return { symbolic, expanded: "", value: null, error: "Ожидался оператор перед «(»" };
			opStack.push({ prec: -1, fn: () => 0, sym: "(" });
			continue;
		}
		if (token.kind === "paren_close") {
			while (opStack.length > 0 && opStack[opStack.length - 1]?.sym !== "(") {
				const err = applyTop();
				if (err) return { symbolic, expanded: "", value: null, error: err };
			}
			if (opStack.length === 0) {
				return { symbolic, expanded: "", value: null, error: "Несбалансированные скобки" };
			}
			opStack.pop();
			expectOperand = false;
			continue;
		}
		if (token.kind === "operator") {
			if (expectOperand) return { symbolic, expanded: "", value: null, error: "Лишний оператор" };
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
			return { symbolic, expanded: "", value: null, error: "Несбалансированные скобки" };
		}
		const err = applyTop();
		if (err) return { symbolic, expanded: "", value: null, error: err };
	}

	if (values.length !== 1) {
		return { symbolic, expanded: "", value: null, error: "Некорректное выражение" };
	}

	return {
		symbolic,
		expanded: labels[0] ?? "",
		value: values[0] ?? null,
		error: null,
	};
}

export function applyWorkRounding(
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
