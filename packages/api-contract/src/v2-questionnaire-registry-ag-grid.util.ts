import {
	V2_IMPLEMENTATION_STREAM_CODES,
	V2_IMPLEMENTATION_STREAM_LABELS,
	resolveImplementationStreamLabel,
	type V2ImplementationStreamCode,
} from "./v2-implementation-streams.util";
import {
	V2_QUESTIONNAIRE_STATUS_RU,
	formatV2QuestionnaireStatus,
	type V2AgGridFilterModel,
	type V2AgGridSortModel,
	type V2QuestionnaireStatus,
} from "./v2-questionnaire.types";

export const V2_REGISTRY_EDIT_LOCK_FILTER_VALUE = "Редактируется";

export const V2_REGISTRY_DATE_COL_IDS = new Set([
	"createdAt",
	"updatedAt",
	"schemaCreatedAt",
	"schemaUpdatedAt",
]);

const STREAM_COL_IDS = new Set(["form.generalInfo.implementationStream"]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseJsonQueryValue(raw: unknown): unknown {
	if (raw == null || raw === "") return undefined;
	if (typeof raw !== "string") return raw;
	try {
		return JSON.parse(raw);
	} catch {
		return undefined;
	}
}

export function parseV2AgGridFilterModel(raw: unknown): V2AgGridFilterModel {
	const parsed = parseJsonQueryValue(raw);
	if (!isRecord(parsed)) return {};
	const out: V2AgGridFilterModel = {};
	for (const [colId, filter] of Object.entries(parsed)) {
		if (typeof colId === "string" && colId && isRecord(filter)) {
			out[colId] = filter as V2AgGridFilterModel[string];
		}
	}
	return out;
}

export function parseV2AgGridSortModel(raw: unknown): V2AgGridSortModel[] {
	const parsed = parseJsonQueryValue(raw);
	if (!Array.isArray(parsed)) return [];
	const out: V2AgGridSortModel[] = [];
	for (const item of parsed) {
		if (!isRecord(item)) continue;
		const colId = typeof item.colId === "string" ? item.colId : "";
		const sort = item.sort === "asc" || item.sort === "desc" ? item.sort : null;
		if (colId && sort) out.push({ colId, sort });
	}
	return out;
}

export function isV2AgGridFilterModelEmpty(
	model: V2AgGridFilterModel | undefined,
): boolean {
	return !model || Object.keys(model).length === 0;
}

export function toV2RegistryDateOnly(value: unknown): string | null {
	if (value == null || value === "") return null;
	const text = String(value).trim();
	const isoDay = /^(\d{4}-\d{2}-\d{2})/.exec(text);
	if (isoDay) return isoDay[1] ?? null;
	const date = new Date(text);
	if (Number.isNaN(date.getTime())) return null;
	return date.toISOString().slice(0, 10);
}

export function isV2RegistryStreamColumn(colId: string): boolean {
	return STREAM_COL_IDS.has(colId) || colId.endsWith(".implementationStream");
}

export function expandV2RegistrySetFilterValues(
	colId: string,
	value: string,
): string[] {
	const out = new Set<string>([value]);
	if (colId === "status") {
		for (const [code, label] of Object.entries(V2_QUESTIONNAIRE_STATUS_RU)) {
			if (value === code || value === label) {
				out.add(code);
				out.add(label);
			}
		}
	}
	if (isV2RegistryStreamColumn(colId)) {
		for (const code of V2_IMPLEMENTATION_STREAM_CODES) {
			const label = V2_IMPLEMENTATION_STREAM_LABELS[code];
			if (value === code || value === label) {
				out.add(code);
				out.add(label);
			}
		}
	}
	if (value === "Да") {
		out.add("true");
		out.add("t");
		out.add("1");
		out.add("yes");
	}
	if (value === "Нет") {
		out.add("false");
		out.add("f");
		out.add("0");
		out.add("no");
	}
	return [...out];
}

export function formatV2RegistrySetFilterValue(
	colId: string,
	raw: unknown,
): string | null {
	if (raw == null || raw === "") return null;
	if (typeof raw === "boolean") return raw ? "Да" : "Нет";
	if (colId === "status") {
		return formatV2QuestionnaireStatus(String(raw) as V2QuestionnaireStatus);
	}
	if (colId === "editLock") {
		return V2_REGISTRY_EDIT_LOCK_FILTER_VALUE;
	}
	if (isV2RegistryStreamColumn(colId)) {
		return resolveImplementationStreamLabel(String(raw));
	}
	if (
		V2_REGISTRY_DATE_COL_IDS.has(colId) ||
		/^\d{4}-\d{2}-\d{2}/.test(String(raw).trim())
	) {
		return toV2RegistryDateOnly(raw);
	}
	if (raw === "true" || raw === "t") return "Да";
	if (raw === "false" || raw === "f") return "Нет";
	if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
	return String(raw);
}

export function omitV2AgGridFilterColumn(
	model: V2AgGridFilterModel,
	colId: string,
): V2AgGridFilterModel {
	if (!(colId in model)) return model;
	const next = { ...model };
	delete next[colId];
	return next;
}

export function implementationStreamFromFormData(
	formData: unknown,
): string | null {
	if (!isRecord(formData)) return null;
	const generalInfo = formData.generalInfo;
	if (!isRecord(generalInfo)) return null;
	const raw = generalInfo.implementationStream;
	return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function isV2ImplementationStreamCodeValue(
	value: string,
): value is V2ImplementationStreamCode {
	return (V2_IMPLEMENTATION_STREAM_CODES as readonly string[]).includes(value);
}
