import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import {
	parentOfPointer,
	pointerSegments,
} from "../utils/schemaPaths";
import {
	readUiSchemaBranchAtPointer,
	resolveSchemaNode,
} from "../utils/schemaMutators";
import { collectSchemaFieldPointerIds } from "./schemaFieldTreeModel";

export type SchemaFieldChangeKind = "added" | "removed" | "schema" | "ui" | "required";

export const SCHEMA_FIELD_CHANGE_KIND_LABELS: Record<
	SchemaFieldChangeKind,
	string
> = {
	added: "Новое",
	removed: "Удалено",
	schema: "Схема",
	ui: "UI",
	required: "Обязательность",
};

export type SchemaFieldChangeInfo = {
	kinds: SchemaFieldChangeKind[];
	details: string[];
};

function formatValue(value: unknown): string {
	if (value === undefined) return "—";
	if (value === null) return "null";
	if (typeof value === "string") return value.trim() ? value : "—";
	return JSON.stringify(value);
}

function stableJson(value: unknown): string {
	return JSON.stringify(value ?? null);
}

function readComparableUiBranch(
	uiSchema: UiSchema | Record<string, unknown>,
	pointer: string,
): Record<string, unknown> {
	const branch = readUiSchemaBranchAtPointer(uiSchema, pointer);
	if (!branch) return {};

	const copy = { ...branch };
	delete copy["ui:order"];
	for (const key of Object.keys(copy)) {
		if (key.startsWith("ui:") && key !== "ui:widget" && key !== "ui:placeholder") {
			continue;
		}
		if (!key.startsWith("ui:")) {
			delete copy[key];
		}
	}

	return copy;
}

function readUiOptions(
	uiSchema: UiSchema | Record<string, unknown>,
	pointer: string,
): Record<string, unknown> {
	const branch = readUiSchemaBranchAtPointer(uiSchema, pointer);
	const options = branch?.["ui:options"];
	if (!options || typeof options !== "object" || Array.isArray(options)) {
		return {};
	}
	return { ...(options as Record<string, unknown>) };
}

function pointerFromSegments(segments: string[]): string {
	if (segments.length === 0) return "/";
	return `/${segments.join("/")}`;
}

function isFieldRequired(
	schema: RJSFSchema,
	pointer: string,
): boolean {
	const parent = parentOfPointer(pointer);
	if (!parent) return false;
	if (!parent.key || parent.key === "items") return false;

	const parentNode = resolveSchemaNode(schema, parent.parentSegments);
	return Array.isArray(parentNode?.required)
		? parentNode.required.includes(parent.key)
		: false;
}

function describeSchemaChanges(
	before: RJSFSchema | undefined,
	after: RJSFSchema | undefined,
): string[] {
	if (!before && after) return ["Новое поле"];
	if (before && !after) return ["Поле удалено"];

	const details: string[] = [];
	if (!before || !after) return details;

	if (before.title !== after.title) {
		details.push(
			`Заголовок: ${formatValue(before.title)} → ${formatValue(after.title)}`,
		);
	}
	if (stableJson(before.type) !== stableJson(after.type)) {
		details.push(
			`Тип: ${formatValue(before.type)} → ${formatValue(after.type)}`,
		);
	}
	if (before.description !== after.description) {
		details.push(
			`Описание: ${formatValue(before.description)} → ${formatValue(after.description)}`,
		);
	}
	if (stableJson(before.default) !== stableJson(after.default)) {
		details.push("Изменено значение по умолчанию");
	}
	if (stableJson(before.enum) !== stableJson(after.enum)) {
		details.push("Изменён список enum");
	}

	return details;
}

