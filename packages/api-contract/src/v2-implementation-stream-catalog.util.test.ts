import { describe, expect, it } from "vitest";
import { V2_IMPLEMENTATION_STREAM } from "./v2-implementation-streams.util";
import {
	buildFactoryAnketaFormStreamDictionaryItems,
	buildFactoryImplementationStreamCatalog,
	buildStreamFilterAliasMap,
	catalogEnumPair,
	findImplementationStreamCatalogEntry,
	isValidImplementationStreamCodeFormat,
	parseImplementationStreamPayload,
	resolveCatalogDbExecutorName,
	resolveCatalogEntryScopeStreams,
	resolveModelStreamCatalogScopeFromEntries,
} from "./v2-implementation-stream-catalog.util";
import {
	V2_MODEL_IMPLEMENTATION_STREAM_CODES,
	V2_MODEL_STREAM_EXECUTOR,
} from "./v2-model-stream-typical-works.constants";

describe("v2-implementation-stream-catalog.util", () => {
	it("builds factory catalog with model flags, umbrella and dbNames", () => {
		const catalog = buildFactoryImplementationStreamCatalog();
		expect(catalog.length).toBeGreaterThanOrEqual(12);
		const umbrella = catalog.find((entry) => entry.payload.isUmbrellaStream);
		expect(umbrella?.code).toBe("mdls");
		expect(umbrella?.label).toBe(V2_MODEL_STREAM_EXECUTOR);
		expect(umbrella?.isActive).toBe(false);
		expect(umbrella?.payload.isModelStream).toBe(false);
		const kmb = catalog.find(
			(entry) => entry.code === V2_IMPLEMENTATION_STREAM.KMBKCB,
		);
		expect(kmb?.payload.isModelStream).toBe(true);
		expect(kmb?.payload.isUmbrellaStream).toBe(false);
		expect(kmb?.payload.dbNames).toEqual(
			expect.arrayContaining(["Разработка моделей КМБ и КСБ"]),
		);
		expect(kmb?.payload.keycloakAliases.length).toBeGreaterThan(0);
		const idsrc = catalog.find(
			(entry) => entry.code === V2_IMPLEMENTATION_STREAM.IDSRC,
		);
		expect(idsrc?.payload.isModelStream).toBe(false);
		expect(idsrc?.isActive).toBe(true);
	});

	it("form dictionary seed has only five model streams", () => {
		const items = buildFactoryAnketaFormStreamDictionaryItems();
		expect(items.map((item) => item.code)).toEqual([
			...V2_MODEL_IMPLEMENTATION_STREAM_CODES,
		]);
		expect(items.every((item) => item.payload.storeCode === true)).toBe(true);
	});

	it("catalog enum pair excludes umbrella and inactive", () => {
		const { enums } = catalogEnumPair(buildFactoryImplementationStreamCatalog());
		expect(enums).toContain(V2_IMPLEMENTATION_STREAM.IDSRC);
		expect(enums).toContain(V2_IMPLEMENTATION_STREAM.RB);
		expect(enums).not.toContain("mdls");
	});

	it("parses payload with defaults from label", () => {
		const payload = parseImplementationStreamPayload(
			{ isModelStream: true, keycloakAliases: ["Dept A"] },
			{ label: "Новый стрим" },
		);
		expect(payload.storeCode).toBe(true);
		expect(payload.dbNames).toEqual(["Новый стрим"]);
		expect(payload.isModelStream).toBe(true);
		expect(payload.isUmbrellaStream).toBe(false);
		expect(payload.keycloakAliases).toEqual(["Dept A"]);
	});

	it("parses umbrella flag and clears isModelStream", () => {
		const payload = parseImplementationStreamPayload(
			{ isUmbrellaStream: true, isModelStream: true },
			{ label: "Общий стрим", code: "umb01" },
		);
		expect(payload.isUmbrellaStream).toBe(true);
		expect(payload.isModelStream).toBe(false);
	});

	it("parses empty dbNames with code as canonical assignment name", () => {
		const payload = parseImplementationStreamPayload(
			{ isModelStream: false },
			{ label: "СМЯЧМСЧМ", code: "dfdaf" },
		);
		expect(payload.dbNames).toEqual(["dfdaf", "СМЯЧМСЧМ"]);
		const entry = {
			code: "dfdaf",
			label: "СМЯЧМСЧМ",
			order: 0,
			isActive: true,
			payload,
		};
		expect(resolveCatalogDbExecutorName(entry)).toBe("dfdaf");
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
