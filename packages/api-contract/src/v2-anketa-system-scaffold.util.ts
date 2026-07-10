import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { V2TemplateSnapshotDto } from "./v2-template.types";
import scaffoldSnapshot from "./v2-anketa-system-scaffold.snapshot.json";

export const V2_ANKETA_SYSTEM_ROOT_KEYS = [
	"workflow",
	"meta",
	"groupActivation",
	"uncertaintyCalculation",
	"summary",
] as const;

export type V2AnketaSystemRootKey = (typeof V2_ANKETA_SYSTEM_ROOT_KEYS)[number];

const SYSTEM_ROOT_KEY_SET = new Set<string>(V2_ANKETA_SYSTEM_ROOT_KEYS);

export function isV2AnketaSystemRootKey(
	key: string,
): key is V2AnketaSystemRootKey {
	return SYSTEM_ROOT_KEY_SET.has(key);
}

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
export function buildEmptyV2AnketaTemplateSnapshot(): Pick<
	V2TemplateSnapshotDto,
	"jsonSchema" | "uiSchema"
> {
	return buildV2AnketaSystemScaffold();
}
