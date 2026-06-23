import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { V2TemplateSnapshotDto } from "./v2-template.types";
export declare const V2_ANKETA_SYSTEM_ROOT_KEYS: readonly ["workflow", "meta", "groupActivation", "uncertaintyCalculation", "summary"];
export type V2AnketaSystemRootKey = (typeof V2_ANKETA_SYSTEM_ROOT_KEYS)[number];
/** Канонический scaffold скрытых системных корневых секций анкеты. */
export declare function buildV2AnketaSystemScaffold(): {
    jsonSchema: RJSFSchema;
    uiSchema: UiSchema;
};
/** Пустой редактируемый шаблон: только предсозданные системные секции. */
export declare function buildEmptyV2AnketaTemplateSnapshot(): Pick<V2TemplateSnapshotDto, "jsonSchema" | "uiSchema">;
