"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugParamCode = slugParamCode;
/** Legacy slug для paramCode из человекочитаемого названия параметра. */
function slugParamCode(name) {
    return name
        .toLowerCase()
        .replace(/[^a-zа-я0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80);
}
