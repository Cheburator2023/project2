import {
	assertV2DataSnapshotIntegrity,
	buildV2DataSnapshot,
	hashV2DataPayload,
	parseV2DataSnapshot,
	SnapshotIntegrityError,
	SnapshotSchemaError,
	V2_DATA_SNAPSHOT_LEGACY_FORMAT_VERSION,
	emptyV2DataSnapshotPayload,
	type V2DataSnapshotPayload,
} from "../../../../src/modules/anketa-v2/utils/v2-data-snapshot.util";

const EMPTY_PAYLOAD = emptyV2DataSnapshotPayload();

function samplePayload(): V2DataSnapshotPayload {
	return {
		...EMPTY_PAYLOAD,
		templates: [
			{
				id: "tpl-1",
				code: "demo",
				name: "Demo",
				currentVersionId: null,
			},
		],
		templateVersions: [
			{
				id: "ver-1",
				templateId: "tpl-1",
				versionNumber: 1,
				status: "draft",
			},
		],
	};
}

function typicalWorkPayload(): V2DataSnapshotPayload {
	return {
		...samplePayload(),
		typicalWorks: [
			{
				id: "work-1",
				name: "Parent work",
				catalogKey: "parent",
				templateId: "tpl-1",
			},
		],
		typicalWorkAssignments: [
			{
				id: "asg-child",
				workId: "work-1",
				streamExecutor: "stream-a",
				isActive: true,
			},
		],
		typicalWorkLaborParams: [
			{
				id: "lp-1",
				workId: "work-1",
				streamExecutor: "stream-a",
				paramCode: "complexity",
				kind: "any_of",
				anyOfValueCodes: ["high", "medium"],
				coeffOn: "1.2",
				coeffOff: "1",
			},
		],
		typicalWorkNorms: [
			{
				id: "norm-1",
				workId: "work-1",
				streamExecutor: "stream-a",
				normValue: "10",
				validFrom: "2026-01-01",
			},
		],
		typicalWorkVersionConfigs: [
			{
				id: "cfg-1",
				templateVersionId: "ver-1",
				workId: "work-1",
				streamExecutor: "stream-a",
				formula: [
					{ kind: "norm" },
					{ kind: "operator", op: "*" },
					{ kind: "param_coeff", paramCode: "complexity" },
				],
				formulaText: "H × complexity",
				roundingMode: "ROUND",
				roundingStep: "0.1",
				calculationLogic: {
					version: 1,
					result: { "*": [{ var: "norm" }, { var: "coeff.complexity" }] },
				},
			},
			{
				id: "cfg-2",
				templateVersionId: "ver-1",
				workId: "work-1",
				streamExecutor: "stream-b",
				formula: [
					{ kind: "work_ref", assignmentId: "asg-child", workName: "Parent" },
				],
				formulaText: "работа(Parent)",
			},
		],
	};
}

function exportBuffer(
	payload: V2DataSnapshotPayload,
	sections?: ("templates" | "dictionaries" | "typicalWorks" | "questionnaires")[],
): Buffer {
	const snapshot = buildV2DataSnapshot(
		payload,
		"2026-07-15T10:00:00.000Z",
		sections,
	);
	return Buffer.from(JSON.stringify(snapshot, null, 2), "utf8");
}

