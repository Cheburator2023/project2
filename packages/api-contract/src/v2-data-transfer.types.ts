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

export const V2_DATA_TRANSFER_DEFAULT_SECTIONS: V2DataTransferSection[] = [
	...V2_DATA_TRANSFER_SECTIONS,
];

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
