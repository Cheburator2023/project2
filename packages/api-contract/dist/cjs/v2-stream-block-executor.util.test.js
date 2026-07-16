"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_implementation_streams_util_1 = require("./v2-implementation-streams.util");
const v2_stream_block_executor_util_1 = require("./v2-stream-block-executor.util");
(0, vitest_1.describe)("v2-stream-block-executor.util", () => {
    (0, vitest_1.it)("normalizes implementation stream codes and legacy labels", () => {
        (0, vitest_1.expect)((0, v2_stream_block_executor_util_1.normalizeStreamBlockExecutor)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC)).toBe(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC);
        (0, vitest_1.expect)((0, v2_stream_block_executor_util_1.normalizeStreamBlockExecutor)("Источники данных")).toBe(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC);
        (0, vitest_1.expect)((0, v2_stream_block_executor_util_1.normalizeStreamBlockExecutor)("ПиРМ")).toBe(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM);
        (0, vitest_1.expect)((0, v2_stream_block_executor_util_1.normalizeStreamBlockExecutor)("ДАДМ")).toBe(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM);
    });
    (0, vitest_1.it)("maps legacy block keys to implementation stream codes", () => {
        (0, vitest_1.expect)((0, v2_stream_block_executor_util_1.inferLegacyStreamBlockExecutorCode)("streamDataSources")).toBe(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC);
        (0, vitest_1.expect)((0, v2_stream_block_executor_util_1.inferLegacyStreamBlockExecutorCode)("streamModelControl")).toBe(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.MDLCTL);
    });
    (0, vitest_1.it)("resolves labels and db scopes for typical work matching", () => {
        (0, vitest_1.expect)((0, v2_stream_block_executor_util_1.resolveStreamBlockExecutorLabel)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC)).toBe(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC]);
        (0, vitest_1.expect)((0, v2_stream_block_executor_util_1.resolveStreamBlockExecutorScopeStreams)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC)).toEqual(vitest_1.expect.arrayContaining([
            "ИД. Внутренний",
            "Источники данных",
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC,
        ]));
    });
    (0, vitest_1.it)("maps db stream names to implementation stream codes", () => {
        (0, vitest_1.expect)((0, v2_stream_block_executor_util_1.resolveLogicStreamForDbExecutor)("ИД. Внутренний")).toBe(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC);
        (0, vitest_1.expect)((0, v2_stream_block_executor_util_1.resolveLogicStreamForDbExecutor)("ДАДМ")).toBe(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM);
        (0, vitest_1.expect)((0, v2_stream_block_executor_util_1.resolveLogicStreamDbExecutor)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM)).toBe("ДАДМ");
    });
});
