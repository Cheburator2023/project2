import { V2_ANKETA_MAIN_SECTION_IDS } from "./v2-anketa-workflow.types";
import {
	readV2AnketaSectionUiOptions,
	resolveV2AnketaStreamBlockOptions,
} from "./v2-anketa-section-ui.util";
import type { V2JsonSchemaDto, V2UiSchemaDto } from "./v2-template.types";

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function readSchemaProperties(schemaNode: unknown): Record<string, unknown> {
	const node = readRecord(schemaNode);
	const props = readRecord(node?.properties);
	return props ?? {};
}

function readSchemaType(schemaNode: unknown): string | undefined {
	const node = readRecord(schemaNode);
	const type = node?.type;
	if (typeof type === "string") return type;
	if (Array.isArray(type)) {
		const nonNull = type.find((t) => t !== "null");
		return typeof nonNull === "string" ? nonNull : undefined;
	}
	return node?.properties ? "object" : undefined;
}

function ensureUiNode(
	ui: Record<string, unknown>,
	segments: string[],
): Record<string, unknown> {
	let cur: Record<string, unknown> = ui;
	for (const seg of segments) {
		const prev = readRecord(cur[seg]) ?? {};
		cur[seg] = prev;
		cur = prev;
	}
	return cur;
}

function mergeUiOptions(
	node: Record<string, unknown>,
	patch: Record<string, unknown>,
): void {
	const prev = readRecord(node["ui:options"]) ?? {};
	node["ui:options"] = { ...prev, ...patch };
}

/**
 * Проставляет layout-метаданные (`ui:options.sectionRole`, defaultExpanded, …)
 * по структуре jsonSchema (заводская схема и кастомные шаблоны).
 */
export function enrichAnketaLayoutUiSchema(
	uiSchema: V2UiSchemaDto,
	jsonSchema: V2JsonSchemaDto,
): V2UiSchemaDto {
	const ui = structuredClone(uiSchema) as Record<string, unknown>;
	const rootProps = readSchemaProperties(jsonSchema);

	for (const sectionId of V2_ANKETA_MAIN_SECTION_IDS) {
		if (!rootProps[sectionId]) continue;
		const node = ensureUiNode(ui, [sectionId]);
		mergeUiOptions(node, {
			sectionRole: "main",
			workflowSectionId: sectionId,
			defaultExpanded: sectionId === V2_ANKETA_MAIN_SECTION_IDS[0],
			...(sectionId === "detailInfo" ? { titleVariant: "h5" } : {}),
		});
	}

	for (const streamId of V2_ANKETA_MAIN_SECTION_IDS.filter((id) =>
		id.startsWith("stream"),
	)) {
		if (!rootProps[streamId]) continue;
		const streamProps = readSchemaProperties(rootProps[streamId]);
		for (const [key, childSchema] of Object.entries(streamProps)) {
			if (readSchemaType(childSchema) !== "object") continue;
			const node = ensureUiNode(ui, [streamId, key]);
			mergeUiOptions(node, {
				sectionRole: "subsection",
				showFilledCount: true,
			});
		}
	}

	for (const [blockKey, blockSchema] of Object.entries(rootProps)) {
		if (readSchemaType(blockSchema) !== "object") continue;
		const blockUi = ensureUiNode(ui, [blockKey]);
		const streamBlock = resolveV2AnketaStreamBlockOptions(blockUi, blockKey);
		if (!streamBlock.streamBlock) continue;
		mergeUiOptions(blockUi, {
			streamBlock: true,
			...(streamBlock.streamExecutor
				? { streamExecutor: streamBlock.streamExecutor }
				: {}),
		});
		const blockOpts = readV2AnketaSectionUiOptions(blockUi);
		if (
			blockOpts.workflowSectionId &&
			blockKey !== blockOpts.workflowSectionId
		) {
			const uiOpts = readRecord(blockUi["ui:options"]) ?? {};
			delete uiOpts.workflowSectionId;
			blockUi["ui:options"] = uiOpts;
		}
		const blockProps = readSchemaProperties(blockSchema);
		for (const [key, childSchema] of Object.entries(blockProps)) {
			if (readSchemaType(childSchema) !== "object") continue;
			const node = ensureUiNode(ui, [blockKey, key]);
			mergeUiOptions(node, {
				sectionRole: "subsection",
				showFilledCount: true,
			});
		}
	}

	return ui as V2UiSchemaDto;
}
