import { resolveSchemaNode } from "@react-client/features/v2/admin_constructor/utils/schemaMutators";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";

function dotPathToSegments(path: string): string[] {
	return path.split(".").filter(Boolean);
}

function readUiAtPath(
	uiSchema: UiSchema,
	path: string,
): UiSchema | undefined {
	const parts = dotPathToSegments(path);
	let current: unknown = uiSchema;
	for (const part of parts) {
		if (!current || typeof current !== "object" || Array.isArray(current)) {
			return undefined;
		}
		current = (current as Record<string, unknown>)[part];
	}
	if (!current || typeof current !== "object" || Array.isArray(current)) {
		return undefined;
	}
	return current as UiSchema;
}

export function getObjectSchemaSlice(
	rootSchema: RJSFSchema,
	path: string,
	options?: { omitTitle?: boolean },
): RJSFSchema | null {
	const node = resolveSchemaNode(rootSchema, dotPathToSegments(path));
	if (!node || node.type !== "object") return null;
	return {
		type: "object",
		...(options?.omitTitle ? {} : { title: node.title }),
		properties: node.properties,
		required: node.required,
	};
}

export function getObjectUiSlice(
	rootUi: UiSchema,
	path: string,
): UiSchema {
	const branch = readUiAtPath(rootUi, path);
	if (!branch) return {};
	const { ["ui:order"]: _order, ["ui:options"]: _options, ...rest } =
		branch as Record<string, unknown>;
	return rest as UiSchema;
}
