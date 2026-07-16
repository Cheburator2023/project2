import { slugParamCode } from "./v2-param-slug.util";
import { V2_ARCH_COMPONENT_LABELS, resolveV2AnketaArchComponent, } from "./v2-anketa-section-ui.util";
import { stripParamNameSourceKeys } from "./v2-work-param-source-keys.util";
import { findWorkSchemaParameter, resolveWorkSchemaParamForRule, } from "./v2-work-schema-params-match.util";
import { catalogValueMatchesTriggerRule, isBrokenTypicalWorkTriggerRef, isControlTypeTriggerParam, isPresenceOnlyTriggerRule, isSourceTypeTriggerParam, } from "./v2-works-catalog-match.util";
import { collectUnavailableLaborCoefficientIssues } from "./v2-typical-work-validation.util";
import { isArchCountLaborParamName } from "./v2-labor-arch-count.util";
function schemaNodeType(node) {
    if (!node)
        return null;
    if (typeof node.type === "string")
        return node.type;
    if (Array.isArray(node.type)) {
        return node.type.find((value) => value !== "null") ?? node.type[0] ?? null;
    }
    if (Array.isArray(node.enum) && node.enum.length > 0)
        return "string";
    return null;
}
function objectItemsSchema(node) {
    if (schemaNodeType(node) !== "array")
        return null;
    const items = node.items;
    if (!items)
        return null;
    if (Array.isArray(items))
        return items[0] ?? null;
    return items;
}
function readUiBranch(uiSchema, segments) {
    if (!uiSchema)
        return undefined;
    let cur = uiSchema;
    for (const segment of segments) {
        if (segment === "items") {
            cur = cur?.items;
            continue;
        }
        cur = cur?.[segment];
    }
    return cur && typeof cur === "object" && !Array.isArray(cur)
        ? cur
        : undefined;
}
function resolveFieldArchComponent(uiSchema, segments) {
    for (let length = segments.length; length >= 0; length--) {
        const branch = readUiBranch(uiSchema, segments.slice(0, length));
        const arch = resolveV2AnketaArchComponent(branch);
        if (arch)
            return V2_ARCH_COMPONENT_LABELS[arch];
    }
    return null;
}
function valuesFromSchemaNode(node) {
    if (!node)
        return [];
    const enumValues = Array.isArray(node.enum)
        ? node.enum.filter((value) => typeof value === "string")
        : [];
    if (enumValues.length === 0)
        return [];
    const enumNames = Array.isArray(node.enumNames)
        ? node.enumNames.filter((value) => typeof value === "string")
        : [];
    return enumValues.map((code, index) => ({
        code,
        label: enumNames[index] ?? code,
    }));
}
function isLeafWorkSchemaField(node) {
    if (!node)
        return false;
    const type = schemaNodeType(node);
    if (!type)
        return false;
    if (type === "object")
        return false;
    if (type === "array") {
        const items = objectItemsSchema(node);
        return Boolean(items && valuesFromSchemaNode(items).length > 0);
    }
    if (valuesFromSchemaNode(node).length > 0)
        return true;
    return ["string", "number", "integer", "boolean"].includes(type);
}
function walkSchemaFields(schema, uiSchema, pointer, segments, out) {
    const node = segments.length
        ? segments.reduce((acc, segment) => {
            if (!acc)
                return undefined;
            if (segment === "items") {
                const items = objectItemsSchema(acc);
                return items ?? undefined;
            }
            return acc.properties?.[segment];
        }, schema)
        : schema;
    if (!node)
        return;
    if (isLeafWorkSchemaField(node)) {
        const key = segments.at(-1);
        if (!key)
            return;
        const title = typeof node.title === "string" ? node.title.trim() : key;
        const uiBranch = readUiBranch(uiSchema, segments);
        const uiOptions = uiBranch?.["ui:options"];
        let schemaFieldUid = null;
        let dictionaryCode = null;
        if (uiOptions && typeof uiOptions === "object" && !Array.isArray(uiOptions)) {
            const options = uiOptions;
            if (typeof options.schemaFieldUid === "string") {
                schemaFieldUid = options.schemaFieldUid.trim() || null;
            }
            if (typeof options.dictionaryCode === "string") {
                dictionaryCode = options.dictionaryCode.trim() || null;
            }
        }
        const fieldType = schemaNodeType(node);
        const enumSource = fieldType === "array" ? (objectItemsSchema(node) ?? undefined) : node;
        out.push({
            code: key,
            name: title,
            description: pointer,
            archComponent: resolveFieldArchComponent(uiSchema, segments),
            schemaFieldUid,
            schemaPointer: pointer,
            sourceKeys: [key],
            values: valuesFromSchemaNode(enumSource),
            ...(dictionaryCode ? { dictionaryCode } : {}),
        });
        return;
    }
    if (schemaNodeType(node) === "object" && node.properties) {
        for (const key of Object.keys(node.properties)) {
            const childPointer = pointer === "/" ? `/${key}` : `${pointer.replace(/\/$/, "")}/${key}`;
            walkSchemaFields(schema, uiSchema, childPointer, [...segments, key], out);
        }
    }
    const itemsSchema = objectItemsSchema(node);
    if (itemsSchema?.properties) {
        for (const key of Object.keys(itemsSchema.properties)) {
            const childPointer = `${pointer.replace(/\/$/, "")}/items/${key}`;
            walkSchemaFields(schema, uiSchema, childPointer, [...segments, "items", key], out);
        }
    }
}
/** Строит список полей схемы шаблона для сопоставления с legacy-кодами работ. */
export function buildWorkSchemaParamsFromTemplate(params) {
    const out = [];
    walkSchemaFields(params.jsonSchema, params.uiSchema, "/", [], out);
    return out.sort((a, b) => a.name.localeCompare(b.name, "ru"));
}
function matchesMethodologyCatalogParam(rule, methodologyParams) {
    if (!methodologyParams?.length)
        return false;
    return Boolean(findWorkSchemaParameter(methodologyParams, rule.paramCode, rule.paramName));
}
export function enrichWorkSchemaParamsWithCatalogAliases(schemaParams, catalog) {
    return schemaParams.map((schemaParam) => {
        const previousCode = findCatalogPreviousCodeForSchemaParam(catalog, schemaParam);
        const nameSlug = slugParamCode(stripParamNameSourceKeys(schemaParam.name).trim());
        const sourceKeys = new Set(schemaParam.sourceKeys ?? [schemaParam.code]);
        sourceKeys.add(schemaParam.code);
        if (previousCode)
            sourceKeys.add(previousCode);
        if (nameSlug)
            sourceKeys.add(nameSlug);
        return { ...schemaParam, sourceKeys: [...sourceKeys] };
    });
}
export function schemaEnumValueMatchesRule(enumValue, rule) {
    if (catalogValueMatchesTriggerRule(enumValue, {
        paramCode: "",
        paramName: null,
        valueCode: rule.valueCode,
        valueLabel: rule.valueLabel,
    })) {
        return true;
    }
    if (rule.valueCode?.trim()) {
        const norm = rule.valueCode.trim();
        if (enumValue.code === norm)
            return true;
        if (enumValue.code.localeCompare(norm, "ru", { sensitivity: "accent" }) === 0) {
            return true;
        }
        if (enumValue.label.localeCompare(norm, "ru", { sensitivity: "accent" }) === 0) {
            return true;
        }
    }
    if (rule.valueLabel?.trim()) {
        const norm = rule.valueLabel.trim();
        if (enumValue.label === norm)
            return true;
        if (enumValue.label.localeCompare(norm, "ru", { sensitivity: "accent" }) === 0) {
            return true;
        }
        if (enumValue.code.localeCompare(norm, "ru", { sensitivity: "accent" }) === 0) {
            return true;
        }
    }
    return false;
}
function ruleRequiresSchemaBinding(rule) {
    if (isBrokenTypicalWorkTriggerRef(rule))
        return false;
    if (rule.paramCode?.trim() || rule.paramName?.trim())
        return true;
    return (isSourceTypeTriggerParam(rule.paramCode, rule.paramName) ||
        isControlTypeTriggerParam(rule.paramCode, rule.paramName));
}
export function collectTypicalWorkSchemaConsistencyIssues(input) {
    const issues = [];
    const seen = new Set();
    const report = (kind, paramCode, paramName, message) => {
        const key = `${kind}:${paramCode}:${message}`;
        if (seen.has(key))
            return;
        seen.add(key);
        issues.push({ kind, paramCode, paramName, message });
    };
    for (const rule of input.rules) {
        if (!ruleRequiresSchemaBinding(rule)) {
            continue;
        }
        if (isArchCountLaborParamName(rule.paramName ?? "")) {
            continue;
        }
        const resolved = resolveWorkSchemaParamForRule(rule, input.schemaParams);
        if (!resolved) {
            if (matchesMethodologyCatalogParam(rule, input.methodologyParams)) {
                continue;
            }
            if (isPresenceOnlyTriggerRule(rule) &&
                (isSourceTypeTriggerParam(rule.paramCode, rule.paramName) ||
                    isControlTypeTriggerParam(rule.paramCode, rule.paramName))) {
                continue;
            }
            report("trigger", rule.paramCode, rule.paramName, "Триггер ссылается на параметр, которого нет в схеме шаблона");
            continue;
        }
        if (rule.valueCode &&
            resolved.values?.length &&
            !resolved.values.some((value) => schemaEnumValueMatchesRule(value, rule))) {
            report("trigger", rule.paramCode, rule.paramName, `Значение триггера «${rule.valueLabel ?? rule.valueCode}» отсутствует в поле схемы «${resolved.name}»`);
        }
    }
    for (const labor of input.laborParamCodes) {
        const resolved = resolveWorkSchemaParamForRule(labor, input.schemaParams);
        if (!resolved) {
            if (matchesMethodologyCatalogParam(labor, input.methodologyParams)) {
                continue;
            }
            report("labor", labor.paramCode, labor.paramName, "Параметр трудоёмкости не найден в схеме шаблона");
            continue;
        }
        if (labor.paramCode !== resolved.code ||
            (resolved.schemaFieldUid &&
                labor.schemaFieldUid !== resolved.schemaFieldUid)) {
            report("labor", labor.paramCode, labor.paramName, `Параметр трудоёмкости использует legacy-код «${labor.paramCode}» вместо поля схемы «${resolved.name}» (${resolved.code})`);
        }
    }
    for (const unavailable of collectUnavailableLaborCoefficientIssues({
        laborParams: input.laborParamCodes,
        schemaParams: input.schemaParams,
        methodologyCatalog: input.methodologyCatalog,
    })) {
        report(unavailable.kind, unavailable.paramCode, unavailable.paramName, unavailable.message);
    }
    for (const paramCode of input.formulaParamCodes ?? []) {
        if (!findWorkSchemaParameter(input.schemaParams, paramCode) &&
            !input.laborParamCodes.some((row) => row.paramCode === paramCode)) {
            report("formula", paramCode, null, "Формула ссылается на параметр, которого нет в схеме или трудоёмкости");
        }
    }
    return issues;
}
export function findCatalogPreviousCodeForSchemaParam(catalog, schemaParam) {
    const normSchemaName = stripParamNameSourceKeys(schemaParam.name)
        .trim()
        .toLowerCase();
    const exact = catalog.find((item) => item.name.trim() === schemaParam.name);
    if (exact)
        return exact.code;
    const byNormName = catalog.find((item) => stripParamNameSourceKeys(item.name).trim().toLowerCase() ===
        normSchemaName)?.code;
    if (byNormName)
        return byNormName;
    const nameSlug = slugParamCode(normSchemaName);
    if (!nameSlug)
        return undefined;
    return catalog.find((item) => item.code === nameSlug)?.code ?? nameSlug;
}
