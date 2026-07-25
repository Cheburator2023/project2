/**
 * Каталог стрим-исполнителей (DB-owned): payload items словаря
 * `v2.generalInfo.implementationStream` + resolved DTO для клиента/Nest.
 */
import {
	V2_IMPLEMENTATION_STREAM,
	V2_IMPLEMENTATION_STREAM_CODES,
	V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE,
	V2_IMPLEMENTATION_STREAM_LABELS,
	isV2ImplementationStreamCode,
	type V2ImplementationStreamCode,
} from "./v2-implementation-streams.util";
import {
	V2_MODEL_IMPLEMENTATION_STREAM_CODES,
	V2_MODEL_STREAM_EXECUTOR,
	V2_MODEL_STREAM_UMBRELLA_CODE,
} from "./v2-model-stream-typical-works.constants";

export { V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE };

/** Payload элемента справочника implementationStream. */
export type V2ImplementationStreamPayload = {
	storeCode: true;
	fieldPointer?: string;
	/** Имена стрима в БД типовых работ (нормы / assignments). */
	dbNames: string[];
	/** Legacy UI-подписи executor-стримов. */
	legacyLabels: string[];
	/** Keycloak group / dept aliases → allow-list фильтра. */
	keycloakAliases: string[];
	/**
	 * Дочерний стрим зонтичной группы (общий каталог типовых работ).
	 * Для заводской модели — входит в umbrella «Модельный стрим».
	 */
	isModelStream: boolean;
	/**
	 * Зонтичный / общий стрим: каталог типовых работ на несколько дочерних.
	 * Не выбирается в `generalInfo.implementationStream` анкеты.
	 */
	isUmbrellaStream: boolean;
	/** v1 streamExecutor aliases для фильтра реестра. */
	v1Labels: string[];
};

export type V2ImplementationStreamCatalogEntry = {
	code: string;
	label: string;
	order: number;
	isActive: boolean;
	payload: V2ImplementationStreamPayload;
};

const FIELD_POINTER = "/generalInfo/implementationStream";

/** Factory DB-scope / aliases (до загрузки каталога из БД). */
const FACTORY_DB_NAMES: Record<V2ImplementationStreamCode, readonly string[]> = {
	[V2_IMPLEMENTATION_STREAM.KMBKCB]: ["Разработка моделей КМБ и КСБ"],
	[V2_IMPLEMENTATION_STREAM.RB]: ["Моделирование РБ"],
	[V2_IMPLEMENTATION_STREAM.PTITPC]: ["AI-модели партнерств"],
	[V2_IMPLEMENTATION_STREAM.FINMDL]: ["Финансовое моделирование"],
	[V2_IMPLEMENTATION_STREAM.RND]: ["Моделирование RnD"],
	[V2_IMPLEMENTATION_STREAM.IDSRC]: [
		"ИД. Внутренний",
		"ИД. Внешний",
		"Источники данных",
	],
	[V2_IMPLEMENTATION_STREAM.PIRM]: [
		"ПиРМ",
		"ПиРМ (правила и развитие модели)",
		"Платформы и Решения для моделирования",
	],
	[V2_IMPLEMENTATION_STREAM.MDLCTL]: ["Контроль моделей"],
	[V2_IMPLEMENTATION_STREAM.DADM]: [
		"ДАДМ",
		"Витрины данных",
		"Интеграции",
		"Модельный сервис",
		"Сопровождение и поддержка",
		"Архитектура данных",
	],
	[V2_IMPLEMENTATION_STREAM.STRDAT]: ["Потоковые данные"],
	[V2_IMPLEMENTATION_STREAM.DIGAGT]: ["Цифровые агенты"],
};

const FACTORY_LEGACY_LABELS: Partial<
	Record<V2ImplementationStreamCode, readonly string[]>
