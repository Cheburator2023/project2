import { describe, expect, it } from "vitest";
import {
	V2_IMPLEMENTATION_STREAM,
	V2_IMPLEMENTATION_STREAM_LABELS,
} from "./v2-implementation-streams.util";
import {
	collectExecutorStreamBlocks,
	formatV2StreamBlockSectionTitle,
	isExecutorStreamPresentInSchema,
	readV2AnketaSectionUiOptions,
	resolveStreamExecutorForTypicalWorkOutputPath,
	resolveV2AnketaSectionDisplayTitle,
	resolveV2AnketaStreamBlockOptions,
} from "./v2-anketa-section-ui.util";
import {
	inferLegacyStreamBlockExecutorCode,
	normalizeStreamBlockExecutor,
} from "./v2-stream-block-executor.util";
import {
	isV2ExecutorStreamLabel,
	resolveExecutorScopeDbStreams,
	typicalWorkAssignedToAnyExecutorStream,
	typicalWorkAssignedToExecutorStream,
	V2_EXECUTOR_STREAM_LABELS,
} from "./v2-executor-streams.util";
import {
	V2_MODEL_STREAM_EXECUTOR,
	resolveModelStreamCatalogScopeDbStreams,
} from "./v2-model-stream-typical-works.constants";

describe("v2-executor-streams.util", () => {
	it("lists seven executor stream labels", () => {
		expect(V2_EXECUTOR_STREAM_LABELS).toEqual([
			"ДАДМ",
			"ПиРМ",
			"Источники данных",
			"Контроль моделей",
			"Цифровые агенты",
			"Потоковые данные",
			"Модельный стрим",
		]);
	});

	it("maps legacy block keys to implementation stream codes", () => {
		expect(inferLegacyStreamBlockExecutorCode("streamDataSources")).toBe(
			V2_IMPLEMENTATION_STREAM.IDSRC,
		);
		expect(inferLegacyStreamBlockExecutorCode("field_i8dL7QZa")).toBe(
			V2_IMPLEMENTATION_STREAM.DADM,
		);
	});

	it("validates executor stream labels", () => {
		expect(isV2ExecutorStreamLabel("ПиРМ")).toBe(true);
		expect(isV2ExecutorStreamLabel("Unknown")).toBe(false);
	});
});

describe("resolveV2AnketaStreamBlockOptions", () => {
	it("reads explicit stream block metadata", () => {
		const opts = readV2AnketaSectionUiOptions({
			"ui:options": {
				streamBlock: true,
				streamExecutor: V2_IMPLEMENTATION_STREAM.DIGAGT,
			},
		});
		expect(opts.streamBlock).toBe(true);
		expect(opts.streamExecutor).toBe(V2_IMPLEMENTATION_STREAM.DIGAGT);
		expect(
			resolveV2AnketaStreamBlockOptions(
				{
					"ui:options": {
						streamBlock: true,
						streamExecutor: V2_IMPLEMENTATION_STREAM.IDSRC,
					},
				},
				"customBlock",
			),
		).toEqual({
			streamBlock: true,
			streamExecutor: V2_IMPLEMENTATION_STREAM.IDSRC,
			streamExecutors: [V2_IMPLEMENTATION_STREAM.IDSRC],
			streamBlockRoles: [],
		});
	});

	it("infers legacy stream blocks without explicit flag", () => {
		expect(
			resolveV2AnketaStreamBlockOptions(undefined, "streamModelControl"),
		).toEqual({
			streamBlock: true,
			streamExecutor: V2_IMPLEMENTATION_STREAM.MDLCTL,
			streamExecutors: [V2_IMPLEMENTATION_STREAM.MDLCTL],
			streamBlockRoles: [],
		});
	});
});

describe("resolveV2AnketaSectionDisplayTitle", () => {
	it("prefixes stream object block titles with Стрим", () => {
		expect(
			resolveV2AnketaSectionDisplayTitle(
				V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.IDSRC],
				{
					"ui:options": {
						streamBlock: true,
						streamExecutor: V2_IMPLEMENTATION_STREAM.IDSRC,
					},
				},
				"field_dadm",
			),
		).toBe(
			`Стрим «${V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.IDSRC]}»`,
		);
		expect(
			resolveV2AnketaSectionDisplayTitle(
				V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.MDLCTL],
				undefined,
				"streamModelControl",
			),
		).toBe(
			`Стрим «${V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.MDLCTL]}»`,
		);
	});

	it("keeps factory snapshot titles without double prefix", () => {
		expect(
			resolveV2AnketaSectionDisplayTitle(
				"Стрим «Источники данных»",
				{
					"ui:options": {
						streamBlock: true,
						streamExecutor: V2_IMPLEMENTATION_STREAM.IDSRC,
					},
				},
				"streamDataSources",
			),
		).toBe("Стрим «Источники данных»");
	});

	it("leaves non-stream object titles unchanged", () => {
		expect(
			resolveV2AnketaSectionDisplayTitle(
				"Общие сведения",
				{ "ui:options": { sectionRole: "main" } },
				"generalInfo",
			),
		).toBe("Общие сведения");
	});

	it("formatV2StreamBlockSectionTitle is idempotent", () => {
		expect(
			formatV2StreamBlockSectionTitle(V2_IMPLEMENTATION_STREAM.PIRM),
		).toBe(`Стрим «${V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.PIRM]}»`);
		expect(
			formatV2StreamBlockSectionTitle(
				`Стрим «${V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.PIRM]}»`,
			),
		).toBe(`Стрим «${V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.PIRM]}»`);
	});
});

