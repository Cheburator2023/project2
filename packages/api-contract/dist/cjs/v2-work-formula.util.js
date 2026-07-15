"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTransitiveOnlyFormula = isTransitiveOnlyFormula;
exports.hasWorkRefToken = hasWorkRefToken;
exports.isParamToken = isParamToken;
exports.workFormulaLaborParamMatches = workFormulaLaborParamMatches;
exports.isWorkFormulaLaborParamKnown = isWorkFormulaLaborParamKnown;
exports.normalizeWorkFormulaLaborParamTokens = normalizeWorkFormulaLaborParamTokens;
exports.reconcileFormulaLaborParamTokens = reconcileFormulaLaborParamTokens;
exports.tokensToText = tokensToText;
exports.formatWorkFormulaGeneralSummary = formatWorkFormulaGeneralSummary;
exports.parseWorkFormulaText = parseWorkFormulaText;
exports.validateWorkFormulaTokens = validateWorkFormulaTokens;
exports.isParamUsedInFormula = isParamUsedInFormula;
exports.markFormulaParamInvalid = markFormulaParamInvalid;
exports.markUnknownFormulaLaborParamTokensInvalid = markUnknownFormulaLaborParamTokensInvalid;
exports.evaluateWorkFormula = evaluateWorkFormula;
exports.clampTypicalWorkEffort = clampTypicalWorkEffort;
exports.roundWorkEffortValue = roundWorkEffortValue;
exports.applyWorkRounding = applyWorkRounding;
exports.previewWorkFormula = previewWorkFormula;
const v2_param_slug_util_1 = require("./v2-param-slug.util");
const v2_work_param_source_keys_util_1 = require("./v2-work-param-source-keys.util");
const OP_SYMBOL = {
    "+": "+",
    "-": "−",
    "*": "×",
    "/": "÷",
};
function isTransitiveOnlyFormula(tokens) {
    return tokens.length === 1 && tokens[0]?.kind === "work_ref";
}
function hasWorkRefToken(tokens) {
    return tokens.some((token) => token.kind === "work_ref");
}
function isParamToken(token) {
    return token.kind === "param_coeff" || token.kind === "param_anyof";
}
function collectParamRefKeys(ref) {
    const keys = new Set();
    const code = ref.paramCode.trim();
    if (code)
        keys.add(code);
    const { displayName, sourceKeys } = (0, v2_work_param_source_keys_util_1.parseParamNameSourceKeys)(ref.paramName);
    for (const key of sourceKeys) {
        if (key.trim())
            keys.add(key.trim());
    }
    for (const label of [
        displayName,
        (0, v2_work_param_source_keys_util_1.stripParamNameSourceKeys)(ref.paramName ?? ""),
    ]) {
        const slug = (0, v2_param_slug_util_1.slugParamCode)(label.trim());
        if (slug)
            keys.add(slug);
    }
    return keys;
}
/** Сопоставление токена формулы с параметром из блока трудоёмкости (код, подпись, sourceKeys). */
function workFormulaLaborParamMatches(token, group) {
    if (group.paramCode === token.paramCode)
        return true;
    if (token.paramName != null && group.paramName === token.paramName)
        return true;
    if (token.paramName != null && group.paramCode === token.paramName)
        return true;
    if (group.paramName != null && group.paramName === token.paramCode)
        return true;
    const tokenDisplay = (0, v2_work_param_source_keys_util_1.stripParamNameSourceKeys)(token.paramName ?? "")
        .trim()
        .toLowerCase();
    const groupDisplay = (0, v2_work_param_source_keys_util_1.stripParamNameSourceKeys)(group.paramName ?? "")
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
        if (groupKeys.has(key))
            return true;
    }
    return false;
}
function isWorkFormulaLaborParamKnown(token, laborParams) {
    return laborParams.some((group) => workFormulaLaborParamMatches(token, group));
}
function normalizeWorkFormulaLaborParamTokens(tokens, laborParams) {
    return tokens.map((token) => {
        if (token.kind !== "param_coeff" && token.kind !== "param_anyof") {
            return token;
        }
        const group = laborParams.find((g) => workFormulaLaborParamMatches(token, g));
        if (!group)
            return token;
        return {
            kind: token.kind,
            paramCode: group.paramCode,
            paramName: group.paramName ?? group.paramCode,
        };
    });
}
/** Сопоставляет param-токены формулы с блоком трудоёмкости и снимает invalid при совпадении. */
function reconcileFormulaLaborParamTokens(tokens, laborParams) {
    const normalized = normalizeWorkFormulaLaborParamTokens(tokens, laborParams);
    return normalized.map((token) => {
        if (!isParamToken(token))
            return token;
        if (!isWorkFormulaLaborParamKnown(token, laborParams))
            return token;
        if (!token.invalid)
            return token;
        const { invalid: _invalid, ...rest } = token;
        return rest;
    });
}
function formatWorkFormulaParamRef(paramCode, paramName) {
    const code = paramCode.trim();
    const name = paramName?.trim();
    if (name && /[()"']/.test(name)) {
        return `"${name.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    }
    return code || name || "";
}
function tokensToText(tokens) {
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
const GENERAL_OP_SYMBOL = {
    "+": "+",
    "-": "−",
    "*": "*",
    "/": "/",
};
/** Краткая запись для блока «Общая формула норматива» (N, Кэф-П1, …). */
function formatWorkFormulaGeneralSummary(tokens, paramOrder) {
    const indexByCode = new Map(paramOrder.map((code, index) => [code, index + 1]));
    return tokens
        .map((token) => {
        switch (token.kind) {
            case "norm":
                return "N";
            case "param_coeff":
            case "param_anyof": {
                const idx = indexByCode.get(token.paramCode);
                const prefix = token.kind === "param_anyof" ? "Any-П" : "Кэф-П";
                if (idx != null)
                    return `${prefix}${idx}`;
                return `${prefix}[${token.paramName ?? token.paramCode}]`;
            }
            case "work_ref":
                return token.workName ? `→${token.workName}` : "→работа";
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
function parseWorkFormulaText(text) {
    const input = text.trim();
    if (!input) {
        return { tokens: [{ kind: "norm" }], error: null };
    }
    const tokens = [];
    let i = 0;
    const skipWs = () => {
        while (i < input.length && /\s/.test(input[i] ?? ""))
            i++;
    };
    const readNumber = () => {
        const start = i;
        if (input[i] === ",")
            i++;
        while (i < input.length && /[\d.,]/.test(input[i] ?? ""))
            i++;
        const raw = input.slice(start, i).replace(",", ".");
        if (!raw || raw === ".")
            return null;
        const value = Number(raw);
        if (!Number.isFinite(value))
            return null;
        if (value < 0)
            return null;
        return { kind: "number", value };
    };
    const readFormulaParamRef = (refStart) => {
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
            if (ch === "(")
                depth++;
            else if (ch === ")") {
                if (depth === 0)
                    break;
                depth--;
            }
            pos++;
        }
        const value = input.slice(valueStart, pos).trim();
        if (!value)
            return null;
        return { value, nextIndex: pos };
    };
    const readFunctionCall = (fnName) => {
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
    while (i < input.length) {
        skipWs();
        if (i >= input.length)
            break;
        const ch = input[i] ?? "";
        if (input.slice(i, i + 8).toLowerCase() === "норма_n" ||
            input.slice(i, i + 7).toLowerCase() === "norma_n") {
            tokens.push({ kind: "norm" });
            i += input.slice(i, i + 8).toLowerCase() === "норма_n" ? 8 : 7;
            continue;
        }
        const normWord = input.slice(i, i + 5).toLowerCase();
        if ((normWord === "норма" || normWord === "norma") &&
            !/[A-Za-zА-Яа-я0-9_]/.test(input[i + 5] ?? "")) {
            tokens.push({ kind: "norm" });
            i += 5;
            continue;
        }
        const fnCall = readFunctionCall("коэф") ??
            readFunctionCall("anyof") ??
            readFunctionCall("работа");
        if (fnCall) {
            skipWs();
            const invalid = input[i] === "?";
            if (invalid)
                i++;
            if (fnCall.kind === "work_ref") {
                tokens.push({
                    kind: "work_ref",
                    assignmentId: fnCall.id,
                    ...(invalid ? { invalid: true } : {}),
                });
            }
            else {
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
            const op = ch === "×"
                ? "*"
                : ch === "÷"
                    ? "/"
                    : ch === "−"
                        ? "-"
                        : ch;
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
function describeWorkFormulaTokenLabel(token) {
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
function formatWorkFormulaTokenPosition(tokens, idx) {
    const token = tokens[idx];
    if (!token)
        return `позиция ${idx + 1} из ${tokens.length}`;
    return `токен ${idx + 1} из ${tokens.length} («${describeWorkFormulaTokenLabel(token)}»)`;
}
function validateWorkFormulaTokens(tokens, options) {
    const opts = options instanceof Set ? { allowedParamCodes: options } : (options ?? {});
    const { allowedParamCodes, laborParams, allowInvalidParamRefs = false, strictTransitiveExclusive = true, } = opts;
    if (tokens.length === 0) {
        return "Формула не может быть пустой — добавьте хотя бы один токен";
    }
    const workRefCount = tokens.filter((token) => token.kind === "work_ref").length;
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
        if (!token)
            continue;
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
            if (expectOperand)
                return "Проверьте скобки в формуле";
            balance--;
            if (balance < 0)
                return "Проверьте скобки в формуле";
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
            const laborAllowed = laborParams && laborParams.length > 0
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
        expectOperand = false;
    }
    if (balance !== 0)
        return "Проверьте скобки в формуле";
    if (expectOperand && tokens.length > 0) {
        return "Выражение не может заканчиваться оператором";
    }
    // Деление на ноль (константа-делитель = 0)
    for (let idx = 0; idx < tokens.length - 2; idx++) {
        const op = tokens[idx + 1];
        const divisor = tokens[idx + 2];
        if (op?.kind === "operator" &&
            op.op === "/" &&
            divisor?.kind === "number" &&
            divisor.value === 0) {
            return "Деление на ноль недопустимо";
        }
    }
    return null;
}
function isParamUsedInFormula(tokens, paramCode) {
    return tokens.some((token) => isParamToken(token) && token.paramCode === paramCode && !token.invalid);
}
function markFormulaParamInvalid(tokens, paramCode) {
    return tokens.map((token) => isParamToken(token) && token.paramCode === paramCode
        ? { ...token, invalid: true }
        : token);
}
/** Помечает param-токены формулы invalid, если их нет в блоке трудоёмкости. */
function markUnknownFormulaLaborParamTokensInvalid(tokens, laborParams) {
    return tokens.map((token) => {
        if (!isParamToken(token) || token.invalid)
            return token;
        if (isWorkFormulaLaborParamKnown(token, laborParams))
            return token;
        return { ...token, invalid: true };
    });
}
function evaluateWorkFormula(formula, ctx) {
    const symbolic = formula.text || tokensToText(formula.tokens);
    const validation = validateWorkFormulaTokens(formula.tokens);
    if (validation) {
        return { symbolic, expanded: "", value: null, error: validation };
    }
    const values = [];
    const labels = [];
    let expectOperand = true;
    const opStack = [];
    const applyTop = () => {
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
    const prec = (op) => (op === "+" || op === "-" ? 1 : 2);
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
                if (err)
                    return { symbolic, expanded: "", value: null, error: err };
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
            while (opStack.length > 0 &&
                opStack[opStack.length - 1]?.sym !== "(" &&
                (opStack[opStack.length - 1]?.prec ?? 0) >= p) {
                const err = applyTop();
                if (err)
                    return { symbolic, expanded: "", value: null, error: err };
            }
            const sym = OP_SYMBOL[token.op] ?? token.op;
            opStack.push({
                prec: p,
                sym,
                fn: token.op === "+"
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
        if (err)
            return { symbolic, expanded: "", value: null, error: err };
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
function clampTypicalWorkEffort(value) {
    if (!Number.isFinite(value))
        return 0;
    return Math.max(0, value);
}
/** Округление без ограничения снизу — для валидации формулы перед сохранением. */
function roundWorkEffortValue(value, rounding) {
    if (rounding.mode === "NONE")
        return value;
    const step = rounding.step ?? 0.1;
    if (step <= 0)
        return value;
    const scaled = value / step;
    switch (rounding.mode) {
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
function applyWorkRounding(value, rounding) {
    return clampTypicalWorkEffort(roundWorkEffortValue(value, rounding));
}
function previewWorkFormula(formula, rounding, ctx) {
    const evaluated = evaluateWorkFormula(formula, ctx);
    if (evaluated.error || evaluated.value == null)
        return evaluated;
    const rounded = applyWorkRounding(evaluated.value, rounding);
    return {
        ...evaluated,
        value: rounded,
        expanded: `${evaluated.expanded} → ${rounded}`,
    };
}
