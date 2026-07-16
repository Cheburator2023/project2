/** Именованные коды стрим-исполнителя (значение = код в formData / логике). */
export const V2_IMPLEMENTATION_STREAM = {
	KMBKCB: "kmbkcb",
	RB: "rb",
	PTITPC: "ptitpc",
	FINMDL: "finmdl",
	RND: "rnd",
	IDSRC: "idsrc",
	MDLCTL: "mdlctl",
	DADM: "dadm",
	PIRM: "pirm",
	STRDAT: "strdat",
	DIGAGT: "digagt",
} as const;

/** Стрим-исполнитель анкеты (`generalInfo.implementationStream`): ключ в formData / логике. */
export const V2_IMPLEMENTATION_STREAM_CODES = [
	V2_IMPLEMENTATION_STREAM.KMBKCB,
	V2_IMPLEMENTATION_STREAM.RB,
	V2_IMPLEMENTATION_STREAM.PTITPC,
	V2_IMPLEMENTATION_STREAM.FINMDL,
	V2_IMPLEMENTATION_STREAM.RND,
	V2_IMPLEMENTATION_STREAM.IDSRC,
	V2_IMPLEMENTATION_STREAM.MDLCTL,
	V2_IMPLEMENTATION_STREAM.DADM,
	V2_IMPLEMENTATION_STREAM.PIRM,
	V2_IMPLEMENTATION_STREAM.STRDAT,
	V2_IMPLEMENTATION_STREAM.DIGAGT,
] as const;

export type V2ImplementationStreamCode =
	(typeof V2_IMPLEMENTATION_STREAM_CODES)[number];

/** Подписи для UI / справочника (значение в formData — код). */
export const V2_IMPLEMENTATION_STREAM_LABELS: Record<
	V2ImplementationStreamCode,
	string
> = {
	[V2_IMPLEMENTATION_STREAM.KMBKCB]: "Разработка моделей КМБ и КСБ",
	[V2_IMPLEMENTATION_STREAM.RB]: "Моделирование РБ",
	[V2_IMPLEMENTATION_STREAM.PTITPC]: "AI-модели партнерств",
	[V2_IMPLEMENTATION_STREAM.FINMDL]: "Финансовое моделирование",
	[V2_IMPLEMENTATION_STREAM.RND]: "Моделирование RnD",
	[V2_IMPLEMENTATION_STREAM.IDSRC]: "Источники данных",
	[V2_IMPLEMENTATION_STREAM.MDLCTL]: "Контроль моделей",
	[V2_IMPLEMENTATION_STREAM.DADM]: "ДАДМ",
	[V2_IMPLEMENTATION_STREAM.PIRM]: "Платформы и Решения для моделирования",
	[V2_IMPLEMENTATION_STREAM.STRDAT]: "Потоковые данные",
	[V2_IMPLEMENTATION_STREAM.DIGAGT]: "Цифровые агенты",
};

export const V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE =
	"v2.generalInfo.implementationStream";

export function isV2ImplementationStreamCode(
	value: string,
): value is V2ImplementationStreamCode {
	return (V2_IMPLEMENTATION_STREAM_CODES as readonly string[]).includes(value);
}

export function resolveImplementationStreamLabel(code: string): string {
	if (isV2ImplementationStreamCode(code)) {
		return V2_IMPLEMENTATION_STREAM_LABELS[code];
	}
	return code;
}

/** Пары для JSON Schema enum / enumNames и seed справочника. */
export function buildImplementationStreamEnumPair(): {
	enums: string[];
	enumNames: string[];
} {
	return {
		enums: [...V2_IMPLEMENTATION_STREAM_CODES],
		enumNames: V2_IMPLEMENTATION_STREAM_CODES.map(
			(code) => V2_IMPLEMENTATION_STREAM_LABELS[code],
		),
	};
}