describe("v2-data-snapshot.util", () => {
	it("builds sha256 over payload arrays only", () => {
		const payload = samplePayload();
		const snapshot = buildV2DataSnapshot(payload, "2026-07-15T10:00:00.000Z");
		expect(snapshot.meta.sha256).toBe(hashV2DataPayload(payload));
		expect(snapshot.meta.counts.templates).toBe(1);
		expect(snapshot.meta.counts.templateVersions).toBe(1);
	});

	it("round-trips full snapshot through JSON export buffer", () => {
		const buffer = exportBuffer(samplePayload());
		const parsed = parseV2DataSnapshot(buffer);
		expect(() => assertV2DataSnapshotIntegrity(parsed)).not.toThrow();
		expect(parsed.meta.sections).toBeUndefined();
	});

	it("round-trips typical works with formulas and assignments", () => {
		const buffer = exportBuffer(typicalWorkPayload(), ["templates", "typicalWorks"]);
		const parsed = parseV2DataSnapshot(buffer);
		expect(() => assertV2DataSnapshotIntegrity(parsed)).not.toThrow();
		expect(parsed.typicalWorkAssignments).toHaveLength(1);
		expect(parsed.typicalWorkLaborParams).toHaveLength(1);
		expect(parsed.typicalWorkVersionConfigs).toHaveLength(2);
		expect(parsed.typicalWorkVersionConfigs[0]?.formulaText).toBe("H × complexity");
		expect(parsed.typicalWorkVersionConfigs[1]?.streamExecutor).toBe("stream-b");
	});

	it("round-trips partial section snapshot", () => {
		const buffer = exportBuffer(samplePayload(), ["templates"]);
		const parsed = parseV2DataSnapshot(buffer);
		expect(parsed.meta.sections).toEqual(["templates"]);
		expect(parsed.dictionaries).toEqual([]);
		expect(parsed.templates).toHaveLength(1);
		expect(() => assertV2DataSnapshotIntegrity(parsed)).not.toThrow();
	});

	it("accepts legacy v1 snapshots without assignment arrays", () => {
		const payload = samplePayload();
		const sha256 = hashV2DataPayload(
			payload,
			V2_DATA_SNAPSHOT_LEGACY_FORMAT_VERSION,
		);
		const { typicalWorkAssignments: _a, typicalWorkLaborParams: _b, ...v1Body } =
			payload;
		const legacySnapshot = {
			meta: {
				formatVersion: V2_DATA_SNAPSHOT_LEGACY_FORMAT_VERSION,
				exportedAt: "2026-01-01T00:00:00.000Z",
				sha256,
				counts: {
					dictionaries: 0,
					dictionaryItems: 0,
					templates: 1,
					templateVersions: 1,
					typicalWorks: 0,
					typicalWorkNorms: 0,
					typicalWorkRules: 0,
					typicalWorkLaborCoefficients: 0,
					typicalWorkVersionConfigs: 0,
					questionnaires: 0,
				},
			},
			...v1Body,
		};
		const parsed = parseV2DataSnapshot(
			Buffer.from(JSON.stringify(legacySnapshot), "utf8"),
		);
		expect(parsed.typicalWorkAssignments).toEqual([]);
		expect(() => assertV2DataSnapshotIntegrity(parsed)).not.toThrow();
	});

	it("rejects tampered payload with valid meta.sha256", () => {
		const buffer = exportBuffer(samplePayload());
		const parsed = parseV2DataSnapshot(buffer);
		parsed.templates[0] = {
			...parsed.templates[0],
			name: "Подмена",
		};

		expect(() => assertV2DataSnapshotIntegrity(parsed)).toThrow(
			SnapshotIntegrityError,
		);
		try {
			assertV2DataSnapshotIntegrity(parsed);
		} catch (error) {
			expect(error).toBeInstanceOf(SnapshotIntegrityError);
			const integrity = error as SnapshotIntegrityError;
			expect(integrity.expectedSha256).toBe(parsed.meta.sha256);
			expect(integrity.actualSha256).not.toBe(integrity.expectedSha256);
		}
	});

	it("rejects unsupported format version", () => {
		const snapshot = buildV2DataSnapshot(EMPTY_PAYLOAD);
		const broken = {
			...snapshot,
			meta: { ...snapshot.meta, formatVersion: 99 },
		};
		expect(() =>
			parseV2DataSnapshot(Buffer.from(JSON.stringify(broken), "utf8")),
		).toThrow(SnapshotSchemaError);
	});
});
