"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_STREAM_SOURCE_COUNT_STEPS = void 0;
exports.excelRoundingArgumentToStep = excelRoundingArgumentToStep;
exports.parseCsvSemicolon = parseCsvSemicolon;
exports.parseNormFromCsv = parseNormFromCsv;
exports.normalizeCsvArchComponent = normalizeCsvArchComponent;
exports.inferCsvArchComponent = inferCsvArchComponent;
exports.stripWorkStagePrefix = stripWorkStagePrefix;
exports.extractE2eWorkStage = extractE2eWorkStage;
exports.resolveE2eWorkStageAndName = resolveE2eWorkStageAndName;
exports.buildLinearArchCountSteps = buildLinearArchCountSteps;
exports.formatArchCountFormulaSteps = formatArchCountFormulaSteps;
exports.parseModelStreamLaborCoefficients = parseModelStreamLaborCoefficients;
exports.parseModelStreamTriggerRules = parseModelStreamTriggerRules;
exports.extractTriggerTextFromResultChoice = extractTriggerTextFromResultChoice;
exports.parseCsvTriggerRules = parseCsvTriggerRules;
exports.parseCsvLaborCoefficients = parseCsvLaborCoefficients;
exports.parseCsvFormulaImportRows = parseCsvFormulaImportRows;
exports.buildCatalogMatchKey = buildCatalogMatchKey;
exports.normalizeParamLabel = normalizeParamLabel;
exports.isCsvModelServiceCreateTrigger = isCsvModelServiceCreateTrigger;
exports.mapCsvControlTypeValue = mapCsvControlTypeValue;
exports.resolveCsvParamCode = resolveCsvParamCode;
exports.extractFormulaCoreFromCsvText = extractFormulaCoreFromCsvText;
exports.buildFormulaTextFromCsvCore = buildFormulaTextFromCsvCore;
exports.buildFormulaFromCsvRow = buildFormulaFromCsvRow;
exports.csvRowToCatalogPatch = csvRowToCatalogPatch;
exports.enrichFactorySnapshotTriggerRule = enrichFactorySnapshotTriggerRule;
exports.validateImportedFormulaText = validateImportedFormulaText;
const v2_work_formula_util_1 = require("./v2-work-formula.util");
const v2_param_slug_util_1 = require("./v2-param-slug.util");
const v2_works_catalog_match_util_1 = require("./v2-works-catalog-match.util");
/**
 * Второй аргумент Excel `ОКРУГЛ.ВВЕРХ/ВНИЗ/ОКРУГЛ(x; n)` — число разрядов.
 * Дробь вроде `0,1` в CSV уже означает абсолютный шаг округления.
 */
