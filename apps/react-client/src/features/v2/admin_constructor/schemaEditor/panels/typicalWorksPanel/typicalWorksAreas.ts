/** Стримы-исполнители в редакторе логики типовых работ. */

import {
	V2_DB_STREAM_TO_EXECUTOR_AREA,
	V2_EXECUTOR_STREAM_LABELS,
	type V2ExecutorStreamLabel,
} from "@smart-anketa/api-contract";

export type LogicWorksScope = { kind: "stream"; stream: string };

export const LOGIC_EXECUTOR_STREAMS = V2_EXECUTOR_STREAM_LABELS;

/** Имена стримов в БД → область в UI (для сопоставления с существующими назначениями). */
const DB_STREAM_TO_AREA: Record<string, string> = V2_DB_STREAM_TO_EXECUTOR_AREA;

const AREA_TO_DB_STREAMS: Record<string, string[]> = {
	"Источники данных": ["ИД. Внутренний", "ИД. Внешний", "Источники данных"],
	ПиРМ: ["ПиРМ", "ПиРМ (правила и развитие модели)"],
};

export const ARCH_COMPONENT_RECOMMENDED_STREAMS: Record<string, string[]> = {
	"Система-источник": ["Источники данных", "ПиРМ"],
	"Объект / Витрина данных": ["Источники данных", "ДАДМ"],
	"Объект данных": ["Источники данных", "ДАДМ"],
	"Процесс обработки данных": ["Источники данных", "Потоковые данные"],
	Модель: ["Контроль моделей", "ПиРМ"],
	"Модельный сервис": ["ДАДМ", "Цифровые агенты"],
};

export function streamDisplayLabel(stream: string): string {
	return DB_STREAM_TO_AREA[stream] ?? stream;
}

export function streamAreaKey(stream: string): string {
	return DB_STREAM_TO_AREA[stream] ?? stream;
}

export function resolveScopeStreams(scope: LogicWorksScope): string[] {
	return AREA_TO_DB_STREAMS[scope.stream] ?? [scope.stream];
}

export function scopeLabel(scope: LogicWorksScope): string {
	return scope.stream;
}

export function scopeSubtitle(_scope: LogicWorksScope): string {
	return "стрим-исполнитель";
}

export function workAssignedToScope(
	streams: string[],
	scopeStreams: string[],
): boolean {
	return streams.some(
		(s) =>
			scopeStreams.includes(s) ||
			scopeStreams.includes(streamAreaKey(s)),
	);
}

export function pickStreamForScope(
	workStreams: string[],
	scopeStreams: string[],
	preferred: string | null,
): string | null {
	if (preferred && workStreams.includes(preferred)) return preferred;
	const hit = workStreams.find(
		(s) =>
			scopeStreams.includes(s) ||
			scopeStreams.includes(streamAreaKey(s)),
	);
	return hit ?? workStreams[0] ?? null;
}

export function streamColor(stream: string): string {
	const label = streamDisplayLabel(stream);
	if (label === "ДАДМ") return "#2f6bd8";
	if (label === "ПиРМ") return "#e07b16";
	if (label.includes("Контроль")) return "#7c5cd6";
	if (label.includes("Источник")) return "#1f8a4d";
	if (label.includes("Цифровые агент")) return "#8b5cf6";
	if (label.includes("Потоков")) return "#0ea5e9";
	return "#64748b";
}

export function recommendedStreamsForComponent(
	archComponentType: string,
): string[] {
	return ARCH_COMPONENT_RECOMMENDED_STREAMS[archComponentType] ?? ["ПиРМ"];
}

export function isWorkAssignedToLogicStream(
	workStreams: string[],
	logicStream: string,
): boolean {
	const dbStreams = AREA_TO_DB_STREAMS[logicStream] ?? [logicStream];
	return workStreams.some(
		(s) => dbStreams.includes(s) || streamAreaKey(s) === logicStream,
	);
}

export function pickDbStreamForLogicStream(
	logicStream: string,
	workStreams: string[],
): string {
	const dbStreams = AREA_TO_DB_STREAMS[logicStream] ?? [logicStream];
	const unassigned = dbStreams.find((s) => !workStreams.includes(s));
	return unassigned ?? dbStreams[0] ?? logicStream;
}

export function resolveDbStreamsForScope(scopeStreams: string[]): string[] {
	return scopeStreams;
}

export function shortenStreamLabel(stream: string, max = 16): string {
	const label = streamDisplayLabel(stream);
	return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

export type { V2ExecutorStreamLabel };
