"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_implementation_streams_util_1 = require("./v2-implementation-streams.util");
const v2_implementation_stream_catalog_util_1 = require("./v2-implementation-stream-catalog.util");
const v2_model_stream_typical_works_constants_1 = require("./v2-model-stream-typical-works.constants");
(0, vitest_1.describe)("v2-implementation-stream-catalog.util", () => {
    (0, vitest_1.it)("builds factory catalog with model flags, umbrella and dbNames", () => {
        const catalog = (0, v2_implementation_stream_catalog_util_1.buildFactoryImplementationStreamCatalog)();
        (0, vitest_1.expect)(catalog.length).toBeGreaterThanOrEqual(12);
        const umbrella = catalog.find((entry) => entry.payload.isUmbrellaStream);
        (0, vitest_1.expect)(umbrella?.code).toBe("mdls");
        (0, vitest_1.expect)(umbrella?.label).toBe(v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR);
        (0, vitest_1.expect)(umbrella?.payload.isModelStream).toBe(false);
        const kmb = catalog.find((entry) => entry.code === v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB);
        (0, vitest_1.expect)(kmb?.payload.isModelStream).toBe(true);
        (0, vitest_1.expect)(kmb?.payload.isUmbrellaStream).toBe(false);
        (0, vitest_1.expect)(kmb?.payload.dbNames).toEqual(vitest_1.expect.arrayContaining(["Разработка моделей КМБ и КСБ"]));
        (0, vitest_1.expect)(kmb?.payload.keycloakAliases.length).toBeGreaterThan(0);
        const idsrc = catalog.find((entry) => entry.code === v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC);
        (0, vitest_1.expect)(idsrc?.payload.isModelStream).toBe(false);
    });
    (0, vitest_1.it)("parses payload with defaults from label", () => {
        const payload = (0, v2_implementation_stream_catalog_util_1.parseImplementationStreamPayload)({ isModelStream: true, keycloakAliases: ["Dept A"] }, { label: "Новый стрим" });
        (0, vitest_1.expect)(payload.storeCode).toBe(true);
        (0, vitest_1.expect)(payload.dbNames).toEqual(["Новый стрим"]);
        (0, vitest_1.expect)(payload.isModelStream).toBe(true);
        (0, vitest_1.expect)(payload.isUmbrellaStream).toBe(false);
        (0, vitest_1.expect)(payload.keycloakAliases).toEqual(["Dept A"]);
    });
    (0, vitest_1.it)("parses umbrella flag and clears isModelStream", () => {
        const payload = (0, v2_implementation_stream_catalog_util_1.parseImplementationStreamPayload)({ isUmbrellaStream: true, isModelStream: true }, { label: "Общий стрим", code: "umb01" });
        (0, vitest_1.expect)(payload.isUmbrellaStream).toBe(true);
        (0, vitest_1.expect)(payload.isModelStream).toBe(false);
    });
    (0, vitest_1.it)("parses empty dbNames with code as canonical assignment name", () => {
        const payload = (0, v2_implementation_stream_catalog_util_1.parseImplementationStreamPayload)({ isModelStream: false }, { label: "СМЯЧМСЧМ", code: "dfdaf" });
        (0, vitest_1.expect)(payload.dbNames).toEqual(["dfdaf", "СМЯЧМСЧМ"]);
        const entry = {
            code: "dfdaf",
            label: "СМЯЧМСЧМ",
            order: 0,
            isActive: true,
            payload,
        };
        (0, vitest_1.expect)((0, v2_implementation_stream_catalog_util_1.resolveCatalogDbExecutorName)(entry)).toBe("dfdaf");
    });
    (0, vitest_1.it)("validates code format", () => {
        (0, vitest_1.expect)((0, v2_implementation_stream_catalog_util_1.isValidImplementationStreamCodeFormat)("rb")).toBe(true);
        (0, vitest_1.expect)((0, v2_implementation_stream_catalog_util_1.isValidImplementationStreamCodeFormat)("kmbkcb")).toBe(true);
        (0, vitest_1.expect)((0, v2_implementation_stream_catalog_util_1.isValidImplementationStreamCodeFormat)("tooLong")).toBe(false);
        (0, vitest_1.expect)((0, v2_implementation_stream_catalog_util_1.isValidImplementationStreamCodeFormat)("RB")).toBe(false);
    });
    (0, vitest_1.it)("resolves scope and filter aliases from catalog entries", () => {
        const catalog = (0, v2_implementation_stream_catalog_util_1.buildFactoryImplementationStreamCatalog)();
        const entry = (0, v2_implementation_stream_catalog_util_1.findImplementationStreamCatalogEntry)("Разработка моделей КМБ и КСБ", catalog);
        (0, vitest_1.expect)(entry?.code).toBe(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB);
        (0, vitest_1.expect)((0, v2_implementation_stream_catalog_util_1.resolveCatalogEntryScopeStreams)(entry)).toEqual(vitest_1.expect.arrayContaining([
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB,
            v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR,
        ]));
        (0, vitest_1.expect)((0, v2_implementation_stream_catalog_util_1.resolveCatalogDbExecutorName)(entry)).toBe(entry.payload.dbNames[0]);
        const modelScope = (0, v2_implementation_stream_catalog_util_1.resolveModelStreamCatalogScopeFromEntries)(catalog);
        (0, vitest_1.expect)(modelScope).toEqual(vitest_1.expect.arrayContaining([
            v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB,
        ]));
        const aliases = (0, v2_implementation_stream_catalog_util_1.buildStreamFilterAliasMap)(catalog);
        (0, vitest_1.expect)(aliases[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB]).toEqual(vitest_1.expect.arrayContaining([v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB]));
    });
});
