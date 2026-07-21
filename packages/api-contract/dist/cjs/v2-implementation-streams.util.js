"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE = exports.V2_IMPLEMENTATION_STREAM_LABELS = exports.V2_IMPLEMENTATION_STREAM_CODES = exports.V2_IMPLEMENTATION_STREAM = void 0;
exports.isV2ImplementationStreamCode = isV2ImplementationStreamCode;
exports.resolveImplementationStreamLabel = resolveImplementationStreamLabel;
exports.buildImplementationStreamEnumPair = buildImplementationStreamEnumPair;
/** Именованные коды стрим-исполнителя (значение = код в formData / логике). */
exports.V2_IMPLEMENTATION_STREAM = {
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
};
/** Стрим-исполнитель анкеты (`generalInfo.implementationStream`): ключ в formData / логике. */
exports.V2_IMPLEMENTATION_STREAM_CODES = [
    exports.V2_IMPLEMENTATION_STREAM.KMBKCB,
    exports.V2_IMPLEMENTATION_STREAM.RB,
    exports.V2_IMPLEMENTATION_STREAM.PTITPC,
    exports.V2_IMPLEMENTATION_STREAM.FINMDL,
    exports.V2_IMPLEMENTATION_STREAM.RND,
    exports.V2_IMPLEMENTATION_STREAM.IDSRC,
    exports.V2_IMPLEMENTATION_STREAM.MDLCTL,
    exports.V2_IMPLEMENTATION_STREAM.DADM,
    exports.V2_IMPLEMENTATION_STREAM.PIRM,
    exports.V2_IMPLEMENTATION_STREAM.STRDAT,
    exports.V2_IMPLEMENTATION_STREAM.DIGAGT,
];
/** Подписи для UI / справочника (значение в formData — код). */
exports.V2_IMPLEMENTATION_STREAM_LABELS = {
    [exports.V2_IMPLEMENTATION_STREAM.KMBKCB]: "Разработка моделей КМБ и КСБ",
    [exports.V2_IMPLEMENTATION_STREAM.RB]: "Моделирование РБ",
    [exports.V2_IMPLEMENTATION_STREAM.PTITPC]: "AI-модели партнерств",
    [exports.V2_IMPLEMENTATION_STREAM.FINMDL]: "Финансовое моделирование",
    [exports.V2_IMPLEMENTATION_STREAM.RND]: "Моделирование RnD",
    [exports.V2_IMPLEMENTATION_STREAM.IDSRC]: "Источники данных",
    [exports.V2_IMPLEMENTATION_STREAM.MDLCTL]: "Контроль моделей",
    [exports.V2_IMPLEMENTATION_STREAM.DADM]: "ДАДМ",
    [exports.V2_IMPLEMENTATION_STREAM.PIRM]: "Платформы и Решения для моделирования",
    [exports.V2_IMPLEMENTATION_STREAM.STRDAT]: "Потоковые данные",
    [exports.V2_IMPLEMENTATION_STREAM.DIGAGT]: "Цифровые агенты",
};
exports.V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE = "v2.generalInfo.implementationStream";
function isV2ImplementationStreamCode(value) {
    return exports.V2_IMPLEMENTATION_STREAM_CODES.includes(value);
}
function resolveImplementationStreamLabel(code) {
    if (isV2ImplementationStreamCode(code)) {
        return exports.V2_IMPLEMENTATION_STREAM_LABELS[code];
    }
    return code;
}
/** Пары для JSON Schema enum / enumNames и seed справочника. */
function buildImplementationStreamEnumPair() {
    return {
        enums: [...exports.V2_IMPLEMENTATION_STREAM_CODES],
        enumNames: exports.V2_IMPLEMENTATION_STREAM_CODES.map((code) => exports.V2_IMPLEMENTATION_STREAM_LABELS[code]),
    };
}