function excelRoundingArgumentToStep(raw) {
    if (!Number.isFinite(raw) || raw < 0)
        return 0.1;
    if (raw > 0 && raw < 1)
        return raw;
    if (Number.isInteger(raw) && raw <= 15) {
        return 10 ** -raw;
    }
    return raw;
}
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
/** Сравнение заголовков CSV: ё/е и регистр. */
function normalizeCsvHeader(value) {
    return clean(value).toLowerCase().replace(/ё/g, "е");
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
    let rest = name.trim();
    rest = rest.replace(/^Этап[\s_]+\d+\.\s*/u, "");
    const stagePrefix = rest.match(/^(\d+[ABАВаб]?)\.\s*/iu);
    if (stagePrefix) {
        rest = rest.slice(stagePrefix[0].length);
    }
    else {
        rest = rest.replace(/^AutoML:\s*/iu, "");
    }
    return rest.trim().replace(/\.\s*$/u, "");
}
/** E2E-этап из названия работы модельного стрима: «01. …», «05A. …», «AutoML: …». */
function extractE2eWorkStage(name) {
    const trimmed = name.trim();
    const stagePrefix = trimmed.match(/^(\d+[ABАВаб]?)\.\s*/iu);
    if (stagePrefix?.[1]) {
        return stagePrefix[1]
            .replace(/А/g, "A")
            .replace(/В/g, "B")
            .replace(/а/g, "A")
            .replace(/в/g, "B");
    }
    if (/^AutoML:/iu.test(trimmed))
        return "AutoML";
    return "";
}
function resolveE2eWorkStageAndName(smartName) {
    const trimmed = smartName.trim();
    const etap = trimmed.match(/^Этап[\s_]+(\d+)\.\s*(.+)$/u);
    if (etap?.[1] && etap[2]) {
        return {
            stage: `Этап ${etap[1]}`,
            name: clean(etap[2]).replace(/\.\s*$/u, "") || trimmed,
        };
    }
    const stage = extractE2eWorkStage(trimmed);
    let name = trimmed;
    name = name.replace(/^Этап[\s_]+\d+\.\s*/u, "");
    const stagePrefix = name.match(/^(\d+[ABАВаб]?)\.\s*/iu);
    if (stagePrefix) {
        name = name.slice(stagePrefix[0].length);
    }
    else {
        name = name.replace(/^AutoML:\s*/u, "");
    }
    name = name.trim().replace(/\.\s*$/u, "");
    return { stage, name: name || trimmed };
}
/** Шаги K = 1 + (N−1)×increment для архкоэф(Модели; …). */
function buildLinearArchCountSteps(maxCount, increment = 0.75) {
    const steps = [];
    for (let count = 1; count <= maxCount; count += 1) {
        const coefficient = count === 1 ? 1 : Math.round((1 + (count - 1) * increment) * 10000) / 10000;
        steps.push({ count, coefficient });
    }
    return steps;
}
exports.MODEL_STREAM_SOURCE_COUNT_STEPS = [
    { count: 1, coefficient: 1 },
    { count: 2, coefficient: 1.2 },
    { count: 3, coefficient: 1.4 },
    { count: 4, coefficient: 1.6 },
    { count: 5, coefficient: 1.8 },
    { count: 6, coefficient: 2 },
    { count: 7, coefficient: 2.2 },
    { count: 8, coefficient: 2.4 },
    { count: 9, coefficient: 2.6 },
    { count: 10, coefficient: 3 },
];
function formatArchCountFormulaSteps(steps) {
    return steps
        .map((step) => `${step.count}=${String(step.coefficient).replace(".", ",")}`)
        .join("; ");
}
const SOURCE_SYSTEM_ARCH_COUNT_STEPS = formatArchCountFormulaSteps([
    { count: 1, coefficient: 1 },
    { count: 2, coefficient: 1 },
    { count: 3, coefficient: 1 },
    { count: 4, coefficient: 1 },
    { count: 5, coefficient: 1 },
    { count: 6, coefficient: 1.2 },
    { count: 7, coefficient: 1.4 },
    { count: 8, coefficient: 1.6 },
    { count: 9, coefficient: 1.8 },
    { count: 10, coefficient: 2 },
    { count: 11, coefficient: 2.2 },
    { count: 12, coefficient: 2.4 },
    { count: 13, coefficient: 2.6 },
    { count: 14, coefficient: 2.8 },
    { count: 15, coefficient: 3 },
    { count: 16, coefficient: 3.2 },
    { count: 17, coefficient: 3.4 },
    { count: 18, coefficient: 3.6 },
    { count: 19, coefficient: 3.8 },
    { count: 20, coefficient: 4 },
]);
const MODEL_STREAM_ARCH_COUNT_PARAM_LABELS = {
    // ключи — через normalizeParamLabel (дефисы → пробелы)
    "кол во моделей": {
        kind: "model",
        steps: formatArchCountFormulaSteps(buildLinearArchCountSteps(15)),
    },
    "количество моделей": {
        kind: "model",
        steps: formatArchCountFormulaSteps(buildLinearArchCountSteps(15)),
    },
    "кол во источников для проработки": {
        kind: "sourceSystem",
        steps: formatArchCountFormulaSteps(exports.MODEL_STREAM_SOURCE_COUNT_STEPS),
    },
    "кол во арх компонентов система источник": {
        kind: "sourceSystem",
        steps: SOURCE_SYSTEM_ARCH_COUNT_STEPS,
    },
    "кол во арх компонентов система источник вычисляемый": {
        kind: "sourceSystem",
        steps: SOURCE_SYSTEM_ARCH_COUNT_STEPS,
    },
};
function resolveArchCountFormulaToken(label) {
    const arch = MODEL_STREAM_ARCH_COUNT_PARAM_LABELS[normalizeParamLabel(label)];
    if (!arch)
        return null;
    const kindLabel = arch.kind === "model" ? "Модели" : "Система-источник";
    return {
        kind: arch.kind,
        token: `архкоэф(${kindLabel}; ${arch.steps})`,
    };
}
function isInitiativesDivisorParam(label) {
    const norm = normalizeParamLabel(label);
    return norm.includes("оцениваемых инициатив");
}
function stripCoeffParamNamePrefix(raw) {
    return clean(raw)
        .replace(/^[—–\-]+\s*/u, "")
        .replace(/^надбавка\s+за\s+/iu, "");
}
function stripCoeffValueLabelPrefix(raw) {
    return clean(raw)
        .replace(/^\d+\s*[-–.]\s*/u, "")
        .replace(/^[×x*]\s*/u, "");
}
function parseCoeffArrowValue(raw) {
    const text = clean(raw)
        // «0, 25» / «0. 25» → опечатка десятичного разделителя с пробелом
        .replace(/(\d)[.,]\s+(\d)/g, "$1.$2");
    if (!text)
        return null;
    const baseMul = text.match(/(?:^\+|баз[аы]|норматив).{0,20}?(\d+(?:[.,]\d+)?)/iu);
    if (baseMul?.[1]) {
        const n = Number(baseMul[1].replace(",", "."));
        return Number.isFinite(n) ? n : null;
    }
    const direct = text.match(/^[×x*]?\s*(-?\d+(?:[.,]\d+)?)/u);
    if (direct?.[1]) {
        const n = Number(direct[1].replace(",", "."));
        return Number.isFinite(n) ? n : null;
    }
    if (/^×?\s*1\b/u.test(text) || /^по\s+умолчанию/iu.test(text))
        return 1;
    return null;
}
/** Парсит блоки «Параметр: 1→1; 2→1,25 …» из колонки коэффициентов модельного стрима. */
function parseModelStreamLaborCoefficients(raw) {
    const text = raw.replace(/\r/g, "").trim();
    if (!text)
        return [];
    const groups = [];
    const isShortValueLabel = (line) => /^(да|нет|неизвестно|не\s+требуется)$/iu.test(line) ||
        /^далее\s/iu.test(line);
    const isParamHeaderLine = (line) => {
        if (!line || line.includes("→") || isShortValueLabel(line))
            return false;
        if (/^[—–-]?\s*.+:\s*$/u.test(line) || /^[—–-]?\s*.+:\s+\S/u.test(line)) {
            return true;
        }
        // Без «:», но похоже на имя параметра (длинная строка), а не значение.
        return line.length >= 20;
    };
    const coeffBlocks = [];
    let active = null;
    for (const rawLine of text.split(/\r?\n/)) {
        const line = clean(rawLine);
        if (!line)
            continue;
        const colonHeader = line.match(/^[—–-]?\s*(.+?):\s*(.*)$/u);
        if (colonHeader?.[1] && !line.includes("→")) {
            active = {
                paramName: stripCoeffParamNamePrefix(colonHeader[1]),
                body: colonHeader[2] ? `${colonHeader[2]}\n` : "",
            };
            coeffBlocks.push(active);
            continue;
        }
        if (isParamHeaderLine(line) &&
            !line.includes(":") &&
            active &&
            active.body.includes("→")) {
            active = { paramName: stripCoeffParamNamePrefix(line), body: "" };
            coeffBlocks.push(active);
            continue;
        }
        if (!active) {
            active = { paramName: stripCoeffParamNamePrefix(line), body: "" };
            coeffBlocks.push(active);
            continue;
        }
        active.body += `${line}\n`;
    }
    for (const { paramName, body } of coeffBlocks) {
        if (!paramName || /^база/iu.test(paramName))
            continue;
        if (!body.includes("→"))
            continue;
        if (isShortValueLabel(paramName) || paramName.length < 3)
            continue;
        if (/делитель итога/iu.test(body) || isInitiativesDivisorParam(paramName)) {
            const values = [
                { label: "1", coefficient: 1 },
            ];
            for (let n = 2; n <= 99; n += 1) {
                values.push({
                    label: String(n),
                    coefficient: Math.round((1 / n) * 10000) / 10000,
                });
            }
            groups.push({ paramName, values });
            continue;
        }
        const values = [];
        for (const match of body.matchAll(/(?:^|[;\n])\s*([^→;\n]+?)\s*→\s*([^;|\n]+)/giu)) {
            const label = stripCoeffValueLabelPrefix(match[1] ?? "");
            const coefficient = parseCoeffArrowValue(match[2] ?? "");
            if (!label || coefficient == null)
                continue;
            if (/^далее\b/iu.test(label))
                continue;
            values.push({ label, coefficient });
        }
        // Значения без стрелки («Нет») — коэффициент 0, если явно не задан.
        for (const line of body.split(/\r?\n/)) {
            const text = clean(line);
            if (!text || text.includes("→"))
                continue;
            // `\b` не работает с кириллицей
            if (/^далее\s/iu.test(text) || /^далее$/iu.test(text))
                continue;
            if (/^[:—–\-]*$/u.test(text))
                continue;
            const label = stripCoeffValueLabelPrefix(text);
            if (!label || values.some((row) => row.label === label))
                continue;
            // Не тащим пояснительный текст / имена следующих параметров
            if (label.length > 60)
                continue;
            values.push({ label, coefficient: 0 });
        }
        if (/K\s*=\s*1\s*\+\s*\(N.?1\)\s*×\s*0\.75/iu.test(body)) {
            const maxCount = normalizeParamLabel(paramName).includes("модел") ? 15 : 99;
            for (let n = 2; n <= maxCount; n += 1) {
                const coefficient = Math.round((1 + (n - 1) * 0.75) * 10000) / 10000;
                if (!values.some((row) => row.label === String(n))) {
                    values.push({ label: String(n), coefficient });
                }
            }
        }
        // «1→1; 2→1; Далее везде 1» — добить остальные N тем же коэффициентом.
        const furtherMatch = body.match(/далее\s+везде\s*(-?\d+(?:[.,]\d+)?)/iu);
        if (furtherMatch?.[1]) {
            const further = Number(furtherMatch[1].replace(",", "."));
            if (Number.isFinite(further)) {
                const maxCount = normalizeParamLabel(paramName).includes("модел") ? 15 : 99;
                const start = Math.max(0, ...values
                    .map((row) => Number(row.label))
                    .filter((n) => Number.isFinite(n))) + 1;
                for (let n = Math.max(start, 1); n <= maxCount; n += 1) {
                    if (!values.some((row) => row.label === String(n))) {
                        values.push({ label: String(n), coefficient: further });
                    }
                }
            }
        }
        if (values.length > 0) {
            groups.push({ paramName, values });
        }
    }
    return groups;
}
function hasModelStreamTriggerOperator(part) {
    return /(?:=|≠|>=|<=|>|<)\s*/u.test(part);
}
function splitModelStreamTriggerClauses(raw) {
    if (!/\s+И\s+/u.test(raw))
        return [raw];
    const parts = [];
    let current = "";
    for (const segment of raw.split(/\s+И\s+/u)) {
        if (!current) {
            current = segment;
            continue;
        }
        if (hasModelStreamTriggerOperator(current)) {
            parts.push(current.trim());
            current = segment;
        }
        else {
            current += ` И ${segment}`;
        }
    }
    if (current.trim())
        parts.push(current.trim());
    return parts.length > 0 ? parts : [raw];
}
function parseSingleModelStreamTriggerRule(raw) {
    const part = clean(raw);
    if (!part)
        return null;
    if (/нет\s*[—–-]\s*работа\s+выводится\s+всегда/iu.test(part)) {
        return {
            paramName: v2_works_catalog_match_util_1.V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_NAME,
            operator: "exists",
            values: [],
        };
    }
    const eqQuoted = part.match(/^(.+?)\s*=\s*«([^»]+)»\s*$/u);
    if (eqQuoted?.[1] && eqQuoted[2]) {
        return {
            paramName: clean(eqQuoted[1]),
            operator: "=",
            values: [clean(eqQuoted[2])],
        };
    }
    const neqQuoted = part.match(/^(.+?)\s*≠\s*«([^»]+)»\s*$/u);
    if (neqQuoted?.[1] && neqQuoted[2]) {
        return {
            paramName: clean(neqQuoted[1]),
            operator: "!=",
            values: [clean(neqQuoted[2])],
        };
    }
    if (/≠\s*Пусто\s*$/iu.test(part)) {
        return {
            paramName: clean(part.replace(/≠\s*Пусто\s*$/iu, "")),
            operator: "exists",
            values: [],
        };
    }
    if (/>\s*0\s*$/u.test(part)) {
        return {
            paramName: clean(part.replace(/>\s*0\s*$/u, "")),
            operator: "exists",
            values: [],
        };
    }
    return parseCsvTriggerRules(part)[0] ?? null;
}
function parseModelStreamTriggerRules(raw) {
    const trimmed = raw.trim();
    if (!trimmed)
        return [];
    return splitModelStreamTriggerClauses(trimmed)
        .map((chunk) => parseSingleModelStreamTriggerRule(chunk))
        .filter((rule) => rule !== null);
}
/** Строка триггера из колонки «Результат выбора» (блок «Триггер: …»). */
function extractTriggerTextFromResultChoice(raw) {
    const normalized = raw.replace(/\r/g, "").trim();
    if (!normalized)
        return "";
    const match = normalized.match(/(?:^|\n)\s*Триггер:\s*([^\n]+)/iu);
    if (!match?.[1])
        return "";
    return clean(match[1].replace(/\s*\(иначе.*$/iu, ""));
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
    const numbered = [];
    const plainLines = [];
    for (const line of lines) {
        const text = clean(line);
        if (!text)
            continue;
        const m = text.match(/^\d+\.\s*(.+)$/);
        if (m?.[1]) {
            numbered.push(clean(m[1]));
            continue;
        }
        plainLines.push(text);
    }
    if (numbered.length > 0)
        return numbered;
    if (plainLines.length > 1)
        return plainLines;
    if (trimmed.includes(";")) {
        return trimmed
            .split(";")
            .map((part) => clean(part))
            .filter(Boolean);
    }
    return splitTopLevelList(raw);
}
function parseCsvTriggerRules(raw) {
    return splitTopLevelList(raw)
        .filter((rawParam) => !isCsvModelServiceCreateTrigger(rawParam))
        .map((rawParam) => {
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
        const control = rawParam.match(/^(Вид контроля)\s*[:=]\s*(.+)$/iu);
        if (control?.[1] && control[2]) {
            const mapped = mapCsvControlTypeValue(clean(control[2]).replace(/^[«"]|[»"]$/gu, ""));
            return {
                paramName: clean(control[1]),
                operator: "in",
                values: [mapped],
            };
        }
        if (/^(Необходимо подтвердить возможность интеграции|Необходима продуктивизация)$/iu.test(rawParam)) {
            return {
                paramName: rawParam,
                operator: "=",
                values: ["Да"],
            };
        }
        const equality = rawParam.match(/^(.+?)\s*=\s*(.+)$/u);
        if (equality?.[1] && equality[2]) {
            const value = clean(equality[2]).replace(/^[«"]|[»"]$/gu, "");
            return {
                paramName: clean(equality[1]),
                operator: "=",
                values: [value],
            };
        }
        if (/^Не понятно условие появления работ$/iu.test(rawParam)) {
            return {
                paramName: rawParam,
                operator: "unresolved",
                values: [],
            };
        }
        if (/нет\s*[—–-]\s*работа\s+выводится\s+всегда/iu.test(rawParam)) {
            return {
                paramName: v2_works_catalog_match_util_1.V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_NAME,
                operator: "exists",
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
    const idx = (prefix) => header.findIndex((h) => normalizeCsvHeader(h).startsWith(normalizeCsvHeader(prefix)));
    const cStream = idx("Стрим");
    const cComponent = idx("Арх");
    const cOriginal = idx("Название оригинальное");
    const cName = header.findIndex((h) => normalizeCsvHeader(h).includes("название в смарт-анкете"));
    const cContext = idx("Контекст");
    const cWorkType = idx("Тип работы");
    const cNorm = (() => {
        const byPresence = idx("Наличие норматива");
        if (byPresence >= 0)
            return byPresence;
        return header.findIndex((h) => normalizeCsvHeader(h).startsWith("норматив"));
    })();
    const cTrigger = idx("Параметр-триггер");
    const cResult = header.findIndex((h) => normalizeCsvHeader(h).includes("результат выбора"));
    const cLabor = idx("Параметры трудоемкости");
    const cFormula = idx("Формула");
    const cCoeffs = header.findIndex((h) => normalizeCsvHeader(h).includes("коэффициенты параметров"));
    return rows
        .slice(1)
        .map((r) => {
        const originalName = clean(r[cOriginal]);
        const smartName = clean(r[cName >= 0 ? cName : cOriginal]) || originalName;
        const stream = clean(r[cStream]);
        let stage = clean(r[cContext]);
        const e2e = resolveE2eWorkStageAndName(smartName);
        if (!stage)
            stage = e2e.stage;
        const baseName = e2e.name ||
            stripWorkStagePrefix(smartName) ||
            stripWorkStagePrefix(originalName) ||
            smartName ||
            originalName;
        const triggerFromResult = cResult >= 0
            ? extractTriggerTextFromResultChoice(r[cResult] ?? "")
            : "";
        const triggerRaw = triggerFromResult || (r[cTrigger] ?? "");
        const isModelStream = stream === "Модельный стрим" || stream === "Модельные стримы";
        const triggerRules = isModelStream
            ? parseModelStreamTriggerRules(triggerRaw)
            : parseCsvTriggerRules(triggerRaw);
        const laborCoefficientsRaw = cCoeffs >= 0 ? (r[cCoeffs] ?? "") : undefined;
        const laborFromCol = cLabor >= 0 ? parseLaborParamsNumbered(r[cLabor] ?? "") : [];
        const laborFromCoeffs = parseModelStreamLaborCoefficients(laborCoefficientsRaw ?? "").map((group) => group.paramName);
        // Колонка коэффициентов надёжнее при склеенных строках labor-параметров.
        let laborParams = laborFromCoeffs.length > 0
            ? [
                ...laborFromCoeffs,
                ...laborFromCol.filter((name) => {
                    const norm = normalizeParamLabel(name);
                    if (norm.length < 8)
                        return false;
                    if (laborFromCoeffs.some((coeffName) => normalizeParamLabel(coeffName) === norm)) {
                        return false;
                    }
                    // Склеенные «Новый вид контроля Применение…»
                    if (laborFromCoeffs.some((coeffName) => {
                        const other = normalizeParamLabel(coeffName);
                        return (other.length >= 12 &&
                            norm.includes(other) &&
                            norm !== other);
                    })) {
                        return false;
                    }
                    return true;
                }),
            ]
            : laborFromCol;
        const formulaRaw = cFormula >= 0 ? (r[cFormula] ?? "") : "";
        let coeffsRaw = laborCoefficientsRaw;
        // Формула ссылается на кол-во моделей, а таблицы нет → «везде 1».
        if (/[KК]\s*\(\s*кол-?во\s+моделей/iu.test(formulaRaw) &&
            !laborFromCoeffs.some((name) => normalizeParamLabel(name).includes("моделей"))) {
            const fill = "\nКоличество моделей:\n1→1\n2→1\nДалее везде 1\n";
            coeffsRaw = `${laborCoefficientsRaw ?? ""}${fill}`;
            if (!laborParams.some((name) => normalizeParamLabel(name).includes("моделей"))) {
                laborParams = [...laborParams, "Количество моделей"];
            }
        }
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
            laborParams,
            formulaRaw,
            laborCoefficientsRaw: coeffsRaw,
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
const CSV_PARAM_LABEL_ALIASES = {
    "класс модели": "класс моделей",
    "выбор класса моделей": "класс моделей",
    // CSV «Тип работ (модельного сервиса)» → modelService.workType (не algorithmType).
    "тип работ модельного сервиса": "тип работ",
    "кол во моделей": "количество моделей",
    "создание модельного сервиса": "модельный сервис",
};
/** Триггер «Создание модельного сервиса» = arch-count modelService ≥ 1, не param. */
function isCsvModelServiceCreateTrigger(paramName) {
    return normalizeParamLabel(paramName).includes("создание модельного сервиса");
}
const CONTROL_TYPE_VALUE_LABELS = {
    кд: "КД — Качество модельных данных",
    тм: "ТМ — Технический контроль",
    ок: "ОК — Оперативный контроль",
    ак: "АК — Аналитический контроль",
    кмз: "КМЗ — Контроль модельных значений",
    ов: "ОВ — Оценка влияния моделей",
};
function mapCsvControlTypeValue(raw) {
    const code = clean(raw)
        .toLowerCase()
        .replace(/ё/g, "е")
        .split(/[\s—–-]/u)[0]
        ?.trim();
    if (code && CONTROL_TYPE_VALUE_LABELS[code]) {
        return CONTROL_TYPE_VALUE_LABELS[code];
    }
    return clean(raw);
}
function resolveCsvParamCode(label, candidates, overrides = {}) {
    const trimmed = label.trim();
    if (!trimmed)
        return null;
    if (overrides[trimmed])
        return overrides[trimmed];
    const aliased = CSV_PARAM_LABEL_ALIASES[normalizeParamLabel(trimmed)];
    const norm = normalizeParamLabel(aliased ?? trimmed);
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
function fixMisplacedExcelRoundClose(flat) {
    // ОКРУГЛ.ВВЕРХ(expr); 2) → ОКРУГЛ.ВВЕРХ(expr; 2), с балансом скобок в expr.
    const kinds = ["ОКРУГЛ.ВВЕРХ", "ОКРУГЛ.ВНИЗ", "ОКРУГЛ"];
    for (const kind of kinds) {
        const startRe = new RegExp(`${kind}\\s*\\(`, "iu");
        const start = startRe.exec(flat);
        if (!start || start.index == null)
            continue;
        const openIdx = start.index + start[0].length - 1;
        let depth = 0;
        for (let i = openIdx; i < flat.length; i++) {
            const ch = flat[i];
            if (ch === "(")
                depth += 1;
            else if (ch === ")") {
                depth -= 1;
                if (depth !== 0)
                    continue;
                const after = flat.slice(i + 1);
                const misplaced = after.match(/^\s*;\s*([\d,.]+)\s*\)/u);
                if (!misplaced?.[1])
                    break;
                const expr = flat.slice(openIdx + 1, i).trim();
                const step = misplaced[1];
                const end = i + 1 + misplaced[0].length;
                return (flat.slice(0, start.index) +
                    `${kind}(${expr}; ${step})` +
                    flat.slice(end));
            }
        }
    }
    return flat;
}
function extractFormulaCoreFromCsvText(formulaRaw) {
    const flat = fixMisplacedExcelRoundClose(formulaRaw.replace(/\r/g, "").replace(/\n/g, " "));
    const ceilMatch = flat.match(/ОКРУГЛ\.ВВЕРХ\s*\(\s*(.+?)\s*;\s*([\d,.]+)\s*\)/iu);
    if (ceilMatch) {
        return {
            core: clean(ceilMatch[1]),
            roundingMode: "CEIL",
            roundingStep: excelRoundingArgumentToStep(Number(ceilMatch[2].replace(",", ".")) || 0.1),
        };
    }
    const floorMatch = flat.match(/ОКРУГЛ\.ВНИЗ\s*\(\s*(.+?)\s*;\s*([\d,.]+)\s*\)/iu);
    if (floorMatch) {
        return {
            core: clean(floorMatch[1]),
            roundingMode: "FLOOR",
            roundingStep: excelRoundingArgumentToStep(Number(floorMatch[2].replace(",", ".")) || 0.1),
        };
    }
    const roundMatch = flat.match(/ОКРУГЛ\s*\(\s*(.+?)\s*;\s*([\d,.]+)\s*\)/iu);
    if (roundMatch) {
        return {
            core: clean(roundMatch[1]),
            roundingMode: "ROUND",
            roundingStep: excelRoundingArgumentToStep(Number(roundMatch[2].replace(",", ".")) || 0.1),
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
    const named = flat.match(/^(?:Оценка|Итог(?:\s*\([^)]*\))?|ЧД\s*\([^)]*\))\s*=\s*(.+)$/iu);
    if (named?.[1]) {
        return {
            core: clean(named[1]),
            roundingMode: "CEIL",
            roundingStep: 0.1,
        };
    }
    return null;
}
function normalizeFormulaCoreAliases(core) {
    // `\b` ненадёжен для кириллицы — якорим вручную.
    return clean(core)
        .replace(/(^|[^а-яёa-z0-9_])баз[аы](?=$|[^а-яёa-z0-9_])/giu, "$1Норматив")
        .replace(/\*/g, "×")
        .replace(/К\s*=\s*1\s*\[/giu, "К[");
}
function extractBracketCoeffLabel(raw) {
    const text = clean(raw);
    const bracket = text.match(/^[KК]\s*\[\s*(.+?)\s*\]$/iu);
    if (bracket?.[1]) {
        return clean(bracket[1]).replace(/\s*=\s*.+$/u, "").trim() || null;
    }
    if (!/^[KК]\s*\(/iu.test(text))
        return null;
    const start = text.indexOf("(");
    let depth = 0;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (ch === "(")
            depth += 1;
        else if (ch === ")") {
            depth -= 1;
            if (depth === 0) {
                const label = clean(text.slice(start + 1, i));
                return label.replace(/\s*=\s*.+$/u, "").trim() || null;
            }
        }
    }
    return null;
}
function splitTopLevelPlus(expression) {
    const parts = [];
    let current = "";
    let depth = 0;
    for (const ch of expression) {
        if (ch === "(" || ch === "[")
            depth += 1;
        else if ((ch === ")" || ch === "]") && depth > 0)
            depth -= 1;
        if (ch === "+" && depth === 0) {
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
function resolveCoeffOrArchToken(label, resolveParamCode, unmatchedParams, preferLaborLabels) {
    const norm = normalizeParamLabel(label);
    const aliased = CSV_PARAM_LABEL_ALIASES[norm] != null
        ? normalizeParamLabel(CSV_PARAM_LABEL_ALIASES[norm])
        : norm;
    // Явная таблица коэффициентов в CSV важнее дефолтного архкоэф(Модели; …).
    if (preferLaborLabels?.has(norm) ||
        preferLaborLabels?.has(aliased)) {
        const code = resolveParamCode(label);
        if (!code) {
            unmatchedParams.push(label);
            return null;
        }
        return `коэф(${code})`;
    }
    const arch = resolveArchCountFormulaToken(label);
    if (arch)
        return arch.token;
    const code = resolveParamCode(label);
    if (!code) {
        unmatchedParams.push(label);
        return null;
    }
    return `коэф(${code})`;
}
function buildFormulaTextFromCsvCore(core, resolveParamCode, preferLaborLabels) {
    const unmatchedParams = [];
    const skippedSpecial = [];
    const normalized = normalizeFormulaCoreAliases(core);
    const resolveToken = (label, bucket = unmatchedParams) => resolveCoeffOrArchToken(label, resolveParamCode, bucket, preferLaborLabels);
    if (/^Норматив\s*$/iu.test(normalized)) {
        return { formulaText: "N", unmatchedParams, skippedSpecial };
    }
    if (/[Σ∑]|Норматив_класса|ПК\s*К\//iu.test(normalized)) {
        skippedSpecial.push(normalized);
        return { formulaText: "N", unmatchedParams, skippedSpecial };
    }
    const additiveParen = normalized.match(/^Норматив\s*×\s*\((.+)\)$/iu);
    if (additiveParen?.[1] && /\+/u.test(additiveParen[1])) {
        const terms = splitTopLevelPlus(additiveParen[1]);
        const tokens = [];
        const localUnmatched = [];
        for (const term of terms) {
            const label = extractBracketCoeffLabel(term) ??
                term.match(/^\[(.+)\]$/u)?.[1]?.trim() ??
                null;
            if (!label) {
                localUnmatched.push(term);
                continue;
            }
            const token = resolveToken(label, localUnmatched);
            if (token)
                tokens.push(token);
        }
        if (tokens.length > 0 && localUnmatched.length === 0) {
            return {
                formulaText: `N × (${tokens.join(" + ")})`,
                unmatchedParams,
                skippedSpecial,
            };
        }
    }
    if (/\+\s*\(/u.test(normalized) && /\(Норматив\s*×/iu.test(normalized)) {
        const terms = [...normalized.matchAll(/\(([^)]+)\)/gu)].map((m) => clean(m[1] ?? ""));
        const tokens = [];
        const localUnmatched = [];
        for (const term of terms) {
            const mul = term.match(/^Норматив\s*×\s*(.+)$/iu);
            const operand = clean(mul?.[1] ?? term);
            const label = extractBracketCoeffLabel(operand) ??
                operand.match(/^\[(.+)\]$/u)?.[1]?.trim() ??
                null;
            if (!label) {
                localUnmatched.push(term);
                continue;
            }
            const token = resolveToken(label, localUnmatched);
            if (token)
                tokens.push(`N × ${token}`);
        }
        if (tokens.length > 0 && localUnmatched.length === 0) {
            return {
                formulaText: tokens.join(" + "),
                unmatchedParams,
                skippedSpecial,
            };
        }
    }
    if (/[KК]\s*[\[(]/iu.test(normalized)) {
        return buildModelStreamFormulaTextFromCore(normalized, resolveParamCode, preferLaborLabels);
    }
    const parts = normalized.split("×").map((part) => clean(part));
    const exprParts = ["N"];
    for (const part of parts) {
        if (!part || /^Норматив\s*$/iu.test(part))
            continue;
        const bracket = part.match(/^\[(.+)\]$/);
        if (bracket?.[1]) {
            const label = bracket[1].trim();
            const token = resolveToken(label);
            if (token)
                exprParts.push(token);
            continue;
        }
        if (/^\d+(?:[.,]\d+)?$/u.test(part)) {
            exprParts.push(part.replace(",", "."));
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
function splitModelStreamFormulaOperands(core) {
    const operands = [];
    let current = "";
    let parenDepth = 0;
    let bracketDepth = 0;
    for (const ch of core.replace(/\r/g, "")) {
        if (ch === "(")
            parenDepth += 1;
        else if (ch === ")" && parenDepth > 0)
            parenDepth -= 1;
        else if (ch === "[")
            bracketDepth += 1;
        else if (ch === "]" && bracketDepth > 0)
            bracketDepth -= 1;
        const isMul = ch === "×" && parenDepth === 0 && bracketDepth === 0;
        const isDiv = ch === "÷" && parenDepth === 0 && bracketDepth === 0;
        if (isMul || isDiv) {
            const part = clean(current);
            if (part)
                operands.push(part);
            operands.push(isDiv ? "__DIV__" : "__MUL__");
            current = "";
            continue;
        }
        current += ch;
    }
    const tail = clean(current);
    if (tail)
        operands.push(tail);
    return operands;
}
function buildModelStreamFormulaTextFromCore(core, resolveParamCode, preferLaborLabels) {
    const unmatchedParams = [];
    const skippedSpecial = [];
    const operands = splitModelStreamFormulaOperands(normalizeFormulaCoreAliases(core)
        .replace(/^\d+(?:[.,]\d+)?\s*×\s*/u, "")
        .replace(/^Норматив\s*×\s*/iu, ""));
    const exprParts = ["N"];
    let pendingOp = "*";
    const resolveToken = (label, bucket = unmatchedParams) => resolveCoeffOrArchToken(label, resolveParamCode, bucket, preferLaborLabels);
    for (const operand of operands) {
        if (operand === "__MUL__") {
            pendingOp = "*";
            continue;
        }
        if (operand === "__DIV__") {
            pendingOp = "/";
            continue;
        }
        const bracketLabel = extractBracketCoeffLabel(operand);
        if (bracketLabel) {
            const token = resolveToken(bracketLabel);
            if (!token)
                continue;
            if (pendingOp === "/") {
                if (isInitiativesDivisorParam(bracketLabel)) {
                    exprParts.push(token);
                }
                else {
                    exprParts.push(`/ ${token}`);
                }
                pendingOp = "*";
            }
            else {
                exprParts.push(token);
            }
            continue;
        }
        // (К(a) + К(b) + …) — сумма коэффициентов внутри множителя
        const additiveGroup = operand.match(/^\((.+)\)$/u);
        if (additiveGroup?.[1] && /\+/u.test(additiveGroup[1])) {
            const terms = splitTopLevelPlus(additiveGroup[1]);
            const tokens = [];
            const localUnmatched = [];
            for (const term of terms) {
                const label = extractBracketCoeffLabel(term) ??
                    term.match(/^\[(.+)\]$/u)?.[1]?.trim() ??
                    null;
                if (!label) {
                    localUnmatched.push(term);
                    continue;
                }
                const token = resolveToken(label, localUnmatched);
                if (token)
                    tokens.push(token);
            }
            unmatchedParams.push(...localUnmatched);
            if (tokens.length > 0 && localUnmatched.length === 0) {
                exprParts.push(`(${tokens.join(" + ")})`);
                if (pendingOp === "/")
                    pendingOp = "*";
            }
            continue;
        }
        if (/^\d+(?:[.,]\d+)?$/u.test(operand)) {
            exprParts.push(operand.replace(",", "."));
            if (pendingOp === "/")
                pendingOp = "*";
            continue;
        }
        const bareLabel = operand.replace(/^К\s*\(/iu, "").replace(/\)\s*$/u, "");
        const label = clean(bareLabel);
        const token = resolveToken(label);
        if (!token) {
            if (!unmatchedParams.includes(operand))
                unmatchedParams.push(operand);
            continue;
        }
        if (pendingOp === "/") {
            if (isInitiativesDivisorParam(label)) {
                exprParts.push(token);
            }
            else {
                exprParts.push(`/ ${token}`);
            }
            pendingOp = "*";
        }
        else {
            exprParts.push(token);
        }
    }
    let formulaText = "N";
    for (let i = 1; i < exprParts.length; i += 1) {
        const part = exprParts[i] ?? "";
        if (part.startsWith("/ ")) {
            formulaText += ` ${part}`;
        }
        else {
            formulaText += ` * ${part}`;
        }
    }
    formulaText = formulaText.replace(/\s+/g, " ").trim();
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
    // Только параметры с явной таблицей коэффициентов — иначе «Кол-во моделей»
    // без таблицы уйдёт в архкоэф, а не в коэф(slug) без bindings.
    const preferLaborLabels = new Set(parseModelStreamLaborCoefficients(row.laborCoefficientsRaw ?? "")
        .map((group) => normalizeParamLabel(group.paramName))
        .flatMap((norm) => {
        const alias = CSV_PARAM_LABEL_ALIASES[norm];
        return alias ? [norm, normalizeParamLabel(alias)] : [norm];
    }));
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
    const built = buildFormulaTextFromCsvCore(extracted.core, resolve, preferLaborLabels);
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
    const explicitCoeffParams = new Set(parseModelStreamLaborCoefficients(row.laborCoefficientsRaw ?? "").map((group) => normalizeParamLabel(group.paramName)));
    const laborParams = (build.inferredLaborParams.length > 0
        ? build.inferredLaborParams
        : row.laborParams).filter((paramName) => {
        const norm = normalizeParamLabel(paramName);
        if (explicitCoeffParams.has(norm))
            return true;
        return !resolveArchCountFormulaToken(paramName);
    });
    const allowedParamCodes = new Set(laborParams.flatMap((paramName) => {
        const slug = (0, v2_param_slug_util_1.slugParamCode)(paramName);
        const aliasSlug = (0, v2_param_slug_util_1.slugParamCode)(CSV_PARAM_LABEL_ALIASES[normalizeParamLabel(paramName)] ?? paramName);
        // Коды из кандидатов каталога (modelClass и т.п.), без overrides —
        // override, дающий чужой код, остаётся disconnect.
        const catalogCode = resolveCsvParamCode(paramName, candidates, {});
        return catalogCode
            ? [slug, aliasSlug, catalogCode]
            : [slug, aliasSlug];
    }));
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
            laborCoefficients: row.laborCoefficientsRaw?.trim()
                ? parseModelStreamLaborCoefficients(row.laborCoefficientsRaw)
                : parseCsvLaborCoefficients(row.formulaRaw, row.component),
            triggerParams: row.triggerParams,
            triggerRules: row.triggerRules.map((rule) => enrichFactorySnapshotTriggerRule(rule)),
            norm: row.norm,
            normRaw: row.normRaw,
            workType: row.workType || undefined,
        },
        build,
    };
}
/** Нормализует triggerRules factory snapshot: valueCode/valueLabel для boolean «Да»/«Нет». */
function enrichFactorySnapshotTriggerRule(rule) {
    const operator = rule.operator === "exists" || rule.operator === "unresolved"
        ? rule.operator
        : (rule.operator ?? "=");
    if (operator === "exists" || operator === "unresolved") {
        return { ...rule, operator };
    }
    const normalized = (0, v2_works_catalog_match_util_1.normalizeTypicalWorkTriggerRuleForMatch)({
        paramCode: rule.paramCode?.trim() || (0, v2_param_slug_util_1.slugParamCode)(rule.paramName),
        paramName: rule.paramName,
        operator,
        valueCode: rule.valueCode ?? null,
        valueLabel: rule.valueLabel ?? null,
        values: rule.values?.length ? rule.values : undefined,
    });
    return {
        ...rule,
        operator: normalized.operator,
        valueCode: normalized.valueCode,
        valueLabel: normalized.valueLabel,
        values: rule.values ??
            (normalized.valueLabel ? [normalized.valueLabel] : undefined),
    };
}
function validateImportedFormulaText(formulaText) {
    return (0, v2_work_formula_util_1.parseWorkFormulaText)(formulaText).error;
}
