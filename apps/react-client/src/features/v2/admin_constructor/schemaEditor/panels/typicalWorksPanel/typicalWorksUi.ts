import type {
	V2TypicalWorkListItemDto,
	V2WorkTriggerStatus,
} from "@smart-anketa/api-contract";

export const LOGIC_TAB_QUERY = "logicTab";

export const DEFAULT_WORK_STREAMS = ["ИД. Внутренний", "ИД. Внешний"] as const;

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
		case "no_triggers":
			return "без триггеров";
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

export function roundingModeLabel(mode: string): string {
	switch (mode) {
		case "CEIL":
			return "вверх";
		case "FLOOR":
			return "вниз";
		case "ROUND":
			return "математическое";
		case "NONE":
			return "без округления";
		default:
			return mode;
	}
}
