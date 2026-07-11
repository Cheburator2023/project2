import { isTypicalWorksCatalogLogicRule } from "./v2-default-typical-works-logic.util";
import { collectGeneratedTypicalWorkArrayPaths, disableTypicalWorkCatalogBindingsInUiSchema, } from "./v2-typical-work-output-paths.util";
function slashPath(dotPath) {
    return `/${dotPath.replace(/\./g, "/")}`;
}
function isTypicalWorksStoredLogicRule(rule, typicalWorkOutputPaths) {
    if (isTypicalWorksCatalogLogicRule(rule))
        return true;
    if (rule.id === "unified-typical-total")
        return true;
    const payload = rule.payload;
    if (payload?.role === "typical_total")
        return true;
    if (payload?.worksCatalog === true)
        return true;
    const slashPaths = new Set([...typicalWorkOutputPaths].map((path) => slashPath(path)));
    if (rule.targetPath && slashPaths.has(rule.targetPath))
        return true;
    const arrayPath = payload?.arrayPath;
    if (typeof arrayPath === "string" && typicalWorkOutputPaths.has(arrayPath)) {
        return true;
    }
    const outputArrayPath = payload?.outputArrayPath;
    if (typeof outputArrayPath === "string" &&
        typicalWorkOutputPaths.has(outputArrayPath)) {
        return true;
    }
    return false;
}
/** Убирает сохранённые правила типовых работ из logic-графа шаблона. */
export function stripTypicalWorksLogicRules(logic, uiSchema) {
    const typicalWorkOutputPaths = new Set(collectGeneratedTypicalWorkArrayPaths(uiSchema));
    return {
        ...logic,
        rules: (logic?.rules ?? []).filter((rule) => !isTypicalWorksStoredLogicRule(rule, typicalWorkOutputPaths)),
    };
}
/**
 * Заводской снимок без типовых работ: структура анкеты сохраняется,
 * каталог работ не сидится, автогенерация типовых работ отключена.
 */
export function prepareFactorySnapshotWithoutTypicalWorks(snapshot) {
    const uiSchema = disableTypicalWorkCatalogBindingsInUiSchema(structuredClone(snapshot.uiSchema));
    const logic = stripTypicalWorksLogicRules(snapshot.logic, uiSchema);
    return {
        ...snapshot,
        uiSchema,
        logic,
        releaseNotes: snapshot.releaseNotes?.trim() ||
            "Заводская схема без типовых работ (чистый черновик)",
    };
}
