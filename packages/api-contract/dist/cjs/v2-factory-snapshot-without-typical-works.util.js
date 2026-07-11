"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripTypicalWorksLogicRules = stripTypicalWorksLogicRules;
exports.prepareFactorySnapshotWithoutTypicalWorks = prepareFactorySnapshotWithoutTypicalWorks;
const v2_default_typical_works_logic_util_1 = require("./v2-default-typical-works-logic.util");
const v2_typical_work_output_paths_util_1 = require("./v2-typical-work-output-paths.util");
function slashPath(dotPath) {
    return `/${dotPath.replace(/\./g, "/")}`;
}
function isTypicalWorksStoredLogicRule(rule, typicalWorkOutputPaths) {
    if ((0, v2_default_typical_works_logic_util_1.isTypicalWorksCatalogLogicRule)(rule))
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
function stripTypicalWorksLogicRules(logic, uiSchema) {
    const typicalWorkOutputPaths = new Set((0, v2_typical_work_output_paths_util_1.collectGeneratedTypicalWorkArrayPaths)(uiSchema));
    return {
        ...logic,
        rules: (logic?.rules ?? []).filter((rule) => !isTypicalWorksStoredLogicRule(rule, typicalWorkOutputPaths)),
    };
}
/**
 * Заводской снимок без типовых работ: структура анкеты сохраняется,
 * каталог работ не сидится, автогенерация типовых работ отключена.
 */
function prepareFactorySnapshotWithoutTypicalWorks(snapshot) {
    const uiSchema = (0, v2_typical_work_output_paths_util_1.disableTypicalWorkCatalogBindingsInUiSchema)(structuredClone(snapshot.uiSchema));
    const logic = stripTypicalWorksLogicRules(snapshot.logic, uiSchema);
    return {
        ...snapshot,
        uiSchema,
        logic,
        releaseNotes: snapshot.releaseNotes?.trim() ||
            "Заводская схема без типовых работ (чистый черновик)",
    };
}
