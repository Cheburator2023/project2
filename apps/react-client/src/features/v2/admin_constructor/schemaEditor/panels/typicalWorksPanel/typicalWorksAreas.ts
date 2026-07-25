/** Стримы-исполнители в редакторе логики типовых работ (коды V2_IMPLEMENTATION_STREAM). */

import {
	isV2ModelImplementationStreamCode,
	normalizeStreamBlockExecutor,
	normalizeStreamBlockRoles,
	resolveLogicStreamDbExecutor,
	resolveLogicStreamForDbExecutor,
	resolveStreamBlockExecutorLabel,
	resolveStreamBlockExecutorScopeStreams,
	resolveStreamBlockExecutorsLabel,
	resolveStreamBlockRolesLabel,
	V2_IMPLEMENTATION_STREAM,
	V2_IMPLEMENTATION_STREAM_CODES,
	V2_MODEL_IMPLEMENTATION_STREAM_CODES,
	V2_MODEL_STREAM_EXECUTOR,
	V2_STREAM_BLOCK_ROLE_CODES,
	type V2ImplementationStreamCode,
	type V2StreamBlockRoleCode,
} from "@smart-anketa/api-contract";

/** Строка пикера стримов: umbrella «Модельный стрим» + дочерние / обычные. */
export type ExecutorStreamPickerRow =
	| { kind: "umbrella"; value: string; label: string }
	| { kind: "stream"; value: string; nested: boolean };

export type ExecutorStreamPickerUmbrella = {
	value: string;
	label: string;
};

/**
 * Порядок для UI: при первом model-child вставляем umbrella(s), затем детей (nested),
 * остальные стримы — без отступа.
 */
export function buildExecutorStreamPickerRows(
	codes: readonly string[],
	umbrellas: readonly ExecutorStreamPickerUmbrella[] = [
		{ value: V2_MODEL_STREAM_EXECUTOR, label: `${V2_MODEL_STREAM_EXECUTOR} (зонтик)` },
	],
): ExecutorStreamPickerRow[] {
	const modelInCatalog = V2_MODEL_IMPLEMENTATION_STREAM_CODES.filter((code) =>
		codes.includes(code),
	);
	const rows: ExecutorStreamPickerRow[] = [];
	let modelRendered = false;
	for (const code of codes) {
		if (isV2ModelImplementationStreamCode(code)) {
			if (!modelRendered && modelInCatalog.length > 0) {
				modelRendered = true;
				for (const umbrella of umbrellas) {
					rows.push({
						kind: "umbrella",
						value: umbrella.value,
						label: umbrella.label,
					});
				}
				for (const child of modelInCatalog) {
					rows.push({ kind: "stream", value: child, nested: true });
				}
			}
			continue;
		}
		rows.push({ kind: "stream", value: code, nested: false });
	}
	return rows;
}

export type LogicWorksScope =
	| { kind: "stream"; streams: string[]; roles: string[] }
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
): scope is { kind: "stream"; streams: string[]; roles: string[] } {
	return scope.kind === "stream";
}

export const DEFAULT_LOGIC_STREAM = V2_IMPLEMENTATION_STREAM.IDSRC;

export const DEFAULT_SCOPE: LogicWorksScope = ALL_LOGIC_WORKS_SCOPE;

export const LOGIC_STREAM_BLOCK_ROLES = V2_STREAM_BLOCK_ROLE_CODES;

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

export function streamDisplayLabel(
	stream: string,
	catalog?: readonly import("@smart-anketa/api-contract").V2ImplementationStreamCatalogEntry[],
): string {
	return resolveStreamBlockExecutorLabel(stream, catalog);
}

/** Код implementationStream для DB-имени или кода стрима. */
export function streamAreaKey(
	stream: string,
	catalog?: readonly import("@smart-anketa/api-contract").V2ImplementationStreamCatalogEntry[],
): string {
	return resolveLogicStreamForDbExecutor(stream, catalog) ?? stream;
}

export function resolveScopeStreams(
	scope: LogicWorksScope,
	catalog?: readonly import("@smart-anketa/api-contract").V2ImplementationStreamCatalogEntry[],
	streamCodes: readonly string[] = LOGIC_EXECUTOR_STREAMS,
): string[] {
	if (scope.kind === "all") {
		return streamCodes.flatMap((code) => [
			...resolveStreamBlockExecutorScopeStreams(code, catalog),
		]);
	}
	return scope.streams.flatMap((stream) => [
		...resolveStreamBlockExecutorScopeStreams(stream, catalog),
	]);
}

export function workMatchesLogicScope(
	workStreams: string[],
	scope: LogicWorksScope,
	catalog?: readonly import("@smart-anketa/api-contract").V2ImplementationStreamCatalogEntry[],
	streamCodes?: readonly string[],
): boolean {
	if (scope.kind === "all") return true;
	return workAssignedToScope(
		workStreams,
		resolveScopeStreams(scope, catalog, streamCodes),
		catalog,
	);
}

