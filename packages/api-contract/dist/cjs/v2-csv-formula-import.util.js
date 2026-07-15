"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCsvSemicolon = parseCsvSemicolon;
exports.parseNormFromCsv = parseNormFromCsv;
exports.normalizeCsvArchComponent = normalizeCsvArchComponent;
exports.inferCsvArchComponent = inferCsvArchComponent;
exports.stripWorkStagePrefix = stripWorkStagePrefix;
exports.parseCsvTriggerRules = parseCsvTriggerRules;
exports.parseCsvLaborCoefficients = parseCsvLaborCoefficients;
exports.parseCsvFormulaImportRows = parseCsvFormulaImportRows;
exports.buildCatalogMatchKey = buildCatalogMatchKey;
exports.normalizeParamLabel = normalizeParamLabel;
exports.resolveCsvParamCode = resolveCsvParamCode;
exports.extractFormulaCoreFromCsvText = extractFormulaCoreFromCsvText;
exports.buildFormulaTextFromCsvCore = buildFormulaTextFromCsvCore;
exports.buildFormulaFromCsvRow = buildFormulaFromCsvRow;
exports.csvRowToCatalogPatch = csvRowToCatalogPatch;
exports.validateImportedFormulaText = validateImportedFormulaText;
const v2_work_formula_util_1 = require("./v2-work-formula.util");
const v2_param_slug_util_1 = require("./v2-param-slug.util");
/** RFC4180-подобный парсер CSV с `;` и многострочными полями в кавычках. */
function parseCsvSemicolon(text) {
    const rows = [];
    let field = "";
    let row = [];
    let inQuotes = false;
    const src = text.replace(/^\uFEFF/, "");
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (inQuotes) {
            if (ch === '"') {
                if (src[i + 1] === '"') {
                    field += '"';
                    i++;
                }
                else {
                    inQuotes = false;
                }
            }
            else {
                field += ch;
            }
            continue;
        }
        if (ch === '"') {
            inQuotes = true;
        }
        else if (ch === ";") {
            row.push(field);
            field = "";
        }
        else if (ch === "\n") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        }
        else if (ch !== "\r") {
            field += ch;
        }
    }
    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows.filter((r) => r.some((c) => c.trim().length > 0));
}
function clean(value) {
    return (value ?? "").replace(/\s+/g, " ").trim();
}
function parseNormFromCsv(raw) {
    const v = clean(raw).replace(",", ".");
    if (!v)
        return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}
