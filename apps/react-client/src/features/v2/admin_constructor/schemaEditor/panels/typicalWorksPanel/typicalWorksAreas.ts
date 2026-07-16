/** Стримы-исполнители в редакторе логики типовых работ (коды V2_IMPLEMENTATION_STREAM). */

import {
	normalizeStreamBlockExecutor,
	resolveLogicStreamDbExecutor,
	resolveLogicStreamForDbExecutor,
	resolveStreamBlockExecutorLabel,
	resolveStreamBlockExecutorScopeStreams,
	resolveStreamBlockExecutorsLabel,
	V2_IMPLEMENTATION_STREAM,
	V2_IMPLEMENTATION_STREAM_CODES,
	type V2ImplementationStreamCode,
} from "@smart-anketa/api-contract";

export type LogicWorksScope =
	| { kind: "stream"; streams: string[] }
	| { kind: "all" };

export type LogicStreamCode = V2ImplementationStreamCode;

export const ALL_LOGIC_WORKS_SCOPE: LogicWorksScope = { kind: "all" };

/** Коды стримов для фильтра области и матрицы назначений. */
export const LOGIC_EXECUTOR_STREAMS = V2_IMPLEMENTATION_STREAM_CODES;

export function isAllLogicWorksScope(
	scope: LogicWorksScope,
): scope is { kind: "all" } {
	return scope.kind === "all";
}

export function isStreamLogicWorksScope(
	scope: LogicWorksScope,
): scope is { kind: "stream"; streams: string[] } {
	return scope.kind === "stream";
}

export const DEFAULT_LOGIC_STREAM = V2_IMPLEMENTATION_STREAM.IDSRC;

export const DEFAULT_SCOPE: LogicWorksScope = {
	kind: "stream",
	streams: [DEFAULT_LOGIC_STREAM],
};

export function scopeStreamExecutor(
	scope: LogicWorksScope,
	fallback: string = DEFAULT_LOGIC_STREAM,
): string {
	return scope.kind === "all" ? fallback : (scope.streams[0] ?? fallback);
}

const ARCH_COMPONENT_RECOMMENDED_STREAMS: Record<
	string,
	V2ImplementationStreamCode[]
> = {
	"Система-источник": [
		V2_IMPLEMENTATION_STREAM.IDSRC,
		V2_IMPLEMENTATION_STREAM.PIRM,
	],
	"Объект / Витрина данных": [
		V2_IMPLEMENTATION_STREAM.IDSRC,
		V2_IMPLEMENTATION_STREAM.DADM,
	],
	"Объект данных": [
		V2_IMPLEMENTATION_STREAM.IDSRC,
		V2_IMPLEMENTATION_STREAM.DADM,
	],
	"Процесс обработки данных": [
		V2_IMPLEMENTATION_STREAM.IDSRC,
		V2_IMPLEMENTATION_STREAM.STRDAT,
	],
	Модель: [
		V2_IMPLEMENTATION_STREAM.MDLCTL,
		V2_IMPLEMENTATION_STREAM.PIRM,
	],
	"Модельный сервис": [
		V2_IMPLEMENTATION_STREAM.DADM,
		V2_IMPLEMENTATION_STREAM.DIGAGT,
	],
};

export function streamDisplayLabel(stream: string): string {
	return resolveStreamBlockExecutorLabel(stream);
}

/** Код implementationStream для DB-имени или кода стрима. */
export function streamAreaKey(stream: string): string {
	return resolveLogicStreamForDbExecutor(stream) ?? stream;
}

export function resolveScopeStreams(scope: LogicWorksScope): string[] {
	if (scope.kind === "all") {
		return LOGIC_EXECUTOR_STREAMS.flatMap((code) => [
			...resolveStreamBlockExecutorScopeStreams(code),
		]);
	}
	return scope.streams.flatMap((stream) => [
		...resolveStreamBlockExecutorScopeStreams(stream),
	]);
}

export function workMatchesLogicScope(
	workStreams: string[],
	scope: LogicWorksScope,
): boolean {
	if (scope.kind === "all") return true;
	return workAssignedToScope(workStreams, resolveScopeStreams(scope));
}

export function scopeLabel(scope: LogicWorksScope): string {
	if (scope.kind === "all") return "Все области";
	if (scope.streams.length === 1) {
		return streamDisplayLabel(scope.streams[0]);
	}
	return resolveStreamBlockExecutorsLabel(scope.streams);
}

