import type { RJSFSchema } from "@rjsf/utils";
import type { V2ArchComponentType } from "./v2-anketa-section-ui.util";
export type V2ArchComponentPresetDef = {
    make: () => RJSFSchema;
    uiOptions?: Record<string, unknown>;
    /** Дочерние ветки uiSchema (ключи — имена properties), без ui:options корня. */
    uiBranch?: Record<string, unknown>;
};
export declare const V2_ARCH_COMPONENT_PRESET_DEFS_FROM_SNAPSHOT: Pick<Record<V2ArchComponentType, V2ArchComponentPresetDef>, "modelService" | "sourceSystem" | "dataProcess" | "dataMart" | "model">;
