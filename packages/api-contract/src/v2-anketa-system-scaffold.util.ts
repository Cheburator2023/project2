import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import scaffoldSnapshot from "./v2-anketa-system-scaffold.snapshot.json";

export const V2_ANKETA_SYSTEM_ROOT_KEYS = [
	"workflow",
	"meta",
	"groupActivation",
	"uncertaintyCalculation",
	"summary",
] as const;

export type V2AnketaSystemRootKey = (typeof V2_ANKETA_SYSTEM_ROOT_KEYS)[number];

const scaffoldJsonSchemaProperties = scaffoldSnapshot.jsonSchemaProperties as Record<
	string,
	RJSFSchema
>;
const scaffoldUiSchema = scaffoldSnapshot.uiSchema as Record<string, unknown>;

/** Канонический scaffold скрытых системных корневых секций анкеты. */
export function buildV2AnketaSystemScaffold(): {
	jsonSchema: RJSFSchema;
	uiSchema: UiSchema;
} {
	return {
		jsonSchema: {
			type: "object",
			properties: structuredClone(scaffoldJsonSchemaProperties),
			required: [],
		},
		uiSchema: structuredClone(scaffoldUiSchema) as UiSchema,
	};
}

/** Пустой редактируемый шаблон: только предсозданные системные секции. */
export function buildEmptyV2AnketaTemplateSnapshot(): {
	jsonSchema: RJSFSchema;
	uiSchema: UiSchema;
} {
	return buildV2AnketaSystemScaffold();
}