export function scopeSubtitle(scope: LogicWorksScope): string {
	if (scope.kind === "all") return "все области";
	if (scope.streams.length === 1) return "стрим-исполнитель";
	return `${scope.streams.length} стрима`;
}

export function isStreamSelectedInScope(
	scope: LogicWorksScope,
	stream: string,
): boolean {
	if (scope.kind === "all") return false;
	const code = normalizeStreamBlockExecutor(stream);
	return scope.streams.some(
		(item) =>
			item === stream ||
			(code != null && normalizeStreamBlockExecutor(item) === code),
	);
}

export function toggleStreamInScope(
	scope: LogicWorksScope,
	stream: string,
): LogicWorksScope {
	if (scope.kind === "all") {
		return { kind: "stream", streams: [stream] };
	}
	const selected = isStreamSelectedInScope(scope, stream);
	if (selected) {
		const code = normalizeStreamBlockExecutor(stream);
		const next = scope.streams.filter(
			(item) =>
				item !== stream &&
				(code == null || normalizeStreamBlockExecutor(item) !== code),
		);
		if (next.length === 0) return ALL_LOGIC_WORKS_SCOPE;
		return { kind: "stream", streams: next };
	}
	return { kind: "stream", streams: [...scope.streams, stream] };
}

export function workAssignedToScope(
	streams: string[],
	scopeStreams: string[],
): boolean {
	const scopeCodes = new Set(
		scopeStreams
			.map((value) => normalizeStreamBlockExecutor(value))
			.filter((value): value is V2ImplementationStreamCode => value != null),
	);
	return streams.some((stream) => {
		const code = resolveLogicStreamForDbExecutor(stream);
		if (code && scopeCodes.has(code)) return true;
		return (
			scopeStreams.includes(stream) ||
			scopeStreams.includes(streamAreaKey(stream))
		);
	});
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
	const code = normalizeStreamBlockExecutor(stream);
	switch (code) {
		case V2_IMPLEMENTATION_STREAM.DADM:
			return "#2f6bd8";
		case V2_IMPLEMENTATION_STREAM.PIRM:
			return "#e07b16";
		case V2_IMPLEMENTATION_STREAM.MDLCTL:
			return "#7c5cd6";
		case V2_IMPLEMENTATION_STREAM.IDSRC:
			return "#1f8a4d";
		case V2_IMPLEMENTATION_STREAM.DIGAGT:
			return "#8b5cf6";
		case V2_IMPLEMENTATION_STREAM.STRDAT:
			return "#0ea5e9";
		default:
			return "#64748b";
	}
}

export function recommendedStreamsForComponent(
	archComponentType: string,
): V2ImplementationStreamCode[] {
	return (
		ARCH_COMPONENT_RECOMMENDED_STREAMS[archComponentType] ?? [
			V2_IMPLEMENTATION_STREAM.PIRM,
		]
	);
}

export function isWorkAssignedToLogicStream(
	workStreams: string[],
	logicStream: string,
): boolean {
	return workAssignedToScope(
		workStreams,
		resolveStreamBlockExecutorScopeStreams(logicStream),
	);
}

/** DB-имя стрима для нового назначения по коду области логики. */
export function pickDbStreamForLogicStream(
	logicStream: string,
	workStreams: string[],
): string {
	const code = normalizeStreamBlockExecutor(logicStream);
	if (!code) return logicStream.trim();
	const scope = resolveStreamBlockExecutorScopeStreams(code);
	const existing = workStreams.find(
		(stream) =>
			scope.includes(stream) || resolveLogicStreamForDbExecutor(stream) === code,
	);
	if (existing) return existing;
	return resolveLogicStreamDbExecutor(code);
}

export function resolveDbStreamsForScope(scopeStreams: string[]): string[] {
	return scopeStreams;
}

export function shortenStreamLabel(stream: string, max = 16): string {
	const label = streamDisplayLabel(stream);
	return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

export function scopeStreamsPresentInSchema(
	uiSchema: unknown,
	scope: LogicWorksScope,
	isPresent: (stream: string) => boolean,
): { all: boolean; any: boolean; missing: string[] } {
	if (scope.kind === "all") {
		return { all: true, any: true, missing: [] };
	}
	const missing = scope.streams.filter((stream) => !isPresent(stream));
	return {
		all: missing.length === 0,
		any: missing.length < scope.streams.length,
		missing,
	};
}
