import { describe, expect, it } from "vitest";
import {
	V2_IMPLEMENTATION_STREAM,
	V2_IMPLEMENTATION_STREAM_LABELS,
} from "./v2-implementation-streams.util";
import {
	inferLegacyStreamBlockExecutorCode,
	normalizeStreamBlockExecutor,
	resolveLogicStreamDbExecutor,
	resolveLogicStreamForDbExecutor,
	resolveStreamBlockExecutorLabel,
	resolveStreamBlockExecutorScopeStreams,
	serializeStreamBlockExecutors,
	normalizeStreamBlockExecutors,
} from "./v2-stream-block-executor.util";

describe("v2-stream-block-executor.util", () => {
	it("normalizes implementation stream codes and legacy labels", () => {
		expect(normalizeStreamBlockExecutor(V2_IMPLEMENTATION_STREAM.IDSRC)).toBe(
			V2_IMPLEMENTATION_STREAM.IDSRC,
		);
		expect(normalizeStreamBlockExecutor("Источники данных")).toBe(
			V2_IMPLEMENTATION_STREAM.IDSRC,
		);
		expect(normalizeStreamBlockExecutor("ПиРМ")).toBe(
			V2_IMPLEMENTATION_STREAM.PIRM,
		);
		expect(normalizeStreamBlockExecutor("ДАДМ")).toBe(
			V2_IMPLEMENTATION_STREAM.DADM,
		);
	});

	it("maps legacy block keys to implementation stream codes", () => {
		expect(inferLegacyStreamBlockExecutorCode("streamDataSources")).toBe(
			V2_IMPLEMENTATION_STREAM.IDSRC,
		);
		expect(inferLegacyStreamBlockExecutorCode("streamModelControl")).toBe(
			V2_IMPLEMENTATION_STREAM.MDLCTL,
		);
	});

	it("resolves labels and db scopes for typical work matching", () => {
		expect(
			resolveStreamBlockExecutorLabel(V2_IMPLEMENTATION_STREAM.IDSRC),
		).toBe(V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.IDSRC]);
		expect(
			resolveStreamBlockExecutorScopeStreams(V2_IMPLEMENTATION_STREAM.IDSRC),
		).toEqual(
			expect.arrayContaining([
				"ИД. Внутренний",
				"Источники данных",
				V2_IMPLEMENTATION_STREAM.IDSRC,
			]),
		);
		expect(
			resolveStreamBlockExecutorScopeStreams(V2_IMPLEMENTATION_STREAM.KMBKCB),
		).toEqual(
			expect.arrayContaining([
				"Разработка моделей КМБ и КСБ",
				V2_IMPLEMENTATION_STREAM.KMBKCB,
				"Модельный стрим",
			]),
		);
		expect(normalizeStreamBlockExecutor("Модельный стрим")).toBeNull();
	});

	it("maps db stream names to implementation stream codes", () => {
		expect(resolveLogicStreamForDbExecutor("ИД. Внутренний")).toBe(
			V2_IMPLEMENTATION_STREAM.IDSRC,
		);
		expect(resolveLogicStreamForDbExecutor("ДАДМ")).toBe(
			V2_IMPLEMENTATION_STREAM.DADM,
		);
		expect(resolveLogicStreamDbExecutor(V2_IMPLEMENTATION_STREAM.DADM)).toBe(
			"ДАДМ",
		);
	});

	it("normalizes and serializes multi-stream executor values", () => {
		expect(
			normalizeStreamBlockExecutors([
				V2_IMPLEMENTATION_STREAM.IDSRC,
				"Источники данных",
				V2_IMPLEMENTATION_STREAM.PIRM,
			]),
		).toEqual([
			V2_IMPLEMENTATION_STREAM.IDSRC,
			V2_IMPLEMENTATION_STREAM.PIRM,
		]);
		expect(
			serializeStreamBlockExecutors([
				V2_IMPLEMENTATION_STREAM.IDSRC,
				V2_IMPLEMENTATION_STREAM.PIRM,
			]),
		).toEqual([
			V2_IMPLEMENTATION_STREAM.IDSRC,
			V2_IMPLEMENTATION_STREAM.PIRM,
		]);
		expect(serializeStreamBlockExecutors([V2_IMPLEMENTATION_STREAM.IDSRC])).toBe(
			V2_IMPLEMENTATION_STREAM.IDSRC,
		);
	});
});
