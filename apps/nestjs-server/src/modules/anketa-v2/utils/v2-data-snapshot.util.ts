import { createHash } from "node:crypto";
import type { V2DataTransferSection } from "@smart-anketa/api-contract";

export const V2_DATA_SNAPSHOT_FORMAT_VERSION = 2;

export const V2_DATA_SNAPSHOT_LEGACY_FORMAT_VERSION = 1;

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
		typicalWorkAssignments: number;
		typicalWorkLaborParams: number;
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
	typicalWorkAssignments: Record<string, unknown>[];
	typicalWorkLaborParams: Record<string, unknown>[];
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

const V1_PAYLOAD_ARRAY_KEYS = [
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
] as const satisfies ReadonlyArray<keyof V2DataSnapshotPayload>;

const V2_ONLY_PAYLOAD_ARRAY_KEYS = [
	"typicalWorkAssignments",
	"typicalWorkLaborParams",
] as const satisfies ReadonlyArray<keyof V2DataSnapshotPayload>;

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

export function emptyV2DataSnapshotPayload(): V2DataSnapshotPayload {
	return {
		dictionaries: [],
		dictionaryItems: [],
		templates: [],
		templateVersions: [],
		typicalWorks: [],
		typicalWorkAssignments: [],
		typicalWorkLaborParams: [],
		typicalWorkNorms: [],
		typicalWorkRules: [],
		typicalWorkLaborCoefficients: [],
		typicalWorkVersionConfigs: [],
		questionnaires: [],
	};
}

export function payloadForIntegrityCheck(
	snapshot: V2DataSnapshot,
): Record<string, unknown[]> {
	const formatVersion =
		snapshot.meta?.formatVersion ?? V2_DATA_SNAPSHOT_FORMAT_VERSION;
	const payload: Record<string, unknown[]> = {};
	for (const key of V1_PAYLOAD_ARRAY_KEYS) {
		payload[key] = snapshot[key];
	}
	if (formatVersion >= V2_DATA_SNAPSHOT_FORMAT_VERSION) {
		for (const key of V2_ONLY_PAYLOAD_ARRAY_KEYS) {
			payload[key] = snapshot[key] ?? [];
		}
	}
	return payload;
}

export function hashV2DataPayload(
	payload: V2DataSnapshotPayload,
	formatVersion: number = V2_DATA_SNAPSHOT_FORMAT_VERSION,
): string {
	const hashPayload = payloadForIntegrityCheck({
		meta: {
			formatVersion,
			exportedAt: "",
			sha256: "",
			counts: {
				dictionaries: payload.dictionaries.length,
				dictionaryItems: payload.dictionaryItems.length,
				templates: payload.templates.length,
				templateVersions: payload.templateVersions.length,
				typicalWorks: payload.typicalWorks.length,
				typicalWorkAssignments: payload.typicalWorkAssignments.length,
				typicalWorkLaborParams: payload.typicalWorkLaborParams.length,
				typicalWorkNorms: payload.typicalWorkNorms.length,
				typicalWorkRules: payload.typicalWorkRules.length,
				typicalWorkLaborCoefficients:
					payload.typicalWorkLaborCoefficients.length,
				typicalWorkVersionConfigs: payload.typicalWorkVersionConfigs.length,
				questionnaires: payload.questionnaires.length,
			},
		},
		...payload,
	});
	return createHash("sha256").update(stableStringify(hashPayload)).digest("hex");
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
				typicalWorkAssignments: payload.typicalWorkAssignments.length,
				typicalWorkLaborParams: payload.typicalWorkLaborParams.length,
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
	const formatVersion = snapshot.meta?.formatVersion;
	if (
		formatVersion !== V2_DATA_SNAPSHOT_FORMAT_VERSION &&
		formatVersion !== V2_DATA_SNAPSHOT_LEGACY_FORMAT_VERSION
	) {
		throw new SnapshotSchemaError(
			`Неподдерживаемая версия формата: ${formatVersion ?? "?"}`,
		);
	}

	for (const key of V1_PAYLOAD_ARRAY_KEYS) {
		if (!Array.isArray(snapshot[key])) {
			throw new SnapshotSchemaError(`Отсутствует массив ${key}`);
		}
	}

	if (formatVersion >= V2_DATA_SNAPSHOT_FORMAT_VERSION) {
		for (const key of V2_ONLY_PAYLOAD_ARRAY_KEYS) {
			if (!Array.isArray(snapshot[key])) {
				throw new SnapshotSchemaError(`Отсутствует массив ${key}`);
			}
		}
	} else {
		snapshot.typicalWorkAssignments = [];
		snapshot.typicalWorkLaborParams = [];
	}

	return snapshot as V2DataSnapshot;
}

export function assertV2DataSnapshotIntegrity(snapshot: V2DataSnapshot): void {
	const { sha256 } = snapshot.meta;
	const actual = createHash("sha256")
		.update(stableStringify(payloadForIntegrityCheck(snapshot)))
		.digest("hex");
	if (actual !== sha256) {
		throw new SnapshotIntegrityError(sha256, actual);
	}
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
