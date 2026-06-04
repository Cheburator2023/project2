import { resolveSchemaNode } from "@react-client/features/v2/admin_constructor/utils/schemaMutators";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import {
	ANKETA_MODAL_OBJECT_PATHS,
	ANKETA_MODEL_WRAPPER_HIDDEN_CHILDREN,
	ANKETA_MODEL_WRAPPER_PATH,
} from "./anketaFormModalPaths";

function setNestedHidden(uiSchema: UiSchema, path: string): UiSchema {
	const parts = path.split(".");
	const next: UiSchema = { ...uiSchema };
	let current: UiSchema = next;

	for (let i = 0; i < parts.length - 1; i++) {
		const key = parts[i];
		const child =
			current[key] && typeof current[key] === "object"
				? ({ ...(current[key] as UiSchema) } as UiSchema)
				: {};
		current[key] = child;
		current = child;
	}

	const lastKey = parts[parts.length - 1];
	const leaf =
		current[lastKey] && typeof current[lastKey] === "object"
			? ({ ...(current[lastKey] as UiSchema) } as UiSchema)
			: {};
	const options =
		leaf["ui:options"] &&
		typeof leaf["ui:options"] === "object" &&
		!Array.isArray(leaf["ui:options"])
			? { ...(leaf["ui:options"] as Record<string, unknown>) }
			: {};

	current[lastKey] = {
		...leaf,
		"ui:widget": "hidden",
		"ui:options": { ...options, hidden: true },
	};

	return next;
}

/** Скрывает поля арх. объектов в теле анкеты (редактирование через модалку). */
export function withHiddenArchModalFields(
	uiSchema: UiSchema,
	jsonSchema: RJSFSchema,
): UiSchema {
	let next = uiSchema;

	for (const objectPath of ANKETA_MODAL_OBJECT_PATHS) {
		const node = resolveSchemaNode(
			jsonSchema,
			objectPath.split(".").filter(Boolean),
		);
		const keys = Object.keys(
			(node?.properties ?? {}) as Record<string, unknown>,
		);
		for (const key of keys) {
			next = setNestedHidden(next, `${objectPath}.${key}`);
		}
	}

	for (const key of ANKETA_MODEL_WRAPPER_HIDDEN_CHILDREN) {
		next = setNestedHidden(next, `${ANKETA_MODEL_WRAPPER_PATH}.${key}`);
	}

	return next;
}