> = {
	[V2_IMPLEMENTATION_STREAM.PIRM]: ["ПиРМ"],
	[V2_IMPLEMENTATION_STREAM.IDSRC]: ["Источники данных"],
	[V2_IMPLEMENTATION_STREAM.MDLCTL]: ["Контроль моделей"],
	[V2_IMPLEMENTATION_STREAM.DIGAGT]: ["Цифровые агенты"],
	[V2_IMPLEMENTATION_STREAM.STRDAT]: ["Потоковые данные"],
	[V2_IMPLEMENTATION_STREAM.DADM]: ["ДАДМ"],
};

const FACTORY_KEYCLOAK_ALIASES: Partial<
	Record<V2ImplementationStreamCode, readonly string[]>
> = {
	[V2_IMPLEMENTATION_STREAM.KMBKCB]: [
		"Управление моделирования КИБ и СМБ",
	],
	[V2_IMPLEMENTATION_STREAM.PTITPC]: [
		"Управление моделирования партнерств и ИТ-процессов",
	],
	[V2_IMPLEMENTATION_STREAM.RB]: ["Управление моделирования РБ"],
	[V2_IMPLEMENTATION_STREAM.RND]: [
		"Управление перспективных алгоритмов машинного обучения",
	],
	[V2_IMPLEMENTATION_STREAM.FINMDL]: [
		"Управление процессных и финансовых моделей",
	],
};

const FACTORY_V1_LABELS: Partial<
	Record<V2ImplementationStreamCode, readonly string[]>
> = {
	[V2_IMPLEMENTATION_STREAM.KMBKCB]: ["Разработка моделей для КМБ и КСБ"],
	[V2_IMPLEMENTATION_STREAM.PTITPC]: [
		"Модели партнерств и платформы больших данных",
	],
	[V2_IMPLEMENTATION_STREAM.RB]: ["Моделирование РБ"],
	[V2_IMPLEMENTATION_STREAM.RND]: ["Моделирование RnD"],
	[V2_IMPLEMENTATION_STREAM.FINMDL]: ["Финансовое моделирование"],
};

function asStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	const result: string[] = [];
	for (const item of value) {
		if (typeof item !== "string") continue;
		const trimmed = item.trim();
		if (trimmed && !result.includes(trimmed)) result.push(trimmed);
	}
	return result;
}

export function buildFactoryImplementationStreamPayload(
	code: V2ImplementationStreamCode,
): V2ImplementationStreamPayload {
	const label = V2_IMPLEMENTATION_STREAM_LABELS[code];
	const dbNames = [...(FACTORY_DB_NAMES[code] ?? [])];
	if (label && !dbNames.includes(label)) dbNames.unshift(label);
	return {
		storeCode: true,
		fieldPointer: FIELD_POINTER,
		dbNames,
		legacyLabels: [...(FACTORY_LEGACY_LABELS[code] ?? [])],
		keycloakAliases: [...(FACTORY_KEYCLOAK_ALIASES[code] ?? [])],
		isModelStream: (V2_MODEL_IMPLEMENTATION_STREAM_CODES as readonly string[]).includes(
			code,
		),
		isUmbrellaStream: false,
		v1Labels: [...(FACTORY_V1_LABELS[code] ?? [])],
	};
}

/** Заводской зонтичный стрим «Модельный стрим» (реестр + soft-sync). */
export function buildFactoryModelUmbrellaStreamCatalogEntry(): V2ImplementationStreamCatalogEntry {
	return {
		code: V2_MODEL_STREAM_UMBRELLA_CODE,
		label: V2_MODEL_STREAM_EXECUTOR,
		order: -1,
		isActive: true,
		payload: {
			storeCode: true,
			fieldPointer: FIELD_POINTER,
			dbNames: [V2_MODEL_STREAM_EXECUTOR, "Модельные стримы"],
			legacyLabels: [V2_MODEL_STREAM_EXECUTOR, "Модельные стримы"],
			keycloakAliases: [],
			isModelStream: false,
			isUmbrellaStream: true,
			v1Labels: [],
		},
	};
}

