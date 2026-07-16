/** Именованные коды стрим-исполнителя (значение = код в formData / логике). */
export const V2_IMPLEMENTATION_STREAM = {
    KMBKCB: "kmbkcb",
    RB: "rb",
    PTITPC: "ptitpc",
    FINMDL: "finmdl",
    RND: "rnd",
    IDSRC: "idsrc",
    MDLCTL: "mdlctl",
    PIRM: "pirm",
    STRDAT: "strdat",
    DIGAGT: "digagt",
};
/** Стрим-исполнитель анкеты (`generalInfo.implementationStream`): ключ в formData / логике. */
export const V2_IMPLEMENTATION_STREAM_CODES = [
    V2_IMPLEMENTATION_STREAM.KMBKCB,
    V2_IMPLEMENTATION_STREAM.RB,
    V2_IMPLEMENTATION_STREAM.PTITPC,
    V2_IMPLEMENTATION_STREAM.FINMDL,
    V2_IMPLEMENTATION_STREAM.RND,
    V2_IMPLEMENTATION_STREAM.IDSRC,
    V2_IMPLEMENTATION_STREAM.MDLCTL,
    V2_IMPLEMENTATION_STREAM.PIRM,
    V2_IMPLEMENTATION_STREAM.STRDAT,
    V2_IMPLEMENTATION_STREAM.DIGAGT,
];
/** Подписи для UI / справочника (значение в formData — код). */
export const V2_IMPLEMENTATION_STREAM_LABELS = {
    [V2_IMPLEMENTATION_STREAM.KMBKCB]: "Разработка моделей КМБ и КСБ",
    [V2_IMPLEMENTATION_STREAM.RB]: "Моделирование РБ",
    [V2_IMPLEMENTATION_STREAM.PTITPC]: "AI-модели партнерств",
    [V2_IMPLEMENTATION_STREAM.FINMDL]: "Финансовое моделирование",
    [V2_IMPLEMENTATION_STREAM.RND]: "Моделирование RnD",
    [V2_IMPLEMENTATION_STREAM.IDSRC]: "Источники данных",
    [V2_IMPLEMENTATION_STREAM.MDLCTL]: "Контроль моделей",
    [V2_IMPLEMENTATION_STREAM.PIRM]: "Платформы и Решения для моделирования",
    [V2_IMPLEMENTATION_STREAM.STRDAT]: "Потоковые данные",
    [V2_IMPLEMENTATION_STREAM.DIGAGT]: "Цифровые агенты",
};
export const V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE = "v2.generalInfo.implementationStream";
export function isV2ImplementationStreamCode(value) {
    return V2_IMPLEMENTATION_STREAM_CODES.includes(value);
}
export function resolveImplementationStreamLabel(code) {
    if (isV2ImplementationStreamCode(code)) {
        return V2_IMPLEMENTATION_STREAM_LABELS[code];
    }
    return code;
}
/** Пары для JSON Schema enum / enumNames и seed справочника. */
export function buildImplementationStreamEnumPair() {
    return {
        enums: [...V2_IMPLEMENTATION_STREAM_CODES],
        enumNames: V2_IMPLEMENTATION_STREAM_CODES.map((code) => V2_IMPLEMENTATION_STREAM_LABELS[code]),
    };
}