function normalizeCsvArchComponent(raw) {
    const v = clean(raw)
        .replace(/^Арх\.?\s*Компонент\.?\s*/i, "")
        .trim();
    const map = {
        "Система источник": "Система-источник",
        "Система-источник": "Система-источник",
        "Объект данных": "Объект/Витрина данных",
        "Объект/Витрина данных": "Объект/Витрина данных",
        "Объект / Витрина данных": "Объект / Витрина данных",
        "Процессы Обработки данных": "Процесс обработки данных",
        "Процесс обработки данных": "Процесс обработки данных",
        "Модельный сервис": "Модельный сервис",
        Модель: "Модель",
    };
    return map[v] ?? v;
}
/** Этап 220 / 230 и «?» — как в v2-catalog-component-inference. */
function inferCsvArchComponent(rawComponent, stream, stage) {
    const component = rawComponent.trim();
    if (component && !component.endsWith("?")) {
        return normalizeCsvArchComponent(component);
    }
    const streamNorm = stream.trim();
    const stageNorm = stage.trim();
    if (streamNorm.includes("Контроль моделей")) {
        return "Модельный сервис";
    }
    if (stageNorm === "Этап 230" || stageNorm === "Этап 219") {
        return "Система-источник";
    }
    if (stageNorm === "Этап 220") {
        return "Объект/Витрина данных";
    }
    return normalizeCsvArchComponent(component);
}
function stripWorkStagePrefix(name) {
    return name.replace(/^Этап[\s_]+\d+\.\s*/u, "").trim();
}
function splitTopLevelList(raw) {
    const parts = [];
    let current = "";
    let parenDepth = 0;
    for (const ch of raw.replace(/\r/g, "")) {
        if (ch === "(")
            parenDepth++;
        else if (ch === ")" && parenDepth > 0)
            parenDepth--;
        if ((ch === "," || ch === "\n") && parenDepth === 0) {
            const part = clean(current);
            if (part)
                parts.push(part);
            current = "";
            continue;
        }
        current += ch;
    }
    const tail = clean(current);
    if (tail)
        parts.push(tail);
    return parts;
}
function parseLaborParamsNumbered(raw) {
    const trimmed = raw.trim();
    if (!trimmed || /^—(?:\s|\(|$)/u.test(trimmed))
        return [];
    const lines = raw.split("\n");
    const params = [];
    for (const line of lines) {
        const m = line.trim().match(/^\d+\.\s*(.+)$/);
        if (m?.[1]) {
            params.push(clean(m[1]));
        }
    }
    if (params.length === 0) {
        return splitTopLevelList(raw);
    }
    return params;
}
function parseCsvTriggerRules(raw) {
    return splitTopLevelList(raw).map((rawParam) => {
        const sourceType = rawParam.match(/^(Тип\s+(?:системы-)?источника)\s*\((внешний|внутренний)\)$/iu);
        if (sourceType?.[1] && sourceType[2]) {
            const sourceValue = clean(sourceType[2]);
            return {
                paramName: clean(sourceType[1]),
                operator: "=",
                values: [
                    sourceValue.charAt(0).toUpperCase() +
                        sourceValue.slice(1).toLowerCase(),
                ],
            };
        }
        const pilot = rawParam.match(/^Пилот\s*\(([^)]+)\)$/iu);
        if (pilot?.[1]) {
            return {
                paramName: "Пилот",
                operator: "in",
                values: splitTopLevelList(pilot[1]).map((value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()),
            };
        }
        const control = rawParam.match(/^(Вид контроля)\s*:\s*(.+)$/iu);
        if (control?.[1] && control[2]) {
            return {
                paramName: clean(control[1]),
                operator: "=",
                values: [clean(control[2])],
            };
        }
        if (/^(Необходимо подтвердить возможность интеграции|Необходима продуктивизация)$/iu.test(rawParam)) {
            return {
                paramName: rawParam,
                operator: "=",
                values: ["Да"],
            };
        }
        if (/^Не понятно условие появления работ$/iu.test(rawParam)) {
            return {
                paramName: rawParam,
                operator: "unresolved",
                values: [],
            };
        }
        return {
            paramName: rawParam,
            operator: "exists",
            values: [],
        };
    });
}
function parseCsvLaborCoefficients(formulaRaw, archComponent) {
    const sectionMatch = formulaRaw.match(/Переменные\s*—\s*параметры трудоёмкости[\s\S]*?:([\s\S]*?)(?:\n\s*Операнды:|$)/iu);
    if (!sectionMatch?.[1])
        return [];
    const groups = [];
    for (const line of sectionMatch[1].split(/\r?\n/)) {
        const match = line.match(/^\s*—\s*(.+?):\s*(.+)$/u);
        if (!match?.[1] || !match[2] || !match[2].includes("→"))
            continue;
        const values = match[2]
            .split(";")
            .map((part) => {
            const arrow = part.indexOf("→");
            if (arrow < 0)
                return null;
            const rawLabel = clean(part.slice(0, arrow));
            const booleanLabel = rawLabel.match(/^(Да|Нет)\s*\(/iu);
            const label = booleanLabel?.[1] ?? rawLabel;
            const coefficientMatch = part
                .slice(arrow + 1)
                .trim()
                .match(/^(-?\d+(?:[.,]\d+)?)/u);
            if (!label || !coefficientMatch?.[1])
                return null;
            const coefficient = Number(coefficientMatch[1].replace(",", "."));
            if (!Number.isFinite(coefficient))
                return null;
            return { label, coefficient };
        })
            .filter((value) => value !== null);
        const normalizedComponent = clean(archComponent).toLowerCase();
        const componentOverrides = match[2].matchAll(/\(\s*на\s+«([^»]+)»\s+([^→;)]+)→\s*(-?\d+(?:[.,]\d+)?)/giu);
        for (const override of componentOverrides) {
            if (!normalizedComponent ||
                clean(override[1]).toLowerCase() !== normalizedComponent) {
                continue;
            }
            const label = clean(override[2]);
            const coefficient = Number((override[3] ?? "").replace(",", "."));
            if (!label || !Number.isFinite(coefficient))
                continue;
            const existing = values.find((value) => value.label.toLowerCase() === label.toLowerCase());
            if (existing)
                existing.coefficient = coefficient;
            else
                values.push({ label, coefficient });
        }
        if (values.length > 0) {
            groups.push({ paramName: clean(match[1]), values });
        }
    }
    return groups;
}
function parseCsvFormulaImportRows(csvText) {
    const rows = parseCsvSemicolon(csvText);
    if (rows.length < 2)
        return [];
    const header = rows[0];
    const idx = (prefix) => header.findIndex((h) => clean(h).toLowerCase().startsWith(prefix.toLowerCase()));
    const cStream = idx("Стрим");
    const cComponent = idx("Арх");
    const cOriginal = idx("Название оригинальное");
    const cName = header.findIndex((h) => clean(h).toLowerCase().includes("название в смарт-анкете"));
    const cContext = idx("Контекст");
    const cWorkType = idx("Тип работы");
    const cNorm = idx("Наличие норматива");
    const cTrigger = idx("Параметр-триггер");
    const cLabor = idx("Параметры трудоемкости");
    const cFormula = idx("Формула");
    return rows
        .slice(1)
        .map((r) => {
        const originalName = clean(r[cOriginal]);
        const smartName = clean(r[cName >= 0 ? cName : cOriginal]) || originalName;
        const stream = clean(r[cStream]);
        const stage = clean(r[cContext]);
        const baseName = stripWorkStagePrefix(smartName) ||
            stripWorkStagePrefix(originalName) ||
            smartName ||
            originalName;
        const triggerRaw = r[cTrigger] ?? "";
        const triggerRules = parseCsvTriggerRules(triggerRaw);
        return {
            stream,
            component: inferCsvArchComponent(r[cComponent] ?? "", stream, stage),
            stage,
            name: baseName,
            originalName: originalName || baseName,
            workType: clean(r[cWorkType]),
            norm: parseNormFromCsv(r[cNorm]),
            normRaw: clean(r[cNorm]),
            triggerParams: triggerRules.map((rule) => rule.paramName),
            triggerRules,
            laborParams: cLabor >= 0 ? parseLaborParamsNumbered(r[cLabor] ?? "") : [],
            formulaRaw: cLabor >= 0 && cFormula >= 0 ? (r[cFormula] ?? "") : "",
        };
    })
        .filter((row) => row.name.length > 0 && row.stream.length > 0);
}
function buildCatalogMatchKey(row) {
    return [row.stream, row.component, row.stage, row.name]
        .map((part) => clean(part))
        .join("|");
}
function normalizeParamLabel(label) {
    return label
        .toLowerCase()
        .replace(/ё/g, "е")
        .replace(/[«»""]/g, "")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function levenshteinDistance(a, b) {
    const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i++) {
        let diagonal = previous[0] ?? 0;
        previous[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const above = previous[j] ?? j;
            const left = previous[j - 1] ?? i;
            const next = a[i - 1] === b[j - 1]
                ? diagonal
                : Math.min(diagonal + 1, above + 1, left + 1);
            diagonal = above;
            previous[j] = next;
        }
    }
    return previous[b.length] ?? Math.max(a.length, b.length);
}
function resolveCsvParamCode(label, candidates, overrides = {}) {
    const trimmed = label.trim();
    if (!trimmed)
        return null;
    if (overrides[trimmed])
        return overrides[trimmed];
    const norm = normalizeParamLabel(trimmed);
    const exact = candidates.find((c) => normalizeParamLabel(c.name) === norm || c.code === trimmed);
    if (exact)
        return exact.code;
    const slug = (0, v2_param_slug_util_1.slugParamCode)(trimmed);
    const bySlug = candidates.find((c) => c.code === slug);
    if (bySlug)
        return bySlug.code;
    const partial = candidates
        .map((candidate) => ({
        candidate,
        normalized: normalizeParamLabel(candidate.name),
    }))
        .filter(({ normalized }) => {
        const shorter = Math.min(normalized.length, norm.length);
        return (shorter >= 8 &&
            (normalized.startsWith(norm) || norm.startsWith(normalized)));
    })
        .sort((a, b) => Math.abs(a.normalized.length - norm.length) -
        Math.abs(b.normalized.length - norm.length))[0]?.candidate;
    if (partial)
        return partial.code;
    const fuzzy = candidates
        .map((candidate) => {
        const normalized = normalizeParamLabel(candidate.name);
        return {
            candidate,
            distance: levenshteinDistance(norm, normalized),
            maxLength: Math.max(norm.length, normalized.length),
        };
    })
        .filter((item) => item.maxLength >= 8 &&
        item.distance <= Math.max(2, Math.floor(item.maxLength * 0.12)))
        .sort((a, b) => a.distance - b.distance)[0]?.candidate;
    if (fuzzy)
        return fuzzy.code;
    return null;
}
function extractFormulaCoreFromCsvText(formulaRaw) {
    const flat = formulaRaw.replace(/\r/g, "").replace(/\n/g, " ");
    const ceilMatch = flat.match(/ОКРУГЛ\.ВВЕРХ\s*\(\s*(.+?)\s*;\s*([\d,.]+)\s*\)/iu);
    if (ceilMatch) {
        return {
            core: clean(ceilMatch[1]),
            roundingMode: "CEIL",
            roundingStep: Number(ceilMatch[2].replace(",", ".")) || 0.1,
        };
    }
    const floorMatch = flat.match(/ОКРУГЛ\.ВНИЗ\s*\(\s*(.+?)\s*;\s*([\d,.]+)\s*\)/iu);
    if (floorMatch) {
        return {
            core: clean(floorMatch[1]),
            roundingMode: "FLOOR",
            roundingStep: Number(floorMatch[2].replace(",", ".")) || 0.1,
        };
    }
    const roundMatch = flat.match(/ОКРУГЛ\s*\(\s*(.+?)\s*;\s*([\d,.]+)\s*\)/iu);
    if (roundMatch) {
        return {
            core: clean(roundMatch[1]),
            roundingMode: "ROUND",
            roundingStep: Number(roundMatch[2].replace(",", ".")) || 0.1,
        };
    }
    if (/^Норматив\s*$/iu.test(clean(flat)) ||
        /\b=\s*Норматив\s*$/iu.test(flat)) {
        return {
            core: "Норматив",
            roundingMode: "CEIL",
            roundingStep: 0.1,
        };
    }
    const generic = flat.match(/ЧД\s*\([^)]*\)\s*=\s*(.+)$/iu);
    if (generic?.[1]) {
        const tail = clean(generic[1]);
        if (/^Норматив\s*$/iu.test(tail)) {
            return {
                core: "Норматив",
                roundingMode: "CEIL",
                roundingStep: 0.1,
            };
        }
    }
    return null;
}
function buildFormulaTextFromCsvCore(core, resolveParamCode) {
    const unmatchedParams = [];
    const skippedSpecial = [];
    if (/^Норматив\s*$/iu.test(core.trim())) {
        return { formulaText: "N", unmatchedParams, skippedSpecial };
    }
    const parts = core.split("×").map((part) => clean(part));
    const exprParts = ["N"];
    for (const part of parts) {
        if (!part || /^Норматив\s*$/iu.test(part))
            continue;
        const bracket = part.match(/^\[(.+)\]$/);
        if (bracket?.[1]) {
            const label = bracket[1].trim();
            const code = resolveParamCode(label);
            if (!code) {
                unmatchedParams.push(label);
                continue;
            }
            exprParts.push(`коэф(${code})`);
            continue;
        }
        if (/Kдоля/i.test(part)) {
            skippedSpecial.push(part);
            continue;
        }
        unmatchedParams.push(part);
    }
    const formulaText = exprParts.length === 1 ? "N" : exprParts.join(" * ");
    return { formulaText, unmatchedParams, skippedSpecial };
}
function extractRoundedExpressionAfterMarker(formulaRaw, marker) {
    const markerIndex = formulaRaw.indexOf(marker);
    if (markerIndex < 0)
        return null;
    const source = formulaRaw.slice(markerIndex);
    const callMatch = /ОКРУГЛ\.ВВЕРХ\s*\(/iu.exec(source);
    if (!callMatch)
        return null;
    const start = (callMatch.index ?? 0) + callMatch[0].length;
    let depth = 0;
    for (let index = start; index < source.length; index++) {
        const ch = source[index];
        if (ch === "(")
            depth++;
        else if (ch === ")") {
            if (depth === 0)
                return null;
            depth--;
        }
        else if (ch === ";" && depth === 0) {
            return source.slice(start, index).trim();
        }
    }
    return null;
}
function splitFirstTopLevelMultiply(expression) {
    let depth = 0;
    for (let index = 0; index < expression.length; index++) {
        const ch = expression[index];
        if (ch === "(")
            depth++;
        else if (ch === ")" && depth > 0)
            depth--;
        else if (ch === "×" && depth === 0) {
            return [
                expression.slice(0, index).trim(),
                expression.slice(index + 1).trim(),
            ];
        }
    }
    return null;
}
function buildKdolyaFormulaFromCalibration(formulaRaw, resolveParamCode) {
    const calibration = extractRoundedExpressionAfterMarker(formulaRaw, "Исходная (калибровочная) формула");
    if (!calibration)
        return null;
    const split = splitFirstTopLevelMultiply(calibration);
    if (!split || !/^\d+(?:[.,]\d+)?$/u.test(split[0]))
        return null;
    const unmatchedParams = [];
    const inferredLaborParams = [];
    const converted = split[1]
        .replace(/\[([^\]]+)\]/gu, (_match, rawLabel) => {
        const label = clean(rawLabel);
        if (!inferredLaborParams.includes(label)) {
            inferredLaborParams.push(label);
        }
        const code = resolveParamCode(label);
        if (!code) {
            unmatchedParams.push(label);
            return `коэф(${(0, v2_param_slug_util_1.slugParamCode)(label)})`;
        }
        return `коэф(${code})`;
    })
        .replace(/(\d),(\d)/g, "$1.$2")
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-")
        .replace(/\s+/g, " ")
        .trim();
    if (!converted)
        return null;
    return {
        formulaText: `N * ${converted}`,
        unmatchedParams,
        inferredLaborParams,
    };
}
function buildFormulaFromCsvRow(row, candidates, overrides = {}) {
    const extracted = extractFormulaCoreFromCsvText(row.formulaRaw);
    if (!extracted)
        return null;
    const laborCandidates = row.laborParams.map((name) => ({
        name,
        code: (0, v2_param_slug_util_1.slugParamCode)(name),
    }));
    const mergedCandidates = [...laborCandidates];
    for (const candidate of candidates) {
        if (!mergedCandidates.some((c) => c.code === candidate.code)) {
            mergedCandidates.push(candidate);
        }
    }
    const resolve = (label) => resolveCsvParamCode(label, mergedCandidates, overrides);
    if (/Kдоля\s*\(/iu.test(extracted.core)) {
        const transformed = buildKdolyaFormulaFromCalibration(row.formulaRaw, resolve);
        if (!transformed) {
            return {
                formulaText: "N",
                roundingMode: extracted.roundingMode,
                roundingStep: extracted.roundingStep,
                unmatchedParams: [],
                skippedSpecial: ["Kдоля(Этап 217)"],
                inferredLaborParams: [],
                transformedSpecial: [],
                parseError: null,
            };
        }
        const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)(transformed.formulaText);
        return {
            formulaText: transformed.formulaText,
            roundingMode: extracted.roundingMode,
            roundingStep: extracted.roundingStep,
            unmatchedParams: transformed.unmatchedParams,
            skippedSpecial: [],
            inferredLaborParams: transformed.inferredLaborParams,
            transformedSpecial: ["Kдоля(Этап 217) → калибровочный множитель"],
            parseError: parsed.error,
        };
    }
    const built = buildFormulaTextFromCsvCore(extracted.core, resolve);
    const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)(built.formulaText);
    return {
        formulaText: built.formulaText,
        roundingMode: extracted.roundingMode,
        roundingStep: extracted.roundingStep,
        unmatchedParams: built.unmatchedParams,
        skippedSpecial: built.skippedSpecial,
        inferredLaborParams: [],
        transformedSpecial: [],
        parseError: parsed.error,
    };
}
function csvRowToCatalogPatch(row, candidates, overrides = {}) {
    const build = buildFormulaFromCsvRow(row, candidates, overrides);
    if (!build ||
        build.parseError ||
        build.unmatchedParams.length > 0 ||
        build.skippedSpecial.length > 0) {
        return { patch: null, build };
    }
    const laborParams = build.inferredLaborParams.length > 0
        ? build.inferredLaborParams
        : row.laborParams;
    const allowedParamCodes = new Set(laborParams.map((paramName) => (0, v2_param_slug_util_1.slugParamCode)(paramName)));
    const parsed = (0, v2_work_formula_util_1.parseWorkFormulaText)(build.formulaText);
    const unboundCodes = parsed.tokens
        .filter((token) => token.kind === "param_coeff" || token.kind === "param_anyof")
        .map((token) => token.paramCode)
        .filter((paramCode) => !allowedParamCodes.has(paramCode));
    if (unboundCodes.length > 0) {
        build.unmatchedParams.push(...unboundCodes.map((paramCode) => `formula-code:${paramCode}`));
        return { patch: null, build };
    }
    return {
        patch: {
            formulaText: build.formulaText,
            roundingMode: build.roundingMode,
            roundingStep: build.roundingStep,
            laborParams,
            laborCoefficients: parseCsvLaborCoefficients(row.formulaRaw, row.component),
            triggerParams: row.triggerParams,
            triggerRules: row.triggerRules,
            norm: row.norm,
            normRaw: row.normRaw,
            workType: row.workType || undefined,
        },
        build,
    };
}
function validateImportedFormulaText(formulaText) {
    return (0, v2_work_formula_util_1.parseWorkFormulaText)(formulaText).error;
}
