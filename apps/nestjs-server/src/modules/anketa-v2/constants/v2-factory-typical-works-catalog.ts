import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Заводской снимок каталога типовых работ и методологических параметров.
 * Файл `v2-factory-typical-works.snapshot.json` — часть factory bundle,
 * редактируется напрямую в репозитории (не генерируется из CSV в рантайме).
 *
 * Потребители: seed типовых работ новой схемы, методологические справочники,
 * каталог параметров трудоёмкости.
 */
const SNAPSHOT_FILENAME = "v2-factory-typical-works.snapshot.json";

export type V2FactoryTypicalWork = {
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
	triggerRules?: Array<{
		paramName: string;
		/** Явная статическая связь с полем factory-схемы без runtime-сопоставления. */
		paramCode?: string;
		schemaFieldUid?: string;
		operator: "=" | "!=" | "in" | "exists" | "unresolved";
		values: string[];
	}>;
	/** Триггер по количеству арх. компонентов (без поля схемы). */
	triggerArchCount?: {
		kind: string;
		steps: Array<{ count: number; coefficient: number }>;
		combinator?: "and" | "or";
	} | null;
	laborParams: string[];
	laborCoefficients?: Array<{
		paramName: string;
		/** Явная статическая связь с полем factory-схемы без runtime-сопоставления. */
		paramCode?: string;
		schemaFieldUid?: string;
		values: Array<{
			label: string;
			coefficient: number;
		}>;
	}>;
	/** Коэффициенты по количеству арх. компонентов (без поля схемы). */
	laborArchCounts?: Array<{
		kind: string;
		paramName?: string | null;
		steps: Array<{ count: number; coefficient: number }>;
	}>;
	formulaText?: string;
	roundingMode?: "CEIL" | "FLOOR" | "ROUND" | "NONE";
	roundingStep?: number | null;
};

export type V2FactoryMethodologyDictValue = {
	raw: string;
	label: string;
	coeffRaw: string | null;
	coeff: number | null;
};

export type V2FactoryMethodologyDictionary = {
	id: string;
	name: string;
	category: string;
	novelty: string;
	controlType: string;
	sources: string;
	values: V2FactoryMethodologyDictValue[];
	attributes: string;
	comments: string;
};

export type V2FactoryTypicalWorksSnapshot = {
	meta: {
		snapshotVersion: number;
		factoryBundle: boolean;
		description?: string;
		counts: Record<string, number>;
		streams: string[];
		components: string[];
		stages: string[];
	};
	typicalWorks: V2FactoryTypicalWork[];
	dictionaries: V2FactoryMethodologyDictionary[];
};

/** @deprecated Use V2FactoryTypicalWork */
export type V2CatalogTypicalWork = V2FactoryTypicalWork;
/** @deprecated Use V2FactoryMethodologyDictValue */
export type V2CatalogDictValue = V2FactoryMethodologyDictValue;
/** @deprecated Use V2FactoryMethodologyDictionary */
export type V2CatalogDictionary = V2FactoryMethodologyDictionary;
/** @deprecated Use V2FactoryTypicalWorksSnapshot */
export type V2DocCatalog = V2FactoryTypicalWorksSnapshot;

function resolveSnapshotPath(): string {
	return join(__dirname, SNAPSHOT_FILENAME);
}

function loadFactoryTypicalWorksSnapshot(): V2FactoryTypicalWorksSnapshot {
	const path = resolveSnapshotPath();
	return JSON.parse(
		readFileSync(path, "utf-8"),
	) as V2FactoryTypicalWorksSnapshot;
}

export const V2_FACTORY_TYPICAL_WORKS_SNAPSHOT: V2FactoryTypicalWorksSnapshot =
	loadFactoryTypicalWorksSnapshot();

/** @deprecated Prefer V2_FACTORY_TYPICAL_WORKS_SNAPSHOT */
export const V2_DOC_CATALOG: V2DocCatalog = V2_FACTORY_TYPICAL_WORKS_SNAPSHOT;

/** Типовые работы для заданного arch-компонента (и опционально стрима). */
export function typicalWorksFor(
	component: string,
	stream?: string,
): V2FactoryTypicalWork[] {
	return V2_FACTORY_TYPICAL_WORKS_SNAPSHOT.typicalWorks.filter(
		(w) => w.component === component && (stream ? w.stream === stream : true),
	);
}

/** Справочник по наименованию (точное совпадение). */
export function dictionaryByName(
	name: string,
): V2FactoryMethodologyDictionary | undefined {
	return V2_FACTORY_TYPICAL_WORKS_SNAPSHOT.dictionaries.find(
		(d) => d.name === name,
	);
}
