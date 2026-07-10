"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_ANKETA_SYSTEM_ROOT_KEYS = void 0;
exports.isV2AnketaSystemRootKey = isV2AnketaSystemRootKey;
exports.buildV2AnketaSystemScaffold = buildV2AnketaSystemScaffold;
exports.buildEmptyV2AnketaTemplateSnapshot = buildEmptyV2AnketaTemplateSnapshot;
const v2_anketa_system_scaffold_snapshot_json_1 = __importDefault(require("./v2-anketa-system-scaffold.snapshot.json"));
exports.V2_ANKETA_SYSTEM_ROOT_KEYS = [
    "workflow",
    "meta",
    "groupActivation",
    "uncertaintyCalculation",
    "summary",
];
const SYSTEM_ROOT_KEY_SET = new Set(exports.V2_ANKETA_SYSTEM_ROOT_KEYS);
function isV2AnketaSystemRootKey(key) {
    return SYSTEM_ROOT_KEY_SET.has(key);
}
const scaffoldJsonSchemaProperties = v2_anketa_system_scaffold_snapshot_json_1.default.jsonSchemaProperties;
const scaffoldUiSchema = v2_anketa_system_scaffold_snapshot_json_1.default.uiSchema;
/** Канонический scaffold скрытых системных корневых секций анкеты. */
function buildV2AnketaSystemScaffold() {
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
function buildEmptyV2AnketaTemplateSnapshot() {
    return buildV2AnketaSystemScaffold();
}
