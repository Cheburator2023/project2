import type { UiSchema } from "@rjsf/utils";
import { V2_QUESTIONNAIRE_CALC_NAME_FORM_PATH } from "@smart-anketa/api-contract";

/** Путь к устаревшему полю названия в formData (удалено из схемы шаблона). */
export const QUESTIONNAIRE_CALC_NAME_FORM_PATH =
	V2_QUESTIONNAIRE_CALC_NAME_FORM_PATH;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function removeAtPath(
	data: Record<string, unknown>,
	path: string,
): Record<string, unknown> {
	const parts = path.split(".");
	if (parts.length === 1) {
		if (!(parts[0] in data)) return data;
		const next = { ...data };
		delete next[parts[0]];
		return next;
	}

	const [head, ...rest] = parts;
	const child = data[head];
	if (!isPlainRecord(child)) return data;

	const nested = removeAtPath(child, rest.join("."));
	if (Object.keys(nested).length === 0) {
		const next = { ...data };
		delete next[head];
		return next;
	}

	return { ...data, [head]: nested };
}

/** Название хранится в meta анкеты (calcName), не в formData шаблона. */
export function stripQuestionnaireCalcNameFromFormData(
	formData: Record<string, unknown>,
): Record<string, unknown> {
	return removeAtPath(formData, QUESTIONNAIRE_CALC_NAME_FORM_PATH);
}

/** Скрывает поле названия в форме для старых шаблонов, где оно ещё есть в uiSchema. */
export function hideQuestionnaireCalcNameInUiSchema(uiSchema: UiSchema): UiSchema {
	const parts = QUESTIONNAIRE_CALC_NAME_FORM_PATH.split(".");
	const next: UiSchema = { ...uiSchema };
	let current: UiSchema = next;

	for (let i = 0; i < parts.length - 1; i++) {
		const key = parts[i]!;
		const child =
			current[key] && typeof current[key] === "object"
				? ({ ...(current[key] as UiSchema) } as UiSchema)
				: {};
		current[key] = child;
		current = child;
	}

	const lastKey = parts[parts.length - 1]!;
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

export function normalizeQuestionnaireCalcName(value: string): string {
	return value.trim();
}

export function isQuestionnaireCalcNameValid(value: string): boolean {
	const trimmed = normalizeQuestionnaireCalcName(value);
	return trimmed.length > 0 && trimmed.length <= 255;
}

/** Предложение названия для копии анкеты (≤255 символов). */
export function buildQuestionnaireCopyCalcName(sourceName: string): string {
	const base = normalizeQuestionnaireCalcName(sourceName) || "Анкета";
	const suffix = " (копия)";
	const maxBaseLen = 255 - suffix.length;
	const trimmedBase =
		base.length > maxBaseLen ? base.slice(0, maxBaseLen).trimEnd() : base;
	return `${trimmedBase}${suffix}`;
}

/** Предложение названия для новой версии в серии. */
export function buildQuestionnaireVersionCalcName(
	sourceName: string,
	nextVersion: string | number,
): string {
	const base = normalizeQuestionnaireCalcName(sourceName) || "Анкета";
	const suffix = ` (версия ${nextVersion})`;
	const maxBaseLen = 255 - suffix.length;
	const trimmedBase =
		base.length > maxBaseLen ? base.slice(0, maxBaseLen).trimEnd() : base;
	return `${trimmedBase}${suffix}`;
}
