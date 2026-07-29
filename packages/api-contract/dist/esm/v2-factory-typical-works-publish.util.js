import { tokensToText } from "./v2-work-formula.util";
import { resolveActiveNormOnDate, } from "./v2-typical-work.types";
const CATALOG_TRIGGER_OPS = new Set(["=", "!=", "in"]);
const LEGACY_SOURCE_STREAMS = new Set(["ИД. Внутренний", "ИД. Внешний"]);
/** Канонический стрим источников в catalog snapshot (вместо legacy ИД. Внутр/Внеш). */
export const FACTORY_CATALOG_SOURCE_STREAM = "Источники данных";
/**
 * Нормализует стрим для ключа upsert catalog.
 * Legacy `ИД. Внутренний` / `ИД. Внешний` → `Источники данных`, иначе не плодим дубли.
 */
export function normalizePublishCatalogStream(stream) {
    const value = stream.trim();
    if (!value)
        return value;
    if (LEGACY_SOURCE_STREAMS.has(value))
        return FACTORY_CATALOG_SOURCE_STREAM;
    if (value.toLowerCase() === FACTORY_CATALOG_SOURCE_STREAM.toLowerCase()) {
        return FACTORY_CATALOG_SOURCE_STREAM;
    }
    return value;
}
export function extractPublishWorkStage(name) {
    const trimmed = name.trim();
    const legacy = trimmed.match(/^Этап[\s_]+(\d+)(?:\.|\s|$)/iu);
    if (legacy?.[1])
        return `Этап ${legacy[1]}`;
    const e2e = trimmed.match(/^(\d+[ABab])\.\s+/u);
    if (e2e?.[1])
        return e2e[1].toUpperCase();
    // Только двузначные e2e-префиксы (01/02/05…), не «1. Качество модельных данных».
    const e2eNumeric = trimmed.match(/^(\d{2})\.\s+/u);
    if (e2eNumeric?.[1])
        return e2eNumeric[1];
    if (/^AutoML:\s*/iu.test(trimmed))
        return "AutoML";
    return null;
}
export function normalizePublishArchComponent(raw) {
    const value = raw.trim();
    if (value.includes("Витрина") || value.includes("Объект")) {
        return "Объект / Витрина данных";
    }
    if (value.includes("Процесс")) {
        return "Процесс обработки данных";
    }
    if (value.includes("Система")) {
        return "Система-источник";
    }
    if (value.includes("Модельный")) {
        return "Модельный сервис";
    }
    if (value === "Модель") {
        return "Модель";
    }
    return value;
}
export function buildFactoryCatalogRowKey(row) {
    return [
        normalizePublishArchComponent(row.component),
        row.stage.trim(),
        row.name.trim(),
        normalizePublishCatalogStream(row.stream),
    ].join("|");
}
function catalogRowFingerprint(row) {
    return JSON.stringify({
        stream: row.stream,
        component: row.component,
        stage: row.stage,
        name: row.name,
        originalName: row.originalName,
        workType: row.workType,
        norm: row.norm,
        triggerRules: row.triggerRules ?? [],
        triggerArchCount: row.triggerArchCount ?? null,
        laborParams: row.laborParams,
        laborCoefficients: row.laborCoefficients ?? [],
        laborArchCounts: row.laborArchCounts ?? [],
        formulaText: row.formulaText ?? "",
        roundingMode: row.roundingMode ?? "CEIL",
        roundingStep: row.roundingStep ?? null,
    });
}
function mapTriggerOperator(op) {
    if (op === "=" || op === "!=" || op === "in")
        return op;
    return null;
}
function ruleToCatalogTrigger(rule) {
    const operator = mapTriggerOperator(rule.operator);
    if (!operator)
        return null;
    const paramName = (rule.paramName ?? rule.paramCode).trim();
    if (!paramName)
        return null;
    const multi = rule.values
        ?.map((v) => v.label?.trim() || v.code?.trim() || "")
        .filter(Boolean) ?? [];
    const values = multi.length > 0
        ? multi
        : rule.valueLabel?.trim()
            ? [rule.valueLabel.trim()]
            : rule.valueCode?.trim()
                ? [rule.valueCode.trim()]
                : [];
    return {
        paramName,
        paramCode: rule.paramCode?.trim() || undefined,
        schemaFieldUid: rule.schemaFieldUid?.trim() || undefined,
        operator,
        values,
        ...(rule.valueCode?.trim()
            ? { valueCode: rule.valueCode.trim() }
            : {}),
        ...(rule.valueLabel?.trim()
            ? { valueLabel: rule.valueLabel.trim() }
            : {}),
    };
}
function stripPublishWorkStagePrefix(name) {
    const trimmed = name.trim();
    const stage = extractPublishWorkStage(trimmed);
    if (!stage)
        return trimmed;
    if (stage === "AutoML") {
        return trimmed.replace(/^AutoML:\s*/iu, "").trim();
    }
    if (stage.startsWith("Этап ")) {
        return trimmed.replace(/^Этап[\s_]+\d+\.\s*/u, "").trim() || trimmed;
    }
    const escaped = stage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return (trimmed.replace(new RegExp(`^${escaped}\\.\\s*`, "iu"), "").trim() ||
        trimmed);
}
function cardToCatalogRow(card, coverageDate, dropped) {
    const stage = extractPublishWorkStage(card.name) ?? "";
    const name = stripPublishWorkStagePrefix(card.name).trim() || card.name.trim();
    const component = normalizePublishArchComponent(card.archComponentType);
    const stream = normalizePublishCatalogStream(card.streamExecutor);
    const norm = resolveActiveNormOnDate(card.norms, stream, coverageDate) ??
        resolveActiveNormOnDate(card.norms, card.streamExecutor.trim(), coverageDate);
    if (card.triggerMode === "formula") {
        dropped.push({
            workId: card.id,
            workName: card.name,
            streamExecutor: stream,
            field: "triggerMode/triggerFormula",
            reason: "Каталог поддерживает только simple triggerRules; formula-режим не переносится",
        });
    }
    const triggerRules = [];
    for (const rule of card.rules) {
        if (rule.streamExecutor.trim() &&
            normalizePublishCatalogStream(rule.streamExecutor) !== stream) {
            continue;
        }
        const mapped = ruleToCatalogTrigger(rule);
        if (!mapped) {
            if (!CATALOG_TRIGGER_OPS.has(rule.operator)) {
                dropped.push({
                    workId: card.id,
                    workName: card.name,
                    streamExecutor: stream,
                    field: `rules[${rule.paramCode}].operator`,
                    reason: `Оператор «${rule.operator}» не поддерживается catalog snapshot`,
                });
            }
            continue;
        }
        triggerRules.push(mapped);
    }
    const laborParams = [];
    const laborCoefficients = [];
    for (const group of card.laborParams) {
        const paramName = group.paramName?.trim() || group.paramCode.trim() || "";
        if (!paramName)
            continue;
        laborParams.push(paramName);
        const kind = group.kind === "any_of" ? "any_of" : "by_value";
        if (kind === "any_of" && group.anyOf) {
            laborCoefficients.push({
                paramName,
                paramCode: group.paramCode,
                schemaFieldUid: group.schemaFieldUid?.trim() || undefined,
                kind: "any_of",
                values: [],
                anyOf: {
                    valueCodes: [...group.anyOf.valueCodes],
                    valueLabels: [...group.anyOf.valueLabels],
                    coeffOn: group.anyOf.coeffOn,
                    coeffOff: group.anyOf.coeffOff,
                },
            });
            continue;
        }
        laborCoefficients.push({
            paramName,
            paramCode: group.paramCode,
            schemaFieldUid: group.schemaFieldUid?.trim() || undefined,
            kind: "by_value",
            values: group.coefficients
                .filter((row) => !row.streamExecutor || row.streamExecutor === stream)
                .map((row) => {
                const label = row.valueLabel?.trim() || row.valueCode?.trim() || "";
                const code = row.valueCode?.trim();
                return {
                    label,
                    ...(code ? { code } : {}),
                    coefficient: row.coefficient,
                };
            })
                .filter((row) => row.label.length > 0),
        });
    }
    const formulaText = card.formula.text?.trim() ||
        tokensToText(card.formula.tokens) ||
        "N";
    const triggerParams = triggerRules.map((r) => r.paramName);
    const triggerParam = triggerParams[0] ?? "";
    return {
        stream,
        component,
        stage,
        name,
        originalName: name,
        workType: card.workType?.trim() || "Опциональная",
        norm,
        normRaw: norm != null ? String(norm) : "",
        triggerParam,
        triggerParams,
        ...(triggerRules.length > 0 ? { triggerRules } : {}),
        ...(card.triggerArchCount?.kind
            ? {
                triggerArchCount: {
                    kind: card.triggerArchCount.kind,
                    steps: card.triggerArchCount.steps.map((s) => ({
                        count: s.count,
                        coefficient: s.coefficient,
                    })),
                    combinator: card.triggerArchCount.combinator ?? "and",
                },
            }
            : {}),
        laborParams,
        ...(laborCoefficients.length > 0 ? { laborCoefficients } : {}),
        ...(card.laborArchCounts?.length
            ? {
                laborArchCounts: card.laborArchCounts.map((arch) => ({
                    kind: arch.kind,
                    paramName: arch.paramName ?? null,
                    steps: arch.steps.map((step) => ({
                        count: step.count,
                        coefficient: step.coefficient,
                        ...(step.operator ? { operator: step.operator } : {}),
                        ...(step.coefficientFormula
                            ? { coefficientFormula: step.coefficientFormula }
                            : {}),
                    })),
                })),
            }
            : {}),
        formulaText,
        roundingMode: card.rounding.mode,
        roundingStep: card.rounding.mode === "NONE" ? null : card.rounding.step,
    };
}
function buildRegistryFromCards(cards, coverageDate) {
    const byId = new Map();
    for (const card of cards) {
        const stream = card.streamExecutor.trim();
        if (!stream)
            continue;
        const existing = byId.get(card.id);
        const norm = resolveActiveNormOnDate(card.norms, stream, coverageDate);
        if (!existing) {
            byId.set(card.id, {
                id: card.id,
                name: card.name.trim(),
                archComponentType: normalizePublishArchComponent(card.archComponentType),
                workType: card.workType?.trim() || null,
                streams: new Set([stream]),
                normsByStream: { [stream]: norm },
            });
            continue;
        }
        existing.streams.add(stream);
        existing.normsByStream[stream] = norm;
        if (card.name.trim())
            existing.name = card.name.trim();
        if (card.workType?.trim())
            existing.workType = card.workType.trim();
    }
    return [...byId.values()]
        .map((row) => ({
        id: row.id,
        name: row.name,
        archComponentType: row.archComponentType,
        workType: row.workType,
        streams: [...row.streams].sort((a, b) => a.localeCompare(b, "ru")),
        normsByStream: row.normsByStream,
    }))
        .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}
