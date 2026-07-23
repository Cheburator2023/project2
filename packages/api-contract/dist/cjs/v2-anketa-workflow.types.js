"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_ANKETA_MAIN_SECTION_IDS = exports.V2_ANKETA_SECTION_STATUS_VALUES = exports.V2_ANKETA_GLOBAL_STATUS_VALUES = void 0;
/** Глобальный статус заполнения анкеты. */
exports.V2_ANKETA_GLOBAL_STATUS_VALUES = [
    "Черновик",
    "Заполнено",
    "Утверждена",
];
/** Локальный статус раздела (линейный, без отката). */
exports.V2_ANKETA_SECTION_STATUS_VALUES = [
    "Создано",
    "В работе",
    "Заполнено",
];
/** Идентификаторы основных разделов анкеты. */
exports.V2_ANKETA_MAIN_SECTION_IDS = [
    "generalInfo",
    "detailInfo",
    "streamDataSources",
    "streamModelControl",
];
