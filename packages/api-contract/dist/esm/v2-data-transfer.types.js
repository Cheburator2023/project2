export const V2_DATA_TRANSFER_SECTIONS = [
    "templates",
    "dictionaries",
    "typicalWorks",
    "questionnaires",
];
export const V2_DATA_TRANSFER_SECTION_LABELS = {
    templates: "Шаблоны схем",
    dictionaries: "Справочники",
    typicalWorks: "Типовые работы",
    questionnaires: "Анкеты v2",
};
export const V2_DATA_TRANSFER_DEFAULT_SECTIONS = [
    ...V2_DATA_TRANSFER_SECTIONS,
];
export function parseV2DataTransferSections(raw) {
    if (raw == null || raw === "" || raw === "all") {
        return [...V2_DATA_TRANSFER_DEFAULT_SECTIONS];
    }
    const parts = Array.isArray(raw)
        ? raw
        : raw.split(",").map((part) => part.trim());
    const picked = parts.filter((part) => V2_DATA_TRANSFER_SECTIONS.includes(part));
    return picked.length > 0 ? picked : [...V2_DATA_TRANSFER_DEFAULT_SECTIONS];
}
export function serializeV2DataTransferSections(sections) {
    return sections.join(",");
}
