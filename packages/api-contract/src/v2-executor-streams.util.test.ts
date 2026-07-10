import { describe, expect, it } from "vitest";
import {
	inferLegacyStreamExecutorForBlockKey,
	isV2ExecutorStreamLabel,
	V2_EXECUTOR_STREAM_LABELS,
} from "./v2-executor-streams.util";
import {
	collectExecutorStreamBlocks,
	isExecutorStreamPresentInSchema,
	resolveV2AnketaStreamBlockOptions,
	readV2AnketaSectionUiOptions,
	resolveStreamExecutorForTypicalWorkOutputPath,
} from "./v2-anketa-section-ui.util";

describe("v2-executor-streams.util", () => {
	it("lists six executor stream labels", () => {
		expect(V2_EXECUTOR_STREAM_LABELS).toEqual([
			"ДАДМ",
			"ПиРМ",
			"Источники данных",
			"Контроль моделей",
			"Цифровые агенты",
			"Потоковые данные",
		]);
	});

	it("maps legacy block keys to executor streams", () => {
		expect(inferLegacyStreamExecutorForBlockKey("streamDataSources")).toBe(
			"Источники данных",
		);
		expect(inferLegacyStreamExecutorForBlockKey("field_i8dL7QZa")).toBe("ДАДМ");
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
				streamExecutor: "Цифровые агенты",
			},
		});
		expect(opts.streamBlock).toBe(true);
		expect(opts.streamExecutor).toBe("Цифровые агенты");
		expect(
			resolveV2AnketaStreamBlockOptions(
				{ "ui:options": { streamBlock: true, streamExecutor: "ДАДМ" } },
				"customBlock",
			),
		).toEqual({ streamBlock: true, streamExecutor: "ДАДМ" });
	});

	it("infers legacy stream blocks without explicit flag", () => {
		expect(
			resolveV2AnketaStreamBlockOptions(undefined, "streamModelControl"),
		).toEqual({ streamBlock: true, streamExecutor: "Контроль моделей" });
	});
});

describe("collectExecutorStreamBlocks", () => {
	it("lists explicit and legacy root stream blocks", () => {
		const blocks = collectExecutorStreamBlocks({
			field_dadm: {
				"ui:options": { streamBlock: true, streamExecutor: "ДАДМ" },
			},
			streamDataSources: {},
		});
		expect(blocks.map((b) => b.streamExecutor).sort()).toEqual([
			"ДАДМ",
			"Источники данных",
		]);
	});

	it("detects stream presence for logic labels and legacy db names", () => {
		const uiSchema = {
			field_src: {
				"ui:options": {
					streamBlock: true,
					streamExecutor: "Источники данных",
				},
			},
		};
		expect(isExecutorStreamPresentInSchema(uiSchema, "Источники данных")).toBe(
			true,
		);
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
					streamExecutor: "ПиРМ",
				},
				field_tasks: {
					"ui:options": { archComponent: "typicalWork" },
				},
			},
			field_root: {
				"ui:options": {
					archComponent: "typicalWork",
					streamExecutor: "ДАДМ",
				},
			},
		};
		expect(
			resolveStreamExecutorForTypicalWorkOutputPath(
				uiSchema,
				"field_stream.field_tasks",
			),
		).toBe("ПиРМ");
		expect(
			resolveStreamExecutorForTypicalWorkOutputPath(uiSchema, "field_root"),
		).toBe("ДАДМ");
	});
});
