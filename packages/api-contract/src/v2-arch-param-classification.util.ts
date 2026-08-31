import {
	isV2ArchComponentType,
	type V2ArchComponentType,
} from "./v2-anketa-section-ui.util";

/**
 * Визуальная группировка параметров арх. компонентов.
 * Пути formData / jsonSchema не меняются — только порядок и заголовки.
 */
export const V2_ARCH_PARAM_GROUP_IDS = [
	"common",
	"idsrc_ext",
	"idsrc_int",
	"mdlctl",
	"pirm",
	"model_streams",
] as const;

export type V2ArchParamGroupId = (typeof V2_ARCH_PARAM_GROUP_IDS)[number];

export const V2_ARCH_PARAM_GROUP_LABELS: Record<V2ArchParamGroupId, string> = {
	common: "Общие",
	idsrc_ext: "Источники данных внешние",
	idsrc_int: "Источники данных внутренние",
	mdlctl: "Контроль моделей",
	pirm: "ПиРМ",
	model_streams: "Модельные стримы",
};

/** Арх. компоненты, внутри которых параметры делятся на «Общие» / стримы. */
export const V2_ARCH_PARAM_GROUPING_KINDS = [
	"modelService",
	"dataMart",
	"dataProcess",
	"sourceSystem",
	"model",
] as const satisfies readonly V2ArchComponentType[];

export type V2ArchParamGroupingKind =
	(typeof V2_ARCH_PARAM_GROUPING_KINDS)[number];

export function isV2ArchParamGroupingKind(
	value: unknown,
): value is V2ArchParamGroupingKind {
	return (
		typeof value === "string" &&
		(V2_ARCH_PARAM_GROUPING_KINDS as readonly string[]).includes(value)
	);
}

/**
 * Канонический состав и порядок ключей по группам (таблица классификации).
 * Имена экземпляров («Название …») входят в «Общие» первыми — их нет в таблице,
 * но прятать нельзя: они показываются один раз независимо от стрима.
 */
export const V2_ARCH_PARAM_CLASSIFICATION: Record<
	V2ArchParamGroupingKind,
	Partial<Record<V2ArchParamGroupId, readonly string[]>>
> = {
	modelService: {
		common: ["field_dEVFQVQn", "workType", "field_o_HRj6VO", "prePromEval"],
		mdlctl: ["modelClass", "field_SvNx6iEq"],
		pirm: [
			"field_imxB4YEd",
			"field_kkbRs50S",
			"field_r66ph-79",
			"field_Y2S_XRAQ",
			"field_JcKtx9Mg",
			"field_IGQX_9FN",
			"field_KzzDtkB0",
			"field_-AZPYdbp",
			"field_UNSRK-JY",
		],
	},
	dataMart: {
		common: ["field_zApubb5V", "workType", "field_xva1dRvW"],
		idsrc_ext: [
			"field_0uV7wafS",
			"field_L-WWLDWY",
			"field_N9LFD6Hu",
			"field_fRuMuWtn",
		],
		idsrc_int: ["field_x-1d7wUh", "field_28IPlEQu"],
		pirm: [
			"field_lovKvLZc",
			"field__CwXDnEl",
			"field_saveRawFs",
			"field_w_EN6lWe",
			"metricsCount",
			"field_46LCnfWo",
			"field_rZeUo8a_",
		],
	},
	dataProcess: {
		common: ["field_It-B8PfV", "field_yJ51GkCR", "field_UEzs5Q87"],
		idsrc_ext: [
			"deliveryMode",
			"field_R3Lx-csF",
			"field_C6oqyTPh",
			"confidentialData",
		],
		idsrc_int: ["field_qMxSfHk1"],
		pirm: ["field_HgUCNn6E"],
	},
	sourceSystem: {
		common: ["name", "type", "field_whHc-OoW"],
		idsrc_ext: [
			"field_fJ_7OdE7",
			"field_d3OCFyaC",
			"field_Y_K0Hy0e",
			"field_nE73kPQl",
			"field_tpROQBf5",
			"field_AKLVuyFy",
			"field_4jxR0E0m",
			"field_DBFG7kIN",
			"field_vqqlHbU6",
			"field_9BXQE8SI",
			"field_1ANadh7U",
			"field_3a0vme2u",
			"field_-t8JSf3p",
		],
		idsrc_int: ["field_8pFvwc-v"],
		pirm: [
			"field_LGUdr5mq",
			"field_eIIWBdCg",
			"field_DnB8Ur4I",
			"field_OyRJyJxD",
			"field_xi0W_vl-",
			"field__NUAXSNP",
			"field_nx1zBg1X",
			"field_wluxUVJ9",
			"field_KnIEmMxM",
			"field_TrX4G9Gc",
		],
	},
	model: {
		common: [
			"field_atxiq-UM",
			"workType",
			"readyPromReports",
			"algorithmType",
			"field_jUm5syZf",
			"field_VbI-0aiT",
			"autoML",
		],
		pirm: [
			"field_58TkWuwu",
			"field_CeBkWcQc",
			"field_S23CbRXp",
			"field_S41Rqt5E",
			"field_Ifnu_c_H",
		],
	},
};

/** Параметры «не участвует в расчётах» / не используются ни одним стримом — только «Общие». */
export const V2_ARCH_PARAM_NOT_IN_CALCULATION_KEYS: Record<
	V2ArchParamGroupingKind,
	readonly string[]
> = {
	modelService: [],
	dataMart: [],
	dataProcess: [],
	sourceSystem: [],
	model: [],
};

