import scaffoldSnapshot from "./v2-anketa-system-scaffold.snapshot.json";
export const V2_ANKETA_SYSTEM_ROOT_KEYS = [
    "workflow",
    "meta",
    "groupActivation",
    "uncertaintyCalculation",
    "summary",
];
const SYSTEM_ROOT_KEY_SET = new Set(V2_ANKETA_SYSTEM_ROOT_KEYS);
export function isV2AnketaSystemRootKey(key) {
    return SYSTEM_ROOT_KEY_SET.has(key);
}
const scaffoldJsonSchemaProperties = scaffoldSnapshot.jsonSchemaProperties;
const scaffoldUiSchema = scaffoldSnapshot.uiSchema;
/** Канонический scaffold скрытых системных корневых секций анкеты. */
export function buildV2AnketaSystemScaffold() {
    return {
        jsonSchema: {
            type: "object",
            properties: structuredClone(scaffoldJsonSchemaProperties),
            required: [],
        },
        uiSchema: structuredClone(scaffoldUiSchema),
    };
}
/** Пустой редактируемый шаблон: только предсозданные системные секции. */
export function buildEmptyV2AnketaTemplateSnapshot() {
    return buildV2AnketaSystemScaffold();
}