export function scopeLabel(
	scope: LogicWorksScope,
	catalog?: readonly import("@smart-anketa/api-contract").V2ImplementationStreamCatalogEntry[],
): string {
	if (scope.kind === "all") return "Все области";
	const streamPart =
		scope.streams.length === 1
			? streamDisplayLabel(scope.streams[0]!, catalog)
			: resolveStreamBlockExecutorsLabel(scope.streams, catalog);
	const rolePart =
		scope.roles.length > 0 ? resolveStreamBlockRolesLabel(scope.roles) : "";
	if (streamPart && rolePart) return `${streamPart} · ${rolePart}`;
	return streamPart || rolePart || "Область";
}

export function scopeSubtitle(scope: LogicWorksScope): string {
	if (scope.kind === "all") return "все области";
	const parts: string[] = [];
	if (scope.streams.length === 1) parts.push("стрим-исполнитель");
	else if (scope.streams.length > 1) parts.push(`${scope.streams.length} стрима`);
	if (scope.roles.length === 1) parts.push("1 роль");
	else if (scope.roles.length > 1) parts.push(`${scope.roles.length} роли`);
	return parts.join(" · ") || "стрим-исполнитель";
}

export function isRoleSelectedInScope(
	scope: LogicWorksScope,
	role: string,
): boolean {
	if (scope.kind === "all") return false;
	const code = normalizeStreamBlockRoles(role)[0];
	return scope.roles.some(
		(item) =>
			item === role ||
			(code != null && normalizeStreamBlockRoles(item)[0] === code),
	);
}

export function toggleRoleInScope(
	scope: LogicWorksScope,
	role: string,
): LogicWorksScope {
	if (scope.kind === "all") {
		return { kind: "stream", streams: [DEFAULT_LOGIC_STREAM], roles: [role] };
	}
	const selected = isRoleSelectedInScope(scope, role);
	if (selected) {
		const code = normalizeStreamBlockRoles(role)[0];
		const next = scope.roles.filter(
			(item) =>
				item !== role &&
				(code == null || normalizeStreamBlockRoles(item)[0] !== code),
		);
		return { ...scope, roles: next };
	}
	return { ...scope, roles: [...scope.roles, role] };
}

export function roleDisplayLabel(role: string): string {
	return resolveStreamBlockRolesLabel(role) || role;
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
		return { kind: "stream", streams: [stream], roles: [] };
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
		return { kind: "stream", streams: next, roles: scope.roles };
	}
	return { kind: "stream", streams: [...scope.streams, stream], roles: scope.roles };
}

export function workAssignedToScope(
	streams: string[],
	scopeStreams: readonly string[],
	catalog?: readonly import("@smart-anketa/api-contract").V2ImplementationStreamCatalogEntry[],
): boolean {
	const scopeCodes = new Set(
		scopeStreams
			.map((value) => normalizeStreamBlockExecutor(value, catalog))
			.filter((value): value is V2ImplementationStreamCode => value != null),
	);
	return streams.some((stream) => {
		const code = resolveLogicStreamForDbExecutor(stream, catalog);
		if (code && scopeCodes.has(code)) return true;
		return (
			scopeStreams.includes(stream) ||
			scopeStreams.includes(streamAreaKey(stream, catalog))
		);
	});
}

export function pickStreamForScope(
	workStreams: string[],
	scopeStreams: string[],
	preferred: string | null,
	catalog?: readonly import("@smart-anketa/api-contract").V2ImplementationStreamCatalogEntry[],
): string | null {
	if (preferred && workStreams.includes(preferred)) return preferred;
	const hit = workStreams.find(
		(s) =>
			scopeStreams.includes(s) ||
			scopeStreams.includes(streamAreaKey(s, catalog)),
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
	catalog?: readonly import("@smart-anketa/api-contract").V2ImplementationStreamCatalogEntry[],
): boolean {
	return workAssignedToScope(
		workStreams,
		resolveStreamBlockExecutorScopeStreams(logicStream, catalog),
		catalog,
	);
}

/** DB-имя стрима для нового назначения по коду области логики. */
export function pickDbStreamForLogicStream(
	logicStream: string,
	workStreams: string[],
	catalog?: readonly import("@smart-anketa/api-contract").V2ImplementationStreamCatalogEntry[],
): string {
	const code = normalizeStreamBlockExecutor(logicStream, catalog);
	if (!code) return logicStream.trim();
	const scope = resolveStreamBlockExecutorScopeStreams(code, catalog);
	const existing = workStreams.find(
		(stream) =>
			scope.includes(stream) ||
			resolveLogicStreamForDbExecutor(stream, catalog) === code,
	);
	if (existing) return existing;
	return resolveLogicStreamDbExecutor(code, catalog);
}

export function resolveDbStreamsForScope(scopeStreams: string[]): string[] {
	return scopeStreams;
}

export function shortenStreamLabel(
	stream: string,
	max = 16,
	catalog?: readonly import("@smart-anketa/api-contract").V2ImplementationStreamCatalogEntry[],
): string {
	const label = streamDisplayLabel(stream, catalog);
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
