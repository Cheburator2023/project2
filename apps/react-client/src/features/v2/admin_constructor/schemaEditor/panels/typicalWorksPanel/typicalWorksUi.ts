import {
	V2_SOURCE_STREAM,
	type V2TypicalWorkListItemDto,
	type V2WorkTriggerStatus,
} from "@smart-anketa/api-contract";

export const LOGIC_TAB_QUERY = "logicTab";
export const WORK_ID_QUERY = "workId";
export const NEW_WORK_QUERY = "newWork";
export const BIND_POINTER_QUERY = "bindPointer";
/** Откатить блок typicalWork при отмене создания работы (только после DnD/палитры). */
export const ROLLBACK_TYPICAL_WORK_QUERY = "rollbackTypicalWork";

/** Разделение внутр/внеш убрано — источники в едином стриме. */
export const DEFAULT_WORK_STREAMS = [V2_SOURCE_STREAM] as const;

export const ARCH_COMPONENT_DOT: Record<string, string> = {
	"Система-источник": "#119e8f",
	"Объект / Витрина данных": "#2f6bd8",
	"Процесс обработки данных": "#e07b16",
	Модель: "#8b5cf6",
	"Модельный сервис": "#64748b",
};

export function triggerStatusLabel(status: V2WorkTriggerStatus): string {
	switch (status) {
		case "appears":
			return "появляется";
		case "hidden":
			return "скрыта";
		case "no_triggers":
			return "без триггеров — не появится";
		case "invalid":
			return "невалидно";
	}
}

export function triggerStatusColors(status: V2WorkTriggerStatus): {
	bg: string;
	color: string;
} {
	switch (status) {
		case "appears":
			return { bg: "#e7f6ec", color: "#1f8a4d" };
		case "hidden":
			return { bg: "#eef1f6", color: "#5b6577" };
		case "invalid":
			return { bg: "#fdecec", color: "#c62828" };
		default:
			return { bg: "#eef1f6", color: "#8a93a3" };
	}
}

export function groupWorksByArchComponent(
	items: V2TypicalWorkListItemDto[],
): Array<{ archComponentType: string; works: V2TypicalWorkListItemDto[] }> {
	const map = new Map<string, V2TypicalWorkListItemDto[]>();
	for (const item of items) {
		const list = map.get(item.archComponentType) ?? [];
		list.push(item);
		map.set(item.archComponentType, list);
	}
	return [...map.entries()]
		.sort(([a], [b]) => a.localeCompare(b, "ru"))
		.map(([archComponentType, works]) => ({
			archComponentType,
			works: works.sort((a, b) => a.name.localeCompare(b.name, "ru")),
		}));
}

export function readStoredWorkStream(workId: string): string | null {
	try {
		return sessionStorage.getItem(`v2-work-stream:${workId}`);
	} catch {
		return null;
	}
}

export function storeWorkStream(workId: string, stream: string): void {
	try {
		sessionStorage.setItem(`v2-work-stream:${workId}`, stream);
	} catch {
		// ignore
	}
}

export function pickDefaultStream(
	work: V2TypicalWorkListItemDto | null,
): string | null {
	if (!work || work.streams.length === 0) return null;
	const stored = readStoredWorkStream(work.id);
	if (stored && work.streams.includes(stored)) return stored;
	return work.streams[0] ?? null;
}

export type NormPeriodStatus = "active" | "archive" | "future";

export function normPeriodStatus(
	validFrom: string,
	validTo: string | null,
	atDate: string,
): NormPeriodStatus {
	const day = atDate.slice(0, 10);
	const from = validFrom.slice(0, 10);
	const to = validTo?.slice(0, 10) ?? null;
	if (day < from) return "future";
	if (to && day > to) return "archive";
	return "active";
}

export function normStatusLabel(status: NormPeriodStatus): string {
	switch (status) {
		case "active":
			return "активна";
		case "future":
			return "будущая";
		default:
			return "архив";
	}
}

export function normStatusColors(status: NormPeriodStatus): {
	bg: string;
	color: string;
	rowBg: string;
} {
	switch (status) {
		case "active":
			return { bg: "#e7f6ec", color: "#1f8a4d", rowBg: "#f6fcf8" };
		case "future":
			return { bg: "#eef4ff", color: "#2f6bd8", rowBg: "#fafcff" };
		default:
			return { bg: "#eef1f6", color: "#8a93a3", rowBg: "transparent" };
	}
}

export function archComponentShortLabel(archComponentType: string): string {
	if (archComponentType === "Система-источник") return "СИСТЕМА-ИСТОЧНИК";
	if (archComponentType === "Объект / Витрина данных") return "ОБЪЕКТ ДАННЫХ";
	return archComponentType.toUpperCase();
}

export function roundingModeLabel(mode: string): string {
	switch (mode) {
		case "CEIL":
			return "вверх";
		case "FLOOR":
			return "вниз";
		case "ROUND":
			return "матем.";
		case "NONE":
			return "без округления";
		default:
			return mode;
	}
}

export function assignmentStatusLabel(
	status: import("@smart-anketa/api-contract").V2TypicalWorkAssignmentStatusDto | undefined,
	count = 0,
): string {
	switch (status) {
		case "unassigned":
			return "не назначена";
		case "used_on_schemas":
			return count > 0 ? `уже на ${count} схемах` : "уже на схемах";
		case "free":
			return "свободна";
		default:
			return "";
	}
}

export function formulaBadgeLabel(
	badge: import("@smart-anketa/api-contract").V2TypicalWorkFormulaBadgeDto | undefined,
): string {
	switch (badge) {
		case "multiplier":
			return "коэф.: множитель";
		case "additive":
			return "коэф.: слагаемое";
		case "mixed":
			return "коэф.: смеш.";
		case "transitive":
			return "транзитивная";
		default:
			return "без коэф.";
	}
}
