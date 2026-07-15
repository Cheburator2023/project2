export const V2_DATA_TRANSFER_SECTIONS = [
	"templates",
	"dictionaries",
	"typicalWorks",
	"questionnaires",
] as const;

export type V2DataTransferSection = (typeof V2_DATA_TRANSFER_SECTIONS)[number];

export const V2_DATA_TRANSFER_SECTION_LABELS: Record<
	V2DataTransferSection,
	string
> = {
	templates: "Шаблоны схем",
	dictionaries: "Справочники",
	typicalWorks: "Типовые работы",
	questionnaires: "Анкеты v2",
};

/** Читаемые фрагменты имён файлов выгрузки по разделам. */
export const V2_DATA_TRANSFER_SECTION_FILE_SLUGS: Record<
	V2DataTransferSection,
	string
> = {
	templates: "templates",
	dictionaries: "dictionaries",
	typicalWorks: "typical-works",
	questionnaires: "questionnaires",
};

export function formatV2DataTransferExportTimestamp(
	value: Date | string = new Date(),
): string {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		const fallback = new Date();
		value = fallback;
	}
	const resolved = value instanceof Date ? value : date;
	const pad = (part: number) => String(part).padStart(2, "0");
	return `${resolved.getFullYear()}-${pad(resolved.getMonth() + 1)}-${pad(resolved.getDate())}-${pad(resolved.getHours())}-${pad(resolved.getMinutes())}-${pad(resolved.getSeconds())}`;
}

export function buildV2DataTransferExportFilename(
	sections: readonly V2DataTransferSection[],
	exportedAt?: Date | string,
): string {
	const stamp = formatV2DataTransferExportTimestamp(exportedAt);
	if (sections.length === 0) {
		return `smart-anketa-v2-empty-${stamp}.json`;
	}
	const content = sections
		.map((section) => V2_DATA_TRANSFER_SECTION_FILE_SLUGS[section])
		.join("-");
	return `smart-anketa-v2-${content}-${stamp}.json`;
}

export const V2_DATA_TRANSFER_DEFAULT_SECTIONS: V2DataTransferSection[] = [
	...V2_DATA_TRANSFER_SECTIONS,
];

/** Формулы типовых работ привязаны к версиям шаблонов — при выгрузке работ подтягиваем шаблоны. */
export function expandV2DataTransferExportSections(
	sections: readonly V2DataTransferSection[],
): V2DataTransferSection[] {
	const picked = new Set(sections);
	if (picked.has("typicalWorks")) {
		picked.add("templates");
	}
	return V2_DATA_TRANSFER_SECTIONS.filter((section) => picked.has(section));
}

export function parseV2DataTransferSections(
	raw: string | string[] | undefined | null,
): V2DataTransferSection[] {
	if (raw == null || raw === "" || raw === "all") {
		return [...V2_DATA_TRANSFER_DEFAULT_SECTIONS];
	}
	const parts = Array.isArray(raw)
		? raw
		: raw.split(",").map((part) => part.trim());
	const picked = parts.filter((part): part is V2DataTransferSection =>
		(V2_DATA_TRANSFER_SECTIONS as readonly string[]).includes(part),
	);
	return picked.length > 0 ? picked : [...V2_DATA_TRANSFER_DEFAULT_SECTIONS];
}

export function serializeV2DataTransferSections(
	sections: readonly V2DataTransferSection[],
): string {
	return sections.join(",");
}
