import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import {
	collectExecutorStreamBlocks,
	hasV2StreamBlockTitlePrefix,
	resolveV2AnketaSectionDisplayTitle,
	V2_LEGACY_STREAM_BLOCK_EXECUTOR,
} from "@smart-anketa/api-contract";
import { describe, expect, it } from "vitest";
import { buildSchemaCanvasTree } from "../schemaEditor/schemaCanvasTree";
import { coerceUiSchema } from "./coerceV2TemplateSnapshot";
import { readUiSchemaBranchAtPointer } from "./schemaMutators";
import { resolveSchemaNode } from "./schemaMutators";
import { pointerSegments } from "./schemaPaths";

const defaultSnapshotPath = join(
	dirname(fileURLToPath(import.meta.url)),
	"../../../../../../nestjs-server/src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

type FactorySnapshot = {
	jsonSchema: RJSFSchema;
	uiSchema: Record<string, unknown>;
};

const FACTORY_STREAM_TITLES: Record<string, string> = {
	streamDataSources: "Стрим «Источники данных»",
	streamModelControl: "Стрим «Контроль моделей»",
	streamDigitalAgents: "Стрим «Цифровые агенты»",
	streamStreamingData: "Стрим «Потоковые данные»",
	field_i8dL7QZa: "Стрим «ДАДМ»",
	field_aJEu5ziT: "Стрим «Платформы и решения для моделирования»",
};

function loadFactorySnapshot(): FactorySnapshot {
	return JSON.parse(readFileSync(defaultSnapshotPath, "utf8")) as FactorySnapshot;
}

function readJsonSchemaTitle(
	jsonSchema: RJSFSchema,
	blockKey: string,
): string | undefined {
	const node = resolveSchemaNode(jsonSchema, pointerSegments(`/${blockKey}`));
	return typeof node?.title === "string" ? node.title : undefined;
}

describe("factory snapshot stream titles", () => {
	const snapshot = loadFactorySnapshot();
	const uiSchema = coerceUiSchema(
		snapshot.uiSchema,
		snapshot.jsonSchema,
	) as Record<string, unknown>;

	it("covers all legacy stream block keys from factory snapshot", () => {
		for (const blockKey of Object.keys(V2_LEGACY_STREAM_BLOCK_EXECUTOR)) {
			expect(FACTORY_STREAM_TITLES[blockKey]).toBeDefined();
		}
	});

	it("keeps canonical titles after coerceUiSchema roundtrip", () => {
		for (const [blockKey, expectedTitle] of Object.entries(
			FACTORY_STREAM_TITLES,
		)) {
			const schemaTitle = readJsonSchemaTitle(snapshot.jsonSchema, blockKey);
			expect(schemaTitle).toBe(expectedTitle);

			const uiBranch = readUiSchemaBranchAtPointer(uiSchema, `/${blockKey}`);
			const displayTitle = resolveV2AnketaSectionDisplayTitle(
				schemaTitle ?? blockKey,
				uiBranch,
				blockKey,
			);
			expect(displayTitle).toBe(expectedTitle);
			expect(hasV2StreamBlockTitlePrefix(displayTitle)).toBe(true);
		}
	});

	it("shows same titles on constructor canvas tree", () => {
		const tree = buildSchemaCanvasTree(
			snapshot.jsonSchema,
			uiSchema as UiSchema,
		);
		for (const [blockKey, expectedTitle] of Object.entries(
			FACTORY_STREAM_TITLES,
		)) {
			expect(tree.find((n) => n.id === `/${blockKey}`)?.text).toBe(
				expectedTitle,
			);
		}
	});

	it("lists all factory stream blocks via collectExecutorStreamBlocks", () => {
		const blocks = collectExecutorStreamBlocks(uiSchema);
		const keys = new Set(blocks.map((b) => b.blockKey));
		for (const blockKey of Object.keys(FACTORY_STREAM_TITLES)) {
			expect(keys.has(blockKey)).toBe(true);
		}
	});
});