describe("collectExecutorStreamBlocks", () => {
	it("lists explicit and legacy root stream blocks", () => {
		const blocks = collectExecutorStreamBlocks({
			field_src: {
				"ui:options": {
					streamBlock: true,
					streamExecutor: V2_IMPLEMENTATION_STREAM.IDSRC,
				},
			},
			streamDataSources: {},
		});
		expect(blocks.map((b) => b.streamExecutors).flat().sort()).toEqual([
			V2_IMPLEMENTATION_STREAM.IDSRC,
			V2_IMPLEMENTATION_STREAM.IDSRC,
		]);
	});

	it("detects stream presence for logic labels and legacy db names", () => {
		const uiSchema = {
			field_src: {
				"ui:options": {
					streamBlock: true,
					streamExecutor: V2_IMPLEMENTATION_STREAM.IDSRC,
				},
			},
		};
		expect(
			isExecutorStreamPresentInSchema(uiSchema, V2_IMPLEMENTATION_STREAM.IDSRC),
		).toBe(true);
		expect(isExecutorStreamPresentInSchema(uiSchema, "ИД. Внутренний")).toBe(
			true,
		);
		expect(isExecutorStreamPresentInSchema(uiSchema, "ДАДМ")).toBe(false);
	});

	it("resolves stream for typicalWork block from explicit option or root stream", () => {
		const uiSchema = {
			field_stream: {
				"ui:options": {
					streamBlock: true,
					streamExecutor: V2_IMPLEMENTATION_STREAM.PIRM,
				},
				field_tasks: {
					"ui:options": { archComponent: "typicalWork" },
				},
			},
			field_root: {
				"ui:options": {
					archComponent: "typicalWork",
					streamExecutor: V2_IMPLEMENTATION_STREAM.IDSRC,
				},
			},
		};
		expect(
			resolveStreamExecutorForTypicalWorkOutputPath(
				uiSchema,
				"field_stream.field_tasks",
			),
		).toEqual([V2_IMPLEMENTATION_STREAM.PIRM]);
		expect(
			resolveStreamExecutorForTypicalWorkOutputPath(uiSchema, "field_root"),
		).toEqual([V2_IMPLEMENTATION_STREAM.IDSRC]);
	});

	it("reads multi-stream executor metadata", () => {
		const opts = readV2AnketaSectionUiOptions({
			"ui:options": {
				streamBlock: true,
				streamExecutor: [
					V2_IMPLEMENTATION_STREAM.IDSRC,
					V2_IMPLEMENTATION_STREAM.PIRM,
				],
			},
		});
		expect(opts.streamExecutor).toEqual([
			V2_IMPLEMENTATION_STREAM.IDSRC,
			V2_IMPLEMENTATION_STREAM.PIRM,
		]);
	});

	it("typicalWorkAssignedToAnyExecutorStream matches any selected stream", () => {
		expect(
			typicalWorkAssignedToAnyExecutorStream(
				["ИД. Внутренний"],
				[V2_IMPLEMENTATION_STREAM.IDSRC, V2_IMPLEMENTATION_STREAM.DADM],
			),
		).toBe(true);
		expect(
			typicalWorkAssignedToAnyExecutorStream(
				["ДАДМ"],
				[V2_IMPLEMENTATION_STREAM.IDSRC, V2_IMPLEMENTATION_STREAM.DADM],
			),
		).toBe(true);
		expect(
			typicalWorkAssignedToAnyExecutorStream(
				["Моделирование РБ"],
				[V2_IMPLEMENTATION_STREAM.IDSRC, V2_IMPLEMENTATION_STREAM.DADM],
			),
		).toBe(false);
	});

	it("typicalWorkAssignedToExecutorStream matches DB stream aliases", () => {
		expect(
			typicalWorkAssignedToExecutorStream(
				["ИД. Внутренний"],
				V2_IMPLEMENTATION_STREAM.IDSRC,
			),
		).toBe(true);
		expect(
			typicalWorkAssignedToExecutorStream(
				["Контроль моделей"],
				V2_IMPLEMENTATION_STREAM.IDSRC,
			),
		).toBe(false);
	});

	it("expands legacy «Модельный стрим» catalog scope to five model DB streams", () => {
		const scope = resolveExecutorScopeDbStreams(V2_MODEL_STREAM_EXECUTOR);
		expect(scope).toEqual(
			expect.arrayContaining([
				V2_MODEL_STREAM_EXECUTOR,
				"Модельные стримы",
				"Разработка моделей КМБ и КСБ",
				"Моделирование РБ",
				"AI-модели партнерств",
				"Финансовое моделирование",
				"Моделирование RnD",
				V2_IMPLEMENTATION_STREAM.KMBKCB,
				V2_IMPLEMENTATION_STREAM.RB,
				V2_IMPLEMENTATION_STREAM.PTITPC,
				V2_IMPLEMENTATION_STREAM.FINMDL,
				V2_IMPLEMENTATION_STREAM.RND,
			]),
		);
		expect(resolveModelStreamCatalogScopeDbStreams()).toEqual(scope);
		expect(
			typicalWorkAssignedToExecutorStream(
				["Разработка моделей КМБ и КСБ"],
				V2_MODEL_STREAM_EXECUTOR,
			),
		).toBe(true);
		expect(
			typicalWorkAssignedToExecutorStream(
				[V2_MODEL_STREAM_EXECUTOR],
				V2_IMPLEMENTATION_STREAM.KMBKCB,
			),
		).toBe(true);
		expect(
			resolveExecutorScopeDbStreams(V2_IMPLEMENTATION_STREAM.KMBKCB),
		).toEqual(
			expect.arrayContaining([
				"Разработка моделей КМБ и КСБ",
				V2_MODEL_STREAM_EXECUTOR,
			]),
		);
	});
});
