/** data-test-id для молекул анкеты (anketaCRUD/molecules). */
export const ANKETA_MOLECULE_TEST_IDS = {
	listEmptyPlaceholder: "anketa-list-empty-placeholder",
	arrayTable: "anketa-array-table",
	arrayTableTitle: "anketa-array-table-title",
	arrayTableCount: "anketa-array-table-count",
	arrayTableHeaderRow: "anketa-array-table-header-row",
	arrayTableBody: "anketa-array-table-body",
	arrayTableRow: "anketa-array-table-row",
	arrayTableEdit: "anketa-array-table-edit",
	arrayTableDelete: "anketa-array-table-delete",
	archObjectPanel: "anketa-arch-object-panel",
	archObjectRow: "anketa-arch-object-row",
	archObjectEdit: "anketa-arch-object-edit",
	archObjectDelete: "anketa-arch-object-delete",
	archObjectAdd: "anketa-arch-object-add",
	statusChipGlobal: "anketa-status-chip--global",
	statusChipSection: "anketa-status-chip--section",
	sectionAccordion: "anketa-section-accordion",
	sectionAccordionSummary: "anketa-section-accordion-summary",
	sectionAccordionDetails: "anketa-section-accordion-details",
} as const;

export function anketaMoleculeTestIdForPath(
	base: string,
	pathKey: string,
): string {
	return `${base}--${pathKey.replace(/\./g, "-")}`;
}
