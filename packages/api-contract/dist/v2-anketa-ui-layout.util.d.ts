import type { V2JsonSchemaDto, V2UiSchemaDto } from "./v2-template.types";
/**
 * Проставляет layout-метаданные (`ui:options.sectionRole`, defaultExpanded, …)
 * по структуре jsonSchema (заводская схема и кастомные шаблоны).
 */
export declare function enrichAnketaLayoutUiSchema(uiSchema: V2UiSchemaDto, jsonSchema: V2JsonSchemaDto): V2UiSchemaDto;