function describeUiChanges(
	beforeUi: UiSchema | Record<string, unknown>,
	afterUi: UiSchema | Record<string, unknown>,
	pointer: string,
): string[] {
	const details: string[] = [];
	const beforeBranch = readComparableUiBranch(beforeUi, pointer);
	const afterBranch = readComparableUiBranch(afterUi, pointer);

	if (stableJson(beforeBranch) !== stableJson(afterBranch)) {
		if (beforeBranch["ui:widget"] !== afterBranch["ui:widget"]) {
			details.push(
				`Виджет: ${formatValue(beforeBranch["ui:widget"])} → ${formatValue(afterBranch["ui:widget"])}`,
			);
		}
		if (beforeBranch["ui:placeholder"] !== afterBranch["ui:placeholder"]) {
			details.push(
				`Placeholder: ${formatValue(beforeBranch["ui:placeholder"])} → ${formatValue(afterBranch["ui:placeholder"])}`,
			);
		}
	}

	const beforeOptions = readUiOptions(beforeUi, pointer);
	const afterOptions = readUiOptions(afterUi, pointer);
	if (stableJson(beforeOptions) !== stableJson(afterOptions)) {
		const optionsDetailsStart = details.length;
		if (beforeOptions.dictionaryCode !== afterOptions.dictionaryCode) {
			details.push(
				`Справочник: ${formatValue(beforeOptions.dictionaryCode)} → ${formatValue(afterOptions.dictionaryCode)}`,
			);
		}
		if (beforeOptions.sectionRole !== afterOptions.sectionRole) {
			details.push("Изменена роль секции");
		}
		if (beforeOptions.layoutGroup !== afterOptions.layoutGroup) {
			details.push("Изменена разметка");
		}
		if (beforeOptions.gridColumns !== afterOptions.gridColumns) {
			details.push("Изменено число колонок");
		}
		if (beforeOptions.hideTitle !== afterOptions.hideTitle) {
			details.push("Изменена видимость заголовка");
		}
		if (beforeOptions.defaultExpanded !== afterOptions.defaultExpanded) {
			details.push("Изменено раскрытие группы");
		}
		if (beforeOptions.archComponentType !== afterOptions.archComponentType) {
			details.push("Изменён арх. компонент");
		}
		if (details.length === optionsDetailsStart) {
			details.push("Изменены ui:options");
		}
	}

	const parent = parentOfPointer(pointer);
	if (parent) {
		const parentPointer = pointerFromSegments(parent.parentSegments);
		const beforeParent = readUiSchemaBranchAtPointer(beforeUi, parentPointer);
		const afterParent = readUiSchemaBranchAtPointer(afterUi, parentPointer);
		const key = parent.key;
		if (key) {
			const beforeOrder = Array.isArray(beforeParent?.["ui:order"])
				? (beforeParent["ui:order"] as string[])
				: [];
			const afterOrder = Array.isArray(afterParent?.["ui:order"])
				? (afterParent["ui:order"] as string[])
				: [];
			const beforeIndex = beforeOrder.indexOf(key);
			const afterIndex = afterOrder.indexOf(key);
			if (
				beforeIndex !== -1 &&
				afterIndex !== -1 &&
				beforeIndex !== afterIndex
			) {
				details.push(`Порядок: ${beforeIndex + 1} → ${afterIndex + 1}`);
			}
		}
	}

	return details;
}

export function describeSchemaFieldChanges(
	baseline: {
		jsonSchema: RJSFSchema;
		uiSchema: UiSchema | Record<string, unknown>;
	},
	current: {
		jsonSchema: RJSFSchema;
		uiSchema: UiSchema | Record<string, unknown>;
	},
	pointer: string,
): SchemaFieldChangeInfo | null {
	const beforeNode = resolveSchemaNode(
		baseline.jsonSchema,
		pointerSegments(pointer),
	);
	const afterNode = resolveSchemaNode(
		current.jsonSchema,
		pointerSegments(pointer),
	);
	const beforeExists = Boolean(beforeNode);
	const afterExists = Boolean(afterNode);

	if (!beforeExists && !afterExists) return null;

	const kinds: SchemaFieldChangeKind[] = [];
	const details: string[] = [];

	if (!beforeExists && afterExists) {
		kinds.push("added");
		details.push("Новое поле");
	}
	if (beforeExists && !afterExists) {
		kinds.push("removed");
		details.push("Поле удалено");
	}

	const schemaDetails = describeSchemaChanges(beforeNode, afterNode);
	if (schemaDetails.length > 0) {
		kinds.push("schema");
		details.push(...schemaDetails.filter((detail) => detail !== "Новое поле"));
	}

	const uiDetails = describeUiChanges(
		baseline.uiSchema,
		current.uiSchema,
		pointer,
	);
	if (uiDetails.length > 0) {
		kinds.push("ui");
		details.push(...uiDetails);
	}

	const beforeRequired = isFieldRequired(baseline.jsonSchema, pointer);
	const afterRequired = isFieldRequired(current.jsonSchema, pointer);
	if (beforeRequired !== afterRequired) {
		kinds.push("required");
		details.push(
			afterRequired ? "Стало обязательным" : "Снята обязательность",
		);
	}

	if (kinds.length === 0) return null;

	return {
		kinds: [...new Set(kinds)],
		details: [...new Set(details)],
	};
}

export function buildSchemaFieldChangeMap(
	baseline: {
		jsonSchema: RJSFSchema;
		uiSchema: UiSchema | Record<string, unknown>;
	},
	current: {
		jsonSchema: RJSFSchema;
		uiSchema: UiSchema | Record<string, unknown>;
	},
): Map<string, SchemaFieldChangeInfo> {
	const pointers = new Set([
		...collectSchemaFieldPointerIds(baseline.jsonSchema, baseline.uiSchema),
		...collectSchemaFieldPointerIds(current.jsonSchema, current.uiSchema),
	]);

	const result = new Map<string, SchemaFieldChangeInfo>();
	for (const pointer of pointers) {
		const change = describeSchemaFieldChanges(baseline, current, pointer);
		if (change) result.set(pointer, change);
	}
	return result;
}
