import type { TemplatesType } from "@rjsf/utils";
import {
	V2PreviewArrayFieldTemplate,
	V2PreviewObjectFieldTemplate,
} from "./V2PreviewObjectFieldTemplate";

/** Единые RJSF-шаблоны v2 анкеты: используются и в превью, и в реальной анкете. */
export const v2AnketaFormTemplates: Partial<TemplatesType> = {
	ArrayFieldTemplate: V2PreviewArrayFieldTemplate,
	ObjectFieldTemplate: V2PreviewObjectFieldTemplate,
};

/** @deprecated Используйте `v2AnketaFormTemplates`; имя сохранено для совместимости. */
export const v2PreviewFormTemplates = v2AnketaFormTemplates;
