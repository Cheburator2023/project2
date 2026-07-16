"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE = exports.V2_IMPLEMENTATION_STREAM_LABELS = exports.V2_IMPLEMENTATION_STREAM_CODES = void 0;
exports.isV2ImplementationStreamCode = isV2ImplementationStreamCode;
exports.resolveImplementationStreamLabel = resolveImplementationStreamLabel;
exports.buildImplementationStreamEnumPair = buildImplementationStreamEnumPair;
/** Стрим-исполнитель анкеты (`generalInfo.implementationStream`): ключ в formData / логике. */
exports.V2_IMPLEMENTATION_STREAM_CODES = [
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
];
/** Подписи для UI / справочника (значение в formData — код). */
exports.V2_IMPLEMENTATION_STREAM_LABELS = {
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
