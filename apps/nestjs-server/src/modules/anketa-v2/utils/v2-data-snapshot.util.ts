import { createHash } from "node:crypto";
import type { V2DataTransferSection } from "@smart-anketa/api-contract";

export const V2_DATA_SNAPSHOT_FORMAT_VERSION = 1;

export type V2DataImportMode = "merge" | "replace";

export interface V2DataSnapshotMeta {
	formatVersion: number;
	exportedAt: string;
	sha256: string;
	counts: {
		dictionaries: number;
		dictionaryItems: number;
		templates: number;
		templateVersions: number;
		typicalWorks: number;
		typicalWorkNorms: number;
		typicalWorkRules: number;
		typicalWorkLaborCoefficients: number;
		typicalWorkVersionConfigs: number;
		questionnaires: number;
	};
	/** Какие разделы включены в снапшот (если не задано — все). */
	sections?: V2DataTransferSection[];
}

export interface V2DataSnapshotPayload {
	dictionaries: Record<string, unknown>[];
	dictionaryItems: Record<string, unknown>[];
	templates: Record<string, unknown>[];
	templateVersions: Record<string, unknown>[];
	typicalWorks: Record<string, unknown>[];
	typicalWorkNorms: Record<string, unknown>[];
	typicalWorkRules: Record<string, unknown>[];
	typicalWorkLaborCoefficients: Record<string, unknown>[];
	typicalWorkVersionConfigs: Record<string, unknown>[];
	questionnaires: Record<string, unknown>[];
}

export interface V2DataSnapshot extends V2DataSnapshotPayload {
	meta: V2DataSnapshotMeta;
}

export interface V2DataImportStats {
	mode: V2DataImportMode;
	inserted: Record<string, number>;
	skipped: Record<string, number>;
}

function stableStringify(value: unknown): string {
	return JSON.stringify(value, (_key, item) => {
		if (item && typeof item === "object" && !Array.isArray(item)) {
			return Object.keys(item as Record<string, unknown>)
				.sort()
				.reduce<Record<string, unknown>>((acc, key) => {
					acc[key] = (item as Record<string, unknown>)[key];
					return acc;
				}, {});
		}
		return item;
	});
}

export function hashV2DataPayload(payload: V2DataSnapshotPayload): string {
	return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

export function buildV2DataSnapshot(
	payload: V2DataSnapshotPayload,
	exportedAt = new Date().toISOString(),
	sections?: V2DataTransferSection[],
): V2DataSnapshot {
	const sha256 = hashV2DataPayload(payload);
	return {
		meta: {
			formatVersion: V2_DATA_SNAPSHOT_FORMAT_VERSION,
			exportedAt,
			sha256,
			...(sections?.length ? { sections: [...sections] } : {}),
			counts: {
				dictionaries: payload.dictionaries.length,
				dictionaryItems: payload.dictionaryItems.length,
				templates: payload.templates.length,
				templateVersions: payload.templateVersions.length,
				typicalWorks: payload.typicalWorks.length,
				typicalWorkNorms: payload.typicalWorkNorms.length,
				typicalWorkRules: payload.typicalWorkRules.length,
				typicalWorkLaborCoefficients:
					payload.typicalWorkLaborCoefficients.length,
				typicalWorkVersionConfigs: payload.typicalWorkVersionConfigs.length,
				questionnaires: payload.questionnaires.length,
			},
		},
		...payload,
	};
}

export function parseV2DataSnapshot(buffer: Buffer): V2DataSnapshot {
	let parsed: unknown;
	try {
		parsed = JSON.parse(buffer.toString("utf8"));
	} catch {
		throw new SnapshotSchemaError("Файл не является корректным JSON");
	}

	if (!parsed || typeof parsed !== "object") {
		throw new SnapshotSchemaError("Некорректная структура снапшота");
	}

	const snapshot = parsed as Partial<V2DataSnapshot>;
	if (snapshot.meta?.formatVersion !== V2_DATA_SNAPSHOT_FORMAT_VERSION) {
		throw new SnapshotSchemaError(
			`Неподдерживаемая версия формата: ${snapshot.meta?.formatVersion ?? "?"}`,
		);
	}

	const arrays = [
		"dictionaries",
		"dictionaryItems",
		"templates",
		"templateVersions",
		"typicalWorks",
		"typicalWorkNorms",
		"typicalWorkRules",
		"typicalWorkLaborCoefficients",
		"typicalWorkVersionConfigs",
		"questionnaires",
	] as const;

	for (const key of arrays) {
		if (!Array.isArray(snapshot[key])) {
			throw new SnapshotSchemaError(`Отсутствует массив ${key}`);
		}
	}

	return snapshot as V2DataSnapshot;
}

export function assertV2DataSnapshotIntegrity(snapshot: V2DataSnapshot): void {
	const { sha256, ...metaRest } = snapshot.meta;
	const payload: V2DataSnapshotPayload = {
		dictionaries: snapshot.dictionaries,
		dictionaryItems: snapshot.dictionaryItems,
		templates: snapshot.templates,
		templateVersions: snapshot.templateVersions,
		typicalWorks: snapshot.typicalWorks,
		typicalWorkNorms: snapshot.typicalWorkNorms,
		typicalWorkRules: snapshot.typicalWorkRules,
		typicalWorkLaborCoefficients: snapshot.typicalWorkLaborCoefficients,
		typicalWorkVersionConfigs: snapshot.typicalWorkVersionConfigs,
		questionnaires: snapshot.questionnaires,
	};
	const actual = hashV2DataPayload(payload);
	if (actual !== sha256) {
		throw new SnapshotIntegrityError(sha256, actual);
	}
	void metaRest;
}

export class SnapshotIntegrityError extends Error {
	constructor(
		readonly expectedSha256: string,
		readonly actualSha256: string,
	) {
		super("Контрольная сумма снапшота не совпадает");
		this.name = "SnapshotIntegrityError";
	}
}

export class SnapshotSchemaError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SnapshotSchemaError";
	}
}