/**
 * Собирает registry + catalog rows из полных карточек и существующего каталога.
 * Catalog: upsert по (component, stage, name, stream); чужие строки сохраняются.
 * Registry: полная замена списком из dump.
 */
export function publishFactoryTypicalWorksBundle(input) {
    const coverageDate = input.coverageDate?.slice(0, 10) ??
        new Date().toISOString().slice(0, 10);
    const dropped = [];
    const registryWorks = buildRegistryFromCards(input.cards, coverageDate);
    const publishedByKey = new Map();
    for (const card of input.cards) {
        if (!card.streamExecutor?.trim())
            continue;
        const row = cardToCatalogRow(card, coverageDate, dropped);
        publishedByKey.set(buildFactoryCatalogRowKey(row), row);
    }
    let catalogAdded = 0;
    let catalogUpdated = 0;
    let catalogUnchanged = 0;
    const usedExistingKeys = new Set();
    const emittedKeys = new Set();
    const nextCatalog = [];
    for (const existing of input.existingCatalog) {
        const key = buildFactoryCatalogRowKey(existing);
        // Legacy ИД.Внутр + ИД.Внеш схлопываются в один ключ — не дублируем.
        if (emittedKeys.has(key))
            continue;
        const published = publishedByKey.get(key);
        if (!published) {
            emittedKeys.add(key);
            nextCatalog.push(existing);
            continue;
        }
        usedExistingKeys.add(key);
        emittedKeys.add(key);
        if (catalogRowFingerprint(existing) === catalogRowFingerprint(published)) {
            catalogUnchanged += 1;
            // Берём published даже при равном fingerprint — нормализует stream.
            nextCatalog.push(published);
        }
        else {
            catalogUpdated += 1;
            nextCatalog.push(published);
        }
    }
    for (const [key, row] of publishedByKey) {
        if (usedExistingKeys.has(key))
            continue;
        catalogAdded += 1;
        emittedKeys.add(key);
        nextCatalog.push(row);
    }
    const preservedKeys = new Set(input.existingCatalog
        .map((row) => buildFactoryCatalogRowKey(row))
        .filter((key) => !publishedByKey.has(key)));
    const catalogPreserved = preservedKeys.size;
    const legacyStreamCatalogRows = nextCatalog.filter((row) => LEGACY_SOURCE_STREAMS.has(row.stream.trim())).length;
    return {
        registry: {
            meta: {
                snapshotVersion: 1,
                factoryBundle: true,
                description: `Типовые работы эталонной схемы (templateId=${input.templateId})`,
                sourceTemplateId: input.templateId,
                ...(input.templateName?.trim()
                    ? { sourceTemplateName: input.templateName.trim() }
                    : {}),
                counts: { works: registryWorks.length },
            },
            works: registryWorks,
        },
        catalogRows: nextCatalog,
        report: {
            registryWorks: registryWorks.length,
            catalogAdded,
            catalogUpdated,
            catalogUnchanged,
            catalogPreserved,
            dropped,
            legacyStreamCatalogRows,
        },
    };
}
/** Пересчёт meta.counts / streams / components / stages для catalog snapshot. */
export function rebuildFactoryCatalogSnapshotMeta(typicalWorks, previous) {
    const streams = [
        ...new Set(typicalWorks.map((w) => w.stream.trim()).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b, "ru"));
    const components = [
        ...new Set(typicalWorks.map((w) => w.component.trim()).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b, "ru"));
    const stages = [
        ...new Set(typicalWorks.map((w) => w.stage.trim()).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b, "ru"));
    return {
        snapshotVersion: previous?.snapshotVersion ?? 2,
        factoryBundle: true,
        description: previous?.description ??
            "Заводской снимок каталога типовых работ и методологических параметров. Редактируется в репозитории; не генерируется из внешних CSV.",
        counts: {
            typicalWorks: typicalWorks.length,
            typicalWorksWithNorm: typicalWorks.filter((w) => w.norm != null).length,
            streams: streams.length,
            components: components.length,
            stages: stages.length,
            typicalWorksWithFormula: typicalWorks.filter((w) => Boolean(w.formulaText?.trim()) && w.formulaText?.trim() !== "N").length,
        },
        streams,
        components,
        stages,
    };
}