/** Factory entries для seed / soft-sync / fallback до загрузки БД. */
export function buildFactoryImplementationStreamCatalog(): V2ImplementationStreamCatalogEntry[] {
	const children = V2_IMPLEMENTATION_STREAM_CODES.map((code, order) => ({
		code,
		label: V2_IMPLEMENTATION_STREAM_LABELS[code],
		order,
		isActive: true,
		payload: buildFactoryImplementationStreamPayload(code),
	}));
	return [buildFactoryModelUmbrellaStreamCatalogEntry(), ...children];
}

export function parseImplementationStreamPayload(
	raw: unknown,
	options?: { label?: string; code?: string },
): V2ImplementationStreamPayload {
	const record =
		raw && typeof raw === "object" && !Array.isArray(raw)
			? (raw as Record<string, unknown>)
			: {};
	const label = options?.label?.trim() ?? "";
	const code = options?.code?.trim() ?? "";
	let dbNames = asStringArray(record.dbNames);
	if (dbNames.length === 0) {
		// Канон для назначений типовых работ: код (как в uiSchema.streamExecutor),
		// плюс подпись для обратной совместимости / отображения.
		if (code) dbNames.push(code);
		if (label && !dbNames.includes(label)) dbNames.push(label);
	}
	const isUmbrellaStream =
		record.isUmbrellaStream === true ||
		code === V2_MODEL_STREAM_UMBRELLA_CODE;
	return {
		storeCode: true,
		fieldPointer:
			typeof record.fieldPointer === "string" && record.fieldPointer.trim()
				? record.fieldPointer.trim()
				: FIELD_POINTER,
		dbNames,
		legacyLabels: asStringArray(record.legacyLabels),
		keycloakAliases: asStringArray(record.keycloakAliases),
		isModelStream: !isUmbrellaStream && record.isModelStream === true,
		isUmbrellaStream,
		v1Labels: asStringArray(record.v1Labels),
	};
}

export function normalizeImplementationStreamCatalogEntry(input: {
	code: string;
	label: string;
	order?: number;
	isActive?: boolean;
	payload?: unknown;
}): V2ImplementationStreamCatalogEntry | null {
	const code = input.code.trim();
	const label = input.label.trim();
	if (!code || !label) return null;
	return {
		code,
		label,
		order: typeof input.order === "number" && Number.isFinite(input.order)
			? input.order
			: 0,
		isActive: input.isActive !== false,
		payload: parseImplementationStreamPayload(input.payload, { label, code }),
	};
}

/** Валидация кода стрима (formData / streamExecutor): 1–6 символов, [a-z0-9]. */
export function isValidImplementationStreamCodeFormat(code: string): boolean {
	return /^[a-z0-9]{1,6}$/.test(code.trim());
}

export function findImplementationStreamCatalogEntry(
	value: string,
	catalog: readonly V2ImplementationStreamCatalogEntry[],
): V2ImplementationStreamCatalogEntry | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	for (const entry of catalog) {
		if (!entry.isActive && entry.code !== trimmed) continue;
		if (entry.code === trimmed || entry.label === trimmed) return entry;
		if (entry.payload.dbNames.includes(trimmed)) return entry;
		if (entry.payload.legacyLabels.includes(trimmed)) return entry;
		if (entry.payload.v1Labels.includes(trimmed)) return entry;
		if (entry.payload.keycloakAliases.includes(trimmed)) return entry;
	}
	return null;
}

/** Scope DB-имён для фильтра типовых работ по коду/подписи стрима. */
export function resolveCatalogEntryScopeStreams(
	entry: V2ImplementationStreamCatalogEntry,
): string[] {
	const result: string[] = [];
	const push = (value: string) => {
		const trimmed = value.trim();
		if (trimmed && !result.includes(trimmed)) result.push(trimmed);
	};
	push(entry.code);
	push(entry.label);
	for (const name of entry.payload.dbNames) push(name);
	for (const name of entry.payload.legacyLabels) push(name);
	if (entry.payload.isModelStream || entry.payload.isUmbrellaStream) {
		push(V2_MODEL_STREAM_EXECUTOR);
		push("Модельные стримы");
		push(V2_MODEL_STREAM_UMBRELLA_CODE);
	}
	return result;
}

