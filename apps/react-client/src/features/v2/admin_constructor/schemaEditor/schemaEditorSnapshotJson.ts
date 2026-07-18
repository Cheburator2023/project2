/** Формат JSON-редактора конструктора (как factory `v2-default-anketa.snapshot.json` без dictionaries). */
export type SchemaEditorSnapshotJson = {
	jsonSchema: Record<string, unknown>;
	uiSchema: Record<string, unknown>;
	logic: Record<string, unknown>;
};

export function formatSchemaEditorSnapshotJson(parts: {
	jsonSchema: unknown;
	uiSchema: unknown;
	logic: unknown;
}): string {
	return JSON.stringify(
		{
			jsonSchema: parts.jsonSchema,
			uiSchema: parts.uiSchema,
			logic: parts.logic,
		},
		null,
		"\t",
	);
}

export function parseSchemaEditorSnapshotJson(raw: string): {
	ok: true;
	value: SchemaEditorSnapshotJson;
} | {
	ok: false;
	error: string;
} {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { ok: false, error: "Некорректный JSON" };
	}

	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		return {
			ok: false,
			error: "Ожидается объект { jsonSchema, uiSchema, logic }",
		};
	}

	const record = parsed as Record<string, unknown>;
	const { jsonSchema, uiSchema, logic } = record;

	if (!jsonSchema || typeof jsonSchema !== "object" || Array.isArray(jsonSchema)) {
		return { ok: false, error: "Поле jsonSchema: ожидается объект" };
	}
	if (!uiSchema || typeof uiSchema !== "object" || Array.isArray(uiSchema)) {
		return { ok: false, error: "Поле uiSchema: ожидается объект" };
	}
	if (!logic || typeof logic !== "object" || Array.isArray(logic)) {
		return {
			ok: false,
			error: "Поле logic: ожидается объект с массивом rules",
		};
	}

	return {
		ok: true,
		value: {
			jsonSchema: jsonSchema as Record<string, unknown>,
			uiSchema: uiSchema as Record<string, unknown>,
			logic: logic as Record<string, unknown>,
		},
	};
}

export function downloadSchemaEditorSnapshotJson(
	jsonText: string,
	filename: string,
): void {
	const blob = new Blob([jsonText], { type: "application/json;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}
