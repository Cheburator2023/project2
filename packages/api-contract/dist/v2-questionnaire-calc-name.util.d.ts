import type { V2JsonSchemaDto, V2UiSchemaDto } from "./v2-template.types";
/** Устаревший путь поля названия в formData шаблона (meta анкеты: entity.calcName). */
export declare const V2_QUESTIONNAIRE_CALC_NAME_FORM_PATH = "generalInfo.calcName";
/** Удаляет generalInfo.calcName из jsonSchema шаблона. */
export declare function stripQuestionnaireCalcNameFromJsonSchema(jsonSchema: V2JsonSchemaDto): V2JsonSchemaDto;
/** Удаляет generalInfo.calcName из uiSchema шаблона. */
export declare function stripQuestionnaireCalcNameFromUiSchema(uiSchema: V2UiSchemaDto): V2UiSchemaDto;
/** Название анкеты — meta сущности, не поле схемы шаблона. */
export declare function stripQuestionnaireCalcNameFromTemplateSnapshot<T extends {
    jsonSchema: V2JsonSchemaDto;
    uiSchema: V2UiSchemaDto;
}>(snapshot: T): T;