export function resolveModelStreamCatalogScopeFromEntries(
	catalog: readonly V2ImplementationStreamCatalogEntry[],
): string[] {
	const result: string[] = [
		V2_MODEL_STREAM_EXECUTOR,
		"Модельные стримы",
		V2_MODEL_STREAM_UMBRELLA_CODE,
	];
	for (const entry of catalog) {
		if (!entry.isActive) continue;
		if (!entry.payload.isModelStream && !entry.payload.isUmbrellaStream) {
			continue;
		}
		for (const name of resolveCatalogEntryScopeStreams(entry)) {
			if (!result.includes(name)) result.push(name);
		}
	}
	return result;
}

/** Зонтичный стрим (payload или заводской код mdls). */
export function isUmbrellaStreamCatalogEntry(
	entry: V2ImplementationStreamCatalogEntry,
): boolean {
	return entry.payload.isUmbrellaStream === true;
}

/** Заводские коды, которые нельзя удалить из реестра. */
export function isFactoryProtectedStreamCode(code: string): boolean {
	const trimmed = code.trim();
	return (
		isV2ImplementationStreamCode(trimmed) ||
		trimmed === V2_MODEL_STREAM_UMBRELLA_CODE
	);
}

/** Каноническое DB-имя для назначения типовой работы. */
export function resolveCatalogDbExecutorName(
	entry: V2ImplementationStreamCatalogEntry,
): string {
	if (entry.payload.isUmbrellaStream) {
		return entry.payload.dbNames[0] ?? entry.label;
	}
	// Кастомные стримы: код совпадает с ui:options.streamExecutor стрим-блока.
	// Заводские — первое dbNames (исторические русские имена в БД).
	if (!isV2ImplementationStreamCode(entry.code)) {
		return entry.code;
	}
	return entry.payload.dbNames[0] ?? entry.label;
}

/** Alias-map для stream filter: keycloak/dept → [code, label, v1…]. */
export function buildStreamFilterAliasMap(
	catalog: readonly V2ImplementationStreamCatalogEntry[],
): Record<string, readonly string[]> {
	const map: Record<string, string[]> = {};
	const add = (key: string, values: readonly string[]) => {
		const trimmed = key.trim();
		if (!trimmed) return;
		const bucket = map[trimmed] ?? (map[trimmed] = []);
		for (const value of values) {
			const v = value.trim();
			if (v && !bucket.includes(v)) bucket.push(v);
		}
	};

	for (const entry of catalog) {
		if (!entry.isActive) continue;
		const aliases = [
			entry.code,
			entry.label,
			...entry.payload.v1Labels,
			...entry.payload.dbNames,
			...entry.payload.legacyLabels,
		];
		add(entry.code, aliases);
		for (const kc of entry.payload.keycloakAliases) {
			add(kc, aliases);
		}
	}
	return map;
}

export function catalogCodes(
	catalog: readonly V2ImplementationStreamCatalogEntry[],
	options?: { activeOnly?: boolean; includeUmbrella?: boolean },
): string[] {
	const activeOnly = options?.activeOnly !== false;
	const includeUmbrella = options?.includeUmbrella === true;
	return catalog
		.filter((entry) => (activeOnly ? entry.isActive : true))
		.filter((entry) => includeUmbrella || !entry.payload.isUmbrellaStream)
		.map((entry) => entry.code);
}

/** Коды/подписи для enum `implementationStream` в анкете (без зонтичных). */
export function catalogEnumPair(
	catalog: readonly V2ImplementationStreamCatalogEntry[],
): { enums: string[]; enumNames: string[] } {
	const active = catalog
		.filter((entry) => entry.isActive && !entry.payload.isUmbrellaStream)
		.slice()
		.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "ru"));
	return {
		enums: active.map((entry) => entry.code),
		enumNames: active.map((entry) => entry.label),
	};
}
