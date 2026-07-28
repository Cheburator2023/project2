import type { V2JsonSchemaDto, V2UiSchemaDto } from "./v2-template.types";
/**
 * Стримы с кнопкой активации, по умолчанию выключены.
 * Всегда активны без кнопки: Общая/Детальная информация, ПиРМ, ДАДМ.
 */
export declare const V2_OPTIONAL_ACTIVATABLE_STREAM_CODES: Set<"idsrc" | "mdlctl" | "strdat" | "digagt">;
/**
 * Проставляет layout-метаданные (`ui:options.sectionRole`, defaultExpanded, …)
 * по структуре jsonSchema (заводская схема и кастомные шаблоны).
 */
export declare function enrichAnketaLayoutUiSchema(uiSchema: V2UiSchemaDto, jsonSchema: V2JsonSchemaDto): V2UiSchemaDto;
