import { describe, expect, it } from "vitest";
import { V2_IMPLEMENTATION_STREAM } from "./v2-implementation-streams.util";
import {
	buildFactoryImplementationStreamCatalog,
	buildStreamFilterAliasMap,
	findImplementationStreamCatalogEntry,
	isValidImplementationStreamCodeFormat,
	parseImplementationStreamPayload,
	resolveCatalogDbExecutorName,
	resolveCatalogEntryScopeStreams,
	resolveModelStreamCatalogScopeFromEntries,
} from "./v2-implementation-stream-catalog.util";
import { V2_MODEL_STREAM_EXECUTOR } from "./v2-model-stream-typical-works.constants";

describe("v2-implementation-stream-catalog.util", () => {
	it("builds factory catalog with model flags and dbNames", () => {
		const catalog = buildFactoryImplementationStreamCatalog();
		expect(catalog.length).toBeGreaterThanOrEqual(11);
		const kmb = catalog.find(
			(entry) => entry.code === V2_IMPLEMENTATION_STREAM.KMBKCB,
		);
		expect(kmb?.payload.isModelStream).toBe(true);
		expect(kmb?.payload.dbNames).toEqual(
			expect.arrayContaining(["Разработка моделей КМБ и КСБ"]),
		);
		expect(kmb?.payload.keycloakAliases.length).toBeGreaterThan(0);
		const idsrc = catalog.find(
			(entry) => entry.code === V2_IMPLEMENTATION_STREAM.IDSRC,
		);
		expect(idsrc?.payload.isModelStream).toBe(false);
	});

	it("parses payload with defaults from label", () => {
		const payload = parseImplementationStreamPayload(
			{ isModelStream: true, keycloakAliases: ["Dept A"] },
			{ label: "Новый стрим" },
		);
		expect(payload.storeCode).toBe(true);
		expect(payload.dbNames).toEqual(["Новый стрим"]);
		expect(payload.isModelStream).toBe(true);
		expect(payload.keycloakAliases).toEqual(["Dept A"]);
	});

	it("validates code format", () => {
		expect(isValidImplementationStreamCodeFormat("rb")).toBe(true);
		expect(isValidImplementationStreamCodeFormat("kmbkcb")).toBe(true);
		expect(isValidImplementationStreamCodeFormat("tooLong")).toBe(false);
		expect(isValidImplementationStreamCodeFormat("RB")).toBe(false);
	});

	it("resolves scope and filter aliases from catalog entries", () => {
		const catalog = buildFactoryImplementationStreamCatalog();
		const entry = findImplementationStreamCatalogEntry(
			"Разработка моделей КМБ и КСБ",
			catalog,
		);
		expect(entry?.code).toBe(V2_IMPLEMENTATION_STREAM.KMBKCB);
		expect(resolveCatalogEntryScopeStreams(entry!)).toEqual(
			expect.arrayContaining([
				V2_IMPLEMENTATION_STREAM.KMBKCB,
				V2_MODEL_STREAM_EXECUTOR,
			]),
		);
		expect(resolveCatalogDbExecutorName(entry!)).toBe(
			entry!.payload.dbNames[0],
		);
		const modelScope = resolveModelStreamCatalogScopeFromEntries(catalog);
		expect(modelScope).toEqual(
			expect.arrayContaining([
				V2_MODEL_STREAM_EXECUTOR,
				V2_IMPLEMENTATION_STREAM.RB,
			]),
		);
		const aliases = buildStreamFilterAliasMap(catalog);
		expect(aliases[V2_IMPLEMENTATION_STREAM.RB]).toEqual(
			expect.arrayContaining([V2_IMPLEMENTATION_STREAM.RB]),
		);
	});
});
