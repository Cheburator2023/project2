"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_DATA_TRANSFER_DEFAULT_SECTIONS = exports.V2_DATA_TRANSFER_SECTION_FILE_SLUGS = exports.V2_DATA_TRANSFER_SECTION_LABELS = exports.V2_DATA_TRANSFER_SECTIONS = void 0;
exports.formatV2DataTransferExportTimestamp = formatV2DataTransferExportTimestamp;
exports.buildV2DataTransferExportFilename = buildV2DataTransferExportFilename;
exports.expandV2DataTransferExportSections = expandV2DataTransferExportSections;
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
/** Читаемые фрагменты имён файлов выгрузки по разделам. */
exports.V2_DATA_TRANSFER_SECTION_FILE_SLUGS = {
    templates: "templates",
    dictionaries: "dictionaries",
    typicalWorks: "typical-works",
    questionnaires: "questionnaires",
};
function formatV2DataTransferExportTimestamp(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        const fallback = new Date();
        value = fallback;
    }
    const resolved = value instanceof Date ? value : date;
    const pad = (part) => String(part).padStart(2, "0");
    return `${resolved.getFullYear()}-${pad(resolved.getMonth() + 1)}-${pad(resolved.getDate())}-${pad(resolved.getHours())}-${pad(resolved.getMinutes())}-${pad(resolved.getSeconds())}`;
}
function buildV2DataTransferExportFilename(sections, exportedAt) {
    const stamp = formatV2DataTransferExportTimestamp(exportedAt);
    if (sections.length === 0) {
        return `smart-anketa-v2-empty-${stamp}.json`;
    }
    const content = sections
        .map((section) => exports.V2_DATA_TRANSFER_SECTION_FILE_SLUGS[section])
        .join("-");
    return `smart-anketa-v2-${content}-${stamp}.json`;
}
exports.V2_DATA_TRANSFER_DEFAULT_SECTIONS = [
    ...exports.V2_DATA_TRANSFER_SECTIONS,
];
/** Формулы типовых работ привязаны к версиям шаблонов — при выгрузке работ подтягиваем шаблоны. */
function expandV2DataTransferExportSections(sections) {
    const picked = new Set(sections);
    if (picked.has("typicalWorks")) {
        picked.add("templates");
    }
    return exports.V2_DATA_TRANSFER_SECTIONS.filter((section) => picked.has(section));
}
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
