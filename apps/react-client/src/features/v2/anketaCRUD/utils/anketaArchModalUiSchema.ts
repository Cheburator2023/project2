import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { V2AnketaEditorBindings } from "@smart-anketa/api-contract";
import { resolveV2AnketaEditorBindings } from "@smart-anketa/api-contract";

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
	bindings?: V2AnketaEditorBindings,
): UiSchema {
	const resolved =
		bindings ??
		resolveV2AnketaEditorBindings(
			jsonSchema as Record<string, unknown>,
			uiSchema as Record<string, unknown>,
		);
	let next = uiSchema;
	for (const dotPath of resolved.bodyHiddenDotPaths) {
		next = setNestedHidden(next, dotPath);
	}
	return next;
}
