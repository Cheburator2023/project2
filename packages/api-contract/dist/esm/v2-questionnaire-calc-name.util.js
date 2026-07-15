/** Устаревший путь поля названия в formData шаблона (meta анкеты: entity.calcName). */
export const V2_QUESTIONNAIRE_CALC_NAME_FORM_PATH = "generalInfo.calcName";
function isPlainRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
/** Удаляет generalInfo.calcName из jsonSchema шаблона. */
export function stripQuestionnaireCalcNameFromJsonSchema(jsonSchema) {
    const next = structuredClone(jsonSchema);
    const properties = next.properties;
    if (!isPlainRecord(properties))
        return next;
    const generalInfo = properties.generalInfo;
    if (!isPlainRecord(generalInfo))
        return next;
    const giProps = generalInfo.properties;
    if (!isPlainRecord(giProps) || !("calcName" in giProps))
        return next;
    const { calcName: _removed, ...restProps } = giProps;
    generalInfo.properties = restProps;
    if (Array.isArray(generalInfo.required)) {
        const required = generalInfo.required.filter((key) => key !== "calcName");
        if (required.length > 0) {
            generalInfo.required = required;
        }
        else {
            delete generalInfo.required;
        }
    }
    return next;
}
/** Удаляет generalInfo.calcName из uiSchema шаблона. */
export function stripQuestionnaireCalcNameFromUiSchema(uiSchema) {
    const next = structuredClone(uiSchema);
    const generalInfo = next.generalInfo;
    if (!isPlainRecord(generalInfo) || !("calcName" in generalInfo))
        return next;
    const { calcName: _removed, ...restGeneralInfo } = generalInfo;
    const order = restGeneralInfo["ui:order"];
    if (Array.isArray(order)) {
        const filtered = order.filter((key) => key !== "calcName");
        if (filtered.length > 0) {
            restGeneralInfo["ui:order"] = filtered;
        }
        else {
            delete restGeneralInfo["ui:order"];
        }
    }
    next.generalInfo = restGeneralInfo;
    return next;
}
/** Название анкеты — meta сущности, не поле схемы шаблона. */
export function stripQuestionnaireCalcNameFromTemplateSnapshot(snapshot) {
    return {
        ...snapshot,
        jsonSchema: stripQuestionnaireCalcNameFromJsonSchema(snapshot.jsonSchema),
        uiSchema: stripQuestionnaireCalcNameFromUiSchema(snapshot.uiSchema),
    };
}
