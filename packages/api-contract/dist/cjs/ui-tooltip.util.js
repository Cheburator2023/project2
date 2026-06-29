"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeUiTooltip = normalizeUiTooltip;
/** Нормализует текст подсказки из uiSchema (`\\n` → перевод строки). */
function normalizeUiTooltip(raw) {
    if (typeof raw !== "string")
        return undefined;
    const text = raw.trim();
    if (!text)
        return undefined;
    return text.replace(/\\n/g, "\n");
}