const KEY_TO_GROUP = {} as Record<
	V2ArchParamGroupingKind,
	ReadonlyMap<string, V2ArchParamGroupId>
>;
for (const kind of V2_ARCH_PARAM_GROUPING_KINDS) {
	const map = new Map<string, V2ArchParamGroupId>();
	const table = V2_ARCH_PARAM_CLASSIFICATION[kind];
	for (const groupId of V2_ARCH_PARAM_GROUP_IDS) {
		for (const key of table[groupId] ?? []) {
			if (map.has(key)) {
				throw new Error(
					`v2-arch-param-classification: ключ «${key}» в ${kind} задан дважды`,
				);
			}
			map.set(key, groupId);
		}
	}
	KEY_TO_GROUP[kind] = map;
}

export type V2ArchParamFieldGroup = {
	id: V2ArchParamGroupId;
	label: string;
	keys: string[];
};

export function classifyArchParamField(
	kind: V2ArchParamGroupingKind,
	fieldKey: string,
): V2ArchParamGroupId {
	return KEY_TO_GROUP[kind].get(fieldKey) ?? "common";
}

export function classifiedArchParamKeys(
	kind: V2ArchParamGroupingKind,
): string[] {
	const table = V2_ARCH_PARAM_CLASSIFICATION[kind];
	const keys: string[] = [];
	for (const groupId of V2_ARCH_PARAM_GROUP_IDS) {
		keys.push(...(table[groupId] ?? []));
	}
	return keys;
}

export function inferV2ArchParamGroupingKind(opts: {
	archComponent?: string | null;
	propertyKeys?: readonly string[];
}): V2ArchParamGroupingKind | null {
	if (isV2ArchParamGroupingKind(opts.archComponent)) {
		return opts.archComponent;
	}
	if (
		opts.archComponent &&
		isV2ArchComponentType(opts.archComponent) &&
		!isV2ArchParamGroupingKind(opts.archComponent)
	) {
		return null;
	}
	const keys = opts.propertyKeys ?? [];
	if (keys.length === 0) return null;

	let best: V2ArchParamGroupingKind | null = null;
	let bestScore = 0;
	let tie = false;
	for (const kind of V2_ARCH_PARAM_GROUPING_KINDS) {
		const score = keys.reduce(
			(n, key) => n + (KEY_TO_GROUP[kind].has(key) ? 1 : 0),
			0,
		);
		if (score > bestScore) {
			best = kind;
			bestScore = score;
			tie = false;
		} else if (score === bestScore && score > 0) {
			tie = true;
		}
	}
	if (tie || bestScore < 2) return null;
	return best;
}

export function buildArchParamFieldGroups(
	kind: V2ArchParamGroupingKind,
	keys: readonly string[],
): V2ArchParamFieldGroup[] {
	const present = new Set(keys);
	const used = new Set<string>();
	const groups: V2ArchParamFieldGroup[] = [];

	for (const groupId of V2_ARCH_PARAM_GROUP_IDS) {
		const tableKeys = (
			V2_ARCH_PARAM_CLASSIFICATION[kind][groupId] ?? []
		).filter((key) => present.has(key));
		for (const key of tableKeys) used.add(key);
		const extraUnknown =
			groupId === "common"
				? keys.filter((key) => !KEY_TO_GROUP[kind].has(key) && !used.has(key))
				: [];
		for (const key of extraUnknown) used.add(key);
		const groupKeys = [...tableKeys, ...extraUnknown];
		if (groupKeys.length === 0) continue;
		groups.push({
			id: groupId,
			label: V2_ARCH_PARAM_GROUP_LABELS[groupId],
			keys: groupKeys,
		});
	}

	return groups;
}

export function orderArchParamFieldKeys(
	kind: V2ArchParamGroupingKind,
	keys: readonly string[],
): string[] {
	return buildArchParamFieldGroups(kind, keys).flatMap((group) => group.keys);
}

export function resolveArchParamGroupLabelAtIndex(
	kind: V2ArchParamGroupingKind,
	orderedKeys: readonly string[],
	index: number,
): string | null {
	const key = orderedKeys[index];
	if (!key) return null;
	const group = classifyArchParamField(kind, key);
	if (index > 0) {
		const prevKey = orderedKeys[index - 1];
		if (prevKey && classifyArchParamField(kind, prevKey) === group) {
			return null;
		}
	}
	return V2_ARCH_PARAM_GROUP_LABELS[group];
}

export function resolveArchParamFieldGroupsForObject(opts: {
	archComponent?: string | null;
	propertyKeys: readonly string[];
}): V2ArchParamFieldGroup[] | null {
	const kind = inferV2ArchParamGroupingKind(opts);
	if (!kind) return null;
	return buildArchParamFieldGroups(kind, opts.propertyKeys);
}

export function mapArchParamFieldGroups<T>(
	kind: V2ArchParamGroupingKind,
	items: readonly T[],
	getKey: (item: T) => string,
): Array<{ id: V2ArchParamGroupId; label: string; items: T[] }> {
	const byKey = new Map<string, T>();
	const keys: string[] = [];
	for (const item of items) {
		const key = getKey(item);
		keys.push(key);
		if (!byKey.has(key)) byKey.set(key, item);
	}
	return buildArchParamFieldGroups(kind, keys).map((group) => ({
		id: group.id,
		label: group.label,
		items: group.keys
			.map((key) => byKey.get(key))
			.filter((item): item is T => item !== undefined),
	}));
}
