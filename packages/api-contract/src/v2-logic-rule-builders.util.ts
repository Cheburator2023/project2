import type { V2JsonLogicValue, V2LogicRuleDto } from "./v2-template.types";

function normalizeJsonPointer(raw: string): string {
	const t = raw.trim();
	if (!t || t === "/") return "/";
	return t.startsWith("/") ? t : `/${t}`;
}

/** JSON Pointer `/a/b` → `a.b` для `{"var": "a.b"}` в JsonLogic. */
export function v2JsonPointerToVarPath(pointer: string): string {
	return normalizeJsonPointer(pointer)
		.replace(/^\//, "")
		.split("/")
		.filter(Boolean)
		.join(".");
}

/**
 * Правило visibility: целевое поле видно, когда булево поле-источник равно `whenChecked`.
 * Универсальный шаблон для чекбоксов и любых boolean-полей.
 */
export function buildBooleanVisibilityRule(params: {
	id: string;
	targetPointer: string;
	sourcePointer: string;
	/** Показывать цель, когда источник = true (по умолчанию). false — показ при выключенном чекбоксе. */
	whenChecked?: boolean;
	description?: string;
}): V2LogicRuleDto {
	const sourceVar = v2JsonPointerToVarPath(params.sourcePointer);
	const when = params.whenChecked !== false;
	const condition: V2JsonLogicValue = {
		"==": [{ var: sourceVar }, when],
	};

	return {
		id: params.id,
		kind: "visibility",
		targetPath: normalizeJsonPointer(params.targetPointer),
		dependencies: [normalizeJsonPointer(params.sourcePointer)],
		condition,
		...(params.description ? { description: params.description } : {}),
	};
}
