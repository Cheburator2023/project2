import type { TemplatesType } from "@rjsf/utils";
import {
	V2PreviewArrayFieldTemplate,
	V2PreviewObjectFieldTemplate,
} from "./V2PreviewObjectFieldTemplate";

export const v2PreviewFormTemplates: Partial<TemplatesType> = {
	ArrayFieldTemplate: V2PreviewArrayFieldTemplate,
	ObjectFieldTemplate: V2PreviewObjectFieldTemplate,
};
