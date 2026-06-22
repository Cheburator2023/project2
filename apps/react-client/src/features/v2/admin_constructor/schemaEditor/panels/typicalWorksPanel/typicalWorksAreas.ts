/** Стримы и группы — как в макете аналитика (sa-formulas.js). */

export type LogicWorksViewMode = "streams" | "matrix" | "catalog";

export type LogicWorksScope =
	| { kind: "stream"; stream: string }
	| { kind: "group"; groupId: string };

export const LOGIC_EXECUTOR_STREAMS = [
	"Источники данных",
	"Витрины данных",
	"Интеграции",
	"Контроль моделей",
	"ПиРМ (правила и развитие модели)",
	"Модельный сервис",
	"Сопровождение и поддержка",
	"Архитектура данных",
] as const;

export const LOGIC_STREAM_GROUPS = [
	{
		id: "g_data",
		name: "Данные (ИД + Витрины + Интеграции)",
		streams: ["Источники данных", "Витрины данных", "Интеграции"],
	},
	{
		id: "g_model",
		name: "Моделирование (КМ + ПиРМ + МС)",
		streams: [
			"Контроль моделей",
			"ПиРМ (правила и развитие модели)",
			"Модельный сервис",
		],
	},
	{
		id: "g_ops",
		name: "Эксплуатация (Сопровождение + Арх.)",
		streams: ["Сопровождение и поддержка", "Архитектура данных"],
	},
] as const;

/** Имена стримов в БД → бизнес-область в UI. */
const DB_STREAM_TO_AREA: Record<string, string> = {
	"ИД. Внутренний": "Источники данных",
	"ИД. Внешний": "Источники данных",
};

const AREA_TO_DB_STREAMS: Record<string, string[]> = {
	"Источники данных": ["ИД. Внутренний", "ИД. Внешний", "Источники данных"],
};

export const ARCH_COMPONENT_RECOMMENDED_STREAMS: Record<string, string[]> = {
	"Система-источник": ["Источники данных", "ПиРМ (правила и развитие модели)"],
	"Объект / Витрина данных": ["Источники данных", "Витрины данных"],
	"Объект данных": ["Источники данных", "Витрины данных"],
	"Процесс обработки данных": ["Источники данных", "Интеграции"],
	Модель: ["Контроль моделей", "ПиРМ (правила и развитие модели)"],
	"Модельный сервис": ["Модельный сервис", "Сопровождение и поддержка"],
};

export function streamDisplayLabel(stream: string): string {
	return DB_STREAM_TO_AREA[stream] ?? stream;
}

export function streamAreaKey(stream: string): string {
	return DB_STREAM_TO_AREA[stream] ?? stream;
}

export function resolveScopeStreams(scope: LogicWorksScope): string[] {
	if (scope.kind === "group") {
		const group = LOGIC_STREAM_GROUPS.find((g) => g.id === scope.groupId);
		if (!group) return [];
		return group.streams.flatMap(
			(s) => AREA_TO_DB_STREAMS[s] ?? [s],
		);
	}
	return AREA_TO_DB_STREAMS[scope.stream] ?? [scope.stream];
}

export function scopeLabel(scope: LogicWorksScope): string {
	if (scope.kind === "group") {
		return (
			LOGIC_STREAM_GROUPS.find((g) => g.id === scope.groupId)?.name ??
			"Группа стримов"
		);
	}
	return scope.stream;
}

export function scopeSubtitle(scope: LogicWorksScope): string {
	if (scope.kind === "group") {
		const group = LOGIC_STREAM_GROUPS.find((g) => g.id === scope.groupId);
		return group ? `группа · ${group.streams.length} стрима` : "группа";
	}
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
	if (label.includes("Контроль") || label.includes("Модельн")) return "#7c5cd6";
	if (label.includes("Источник") || label.includes("Витрин")) return "#1f8a4d";
	if (label.includes("Интеграц") || label.includes("Архитект")) return "#d2851f";
	return "#2f6bd8";
}

export function recommendedStreamsForComponent(
	archComponentType: string,
): string[] {
	return (
		ARCH_COMPONENT_RECOMMENDED_STREAMS[archComponentType] ?? [
			"ПиРМ (правила и развитие модели)",
		]
	);
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
