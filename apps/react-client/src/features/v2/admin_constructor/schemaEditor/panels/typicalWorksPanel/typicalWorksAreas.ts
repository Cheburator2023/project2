/** Стримы-исполнители в редакторе логики типовых работ. */

import {
	V2_DB_STREAM_TO_EXECUTOR_AREA,
	V2_EXECUTOR_STREAM_LABELS,
	type V2ExecutorStreamLabel,
} from "@smart-anketa/api-contract";

export type LogicWorksScope =
	| { kind: "stream"; stream: string }
	| { kind: "all" };

export const ALL_LOGIC_WORKS_SCOPE: LogicWorksScope = { kind: "all" };

export const LOGIC_EXECUTOR_STREAMS = V2_EXECUTOR_STREAM_LABELS;

export function isAllLogicWorksScope(
	scope: LogicWorksScope,
): scope is { kind: "all" } {
	return scope.kind === "all";
}

export const DEFAULT_LOGIC_STREAM = "Источники данных" as const;

export const DEFAULT_SCOPE: LogicWorksScope = ALL_LOGIC_WORKS_SCOPE;

export function scopeStreamExecutor(
	scope: LogicWorksScope,
	fallback: string = LOGIC_EXECUTOR_STREAMS[0],
): string {
	return scope.kind === "all" ? fallback : scope.stream;
}

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
	if (scope.kind === "all") {
		return LOGIC_EXECUTOR_STREAMS.flatMap(
			(stream) => AREA_TO_DB_STREAMS[stream] ?? [stream],
		);
	}
	return AREA_TO_DB_STREAMS[scope.stream] ?? [scope.stream];
}

export function workMatchesLogicScope(
	workStreams: string[],
	scope: LogicWorksScope,
): boolean {
	if (scope.kind === "all") return true;
	return workAssignedToScope(workStreams, resolveScopeStreams(scope));
}

export function scopeLabel(scope: LogicWorksScope): string {
	return scope.kind === "all" ? "Все области" : scope.stream;
}

export function scopeSubtitle(scope: LogicWorksScope): string {
	return scope.kind === "all" ? "все области" : "стрим-исполнитель";
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

/**
 * Стрим для нового назначения. Разделение внутр/внеш убрано — назначаем на
 * канонический стрим области (её метка == имя стрима в БД), а не на legacy-стримы.
 */
export function pickDbStreamForLogicStream(
	logicStream: string,
	_workStreams: string[],
): string {
	return logicStream;
}

export function resolveDbStreamsForScope(scopeStreams: string[]): string[] {
	return scopeStreams;
}

export function shortenStreamLabel(stream: string, max = 16): string {
	const label = streamDisplayLabel(stream);
	return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

export type { V2ExecutorStreamLabel };
