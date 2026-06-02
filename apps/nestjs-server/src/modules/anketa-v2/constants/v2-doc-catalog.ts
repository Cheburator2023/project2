import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Типизированный загрузчик каталога методолога, сгенерированного из авторитетных
 * документов (`scripts/build-v2-doc-catalog.ts`). Источник истины — CSV в
 * `llm/v2_new_docs/` (FR-16, глоссарий «Справочник типовых работ» / «Параметр»).
 *
 * Каталог потребляют: seed методологических справочников и заводская логика
 * (триггеры типовых работ). Регенерация: `npm run build:doc-catalog`.
 */
const CATALOG_FILENAME = "v2-doc-catalog.generated.json";

export type V2CatalogTypicalWork = {
	stream: string;
	component: string;
	stage: string;
	name: string;
	originalName: string;
	workType: string;
	norm: number | null;
	normRaw: string;
	triggerParam: string;
	triggerParams: string[];
	laborParams: string[];
};

export type V2CatalogDictValue = {
	raw: string;
	label: string;
	coeffRaw: string | null;
	coeff: number | null;
};

export type V2CatalogDictionary = {
	id: string;
	name: string;
	category: string;
	novelty: string;
	controlType: string;
	sources: string;
	values: V2CatalogDictValue[];
	attributes: string;
	comments: string;
};

export type V2DocCatalog = {
	meta: {
		generatedAt: string;
		sources: Record<string, string>;
		counts: Record<string, number>;
		streams: string[];
		components: string[];
		stages: string[];
	};
	typicalWorks: V2CatalogTypicalWork[];
	dictionaries: V2CatalogDictionary[];
};

function resolveCatalogPath(): string {
	// Рядом с скомпилированным модулем (src/ или dist/src/ после nest build).
	const local = join(__dirname, "generated", CATALOG_FILENAME);
	try {
		readFileSync(local);
		return local;
	} catch {
		// Fallback: nest assets без outDir (старый layout: dist/modules/… при JS в dist/src/…).
		return join(
			__dirname,
			"..",
			"..",
			"..",
			"..",
			"modules",
			"anketa-v2",
			"constants",
			"generated",
			CATALOG_FILENAME,
		);
	}
}

function loadCatalog(): V2DocCatalog {
	const path = resolveCatalogPath();
	return JSON.parse(readFileSync(path, "utf-8")) as V2DocCatalog;
}

export const V2_DOC_CATALOG: V2DocCatalog = loadCatalog();

/** Типовые работы для заданного арх-компонента (и опционально стрима). */
export function typicalWorksFor(
	component: string,
	stream?: string,
): V2CatalogTypicalWork[] {
	return V2_DOC_CATALOG.typicalWorks.filter(
		(w) =>
			w.component === component && (stream ? w.stream === stream : true),
	);
}

/** Справочник по наименованию (точное совпадение). */
export function dictionaryByName(name: string): V2CatalogDictionary | undefined {
	return V2_DOC_CATALOG.dictionaries.find((d) => d.name === name);
}
