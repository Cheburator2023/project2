/** Стрим-исполнитель анкеты (`generalInfo.implementationStream`): ключ в formData / логике. */
export const V2_IMPLEMENTATION_STREAM_CODES = [
	"kmbkcb",
	"rb",
	"ptitpc",
	"finmdl",
	"rnd",
	"idsrc",
	"mdlctl",
	"pirm",
	"strdat",
	"digagt",
] as const;

export type V2ImplementationStreamCode =
	(typeof V2_IMPLEMENTATION_STREAM_CODES)[number];

/** Подписи для UI / справочника (значение в formData — код). */
export const V2_IMPLEMENTATION_STREAM_LABELS: Record<
	V2ImplementationStreamCode,
	string
> = {
	kmbkcb: "Разработка моделей КМБ и КСБ",
	rb: "Моделирование РБ",
	ptitpc: "AI-модели партнерств",
	finmdl: "Финансовое моделирование",
	rnd: "Моделирование RnD",
	idsrc: "Источники данных",
	mdlctl: "Контроль моделей",
	pirm: "Платформы и Решения для моделирования",
	strdat: "Потоковые данные",
	digagt: "Цифровые агенты",
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
