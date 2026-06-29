"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_DATA_TRANSFER_DEFAULT_SECTIONS = exports.V2_DATA_TRANSFER_SECTION_LABELS = exports.V2_DATA_TRANSFER_SECTIONS = void 0;
exports.parseV2DataTransferSections = parseV2DataTransferSections;
exports.serializeV2DataTransferSections = serializeV2DataTransferSections;
exports.V2_DATA_TRANSFER_SECTIONS = [
    "templates",
    "dictionaries",
    "typicalWorks",
    "questionnaires",
];
exports.V2_DATA_TRANSFER_SECTION_LABELS = {
    templates: "Шаблоны схем",
    dictionaries: "Справочники",
    typicalWorks: "Типовые работы",
    questionnaires: "Анкеты v2",
};
exports.V2_DATA_TRANSFER_DEFAULT_SECTIONS = [
    ...exports.V2_DATA_TRANSFER_SECTIONS,
];
function parseV2DataTransferSections(raw) {
    if (raw == null || raw === "" || raw === "all") {
        return [...exports.V2_DATA_TRANSFER_DEFAULT_SECTIONS];
    }
    const parts = Array.isArray(raw)
        ? raw
        : raw.split(",").map((part) => part.trim());
    const picked = parts.filter((part) => exports.V2_DATA_TRANSFER_SECTIONS.includes(part));
    return picked.length > 0 ? picked : [...exports.V2_DATA_TRANSFER_DEFAULT_SECTIONS];
}
function serializeV2DataTransferSections(sections) {
    return sections.join(",");
}
