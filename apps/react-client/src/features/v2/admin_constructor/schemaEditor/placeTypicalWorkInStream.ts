import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import {
	collectExecutorStreamBlocks,
	isV2ExecutorStreamLabel,
	type V2ExecutorStreamLabel,
} from "@smart-anketa/api-contract";
import { nanoid } from "nanoid";
import { ARCH_COMPONENT_PRESET_DEFS } from "./archComponentPresets";
import {
	makeStreamBlockJsonSchema,
	makeStreamBlockUiOptions,
} from "./streamBlockHelpers";
import { clampCanvasInsertIndex } from "./schemaCanvasTree";
import { findTypicalWorkPointerInSubtree } from "./typicalWorkCanvasConstraints";
import { normalizeJsonPointer, pointerSegments } from "../utils/schemaPaths";
import {
	insertChildPropertyAt,
	insertKeyToUiOrderAtPointer,
	listOrderedChildKeys,
	mergeUiBranchAtPointer,
	movePropertyAtPointer,
	moveUiSchemaBranchAtPointer,
	patchUiOptionsAtPointer,
} from "../utils/schemaMutators";

function isPointerUnderParent(pointer: string, parentPointer: string): boolean {
	const child = normalizeJsonPointer(pointer);
	const parent = normalizeJsonPointer(parentPointer);
	if (parent === "/") return child !== "/";
	return child === parent || child.startsWith(`${parent}/`);
}

export function resolveStreamBlockPointer(
	uiSchema: unknown,
	streamExecutor: string,
): string | null {
	if (!isV2ExecutorStreamLabel(streamExecutor)) return null;
	return (
		collectExecutorStreamBlocks(uiSchema).find(
			(block) => block.streamExecutor === streamExecutor,
		)?.pointer ?? null
	);
}

export function findTypicalWorkPointerUnderParent(
	jsonSchema: RJSFSchema,
	uiSchema: unknown,
	parentPointer: string,
): string | null {
	return findTypicalWorkPointerInSubtree(
		jsonSchema,
		uiSchema as UiSchema,
		parentPointer,
	);
}

export type PlaceTypicalWorkInStreamResult = {
	jsonSchema: RJSFSchema;
	uiSchema: Record<string, unknown>;
	typicalWorkPointer: string;
};

/**
 * Создаёт стримовый блок (если нет), вкладывает typicalWork внутрь и задаёт streamExecutor.
 * Если передан preferredPointer (блок с DnD) — переносит его в стрим вместо дублирования.
 */
export function placeTypicalWorkInStream(
	jsonSchema: RJSFSchema,
	uiSchema: Record<string, unknown>,
	streamExecutor: V2ExecutorStreamLabel,
	preferredPointer?: string | null,
): PlaceTypicalWorkInStreamResult | null {
	let schema = jsonSchema;
	let ui = uiSchema;

	let streamPointer = resolveStreamBlockPointer(ui, streamExecutor);
	if (!streamPointer) {
		const streamKey = `field_${nanoid(8)}`;
		const streamIndex = clampCanvasInsertIndex(
			schema,
			"/",
			ui as UiSchema,
			listOrderedChildKeys(schema, "/", ui as UiSchema).length,
		);
		const withStream = insertChildPropertyAt(
			schema,
			[],
			streamKey,
			makeStreamBlockJsonSchema(streamExecutor),
			streamIndex,
		);
		if (!withStream) return null;
		schema = withStream;
		streamPointer = `/${streamKey}`;
		ui = insertKeyToUiOrderAtPointer(ui, "/", streamKey, streamIndex);
		ui = patchUiOptionsAtPointer(
			ui,
			streamPointer,
			makeStreamBlockUiOptions(streamExecutor),
		);
	}

	const streamNorm = normalizeJsonPointer(streamPointer);
	const def = ARCH_COMPONENT_PRESET_DEFS.typicalWork;
	const typicalUiOptions = {
		...def.uiOptions,
		streamExecutor,
	};

	let typicalPointer: string | null = null;

	if (preferredPointer) {
		const pref = normalizeJsonPointer(preferredPointer);
		if (isPointerUnderParent(pref, streamNorm)) {
			typicalPointer = pref;
		} else {
			const fieldKey = pointerSegments(pref).at(-1);
			if (!fieldKey) return null;
			const moveIndex = clampCanvasInsertIndex(
				schema,
				streamNorm,
				ui as UiSchema,
				Number.MAX_SAFE_INTEGER,
			);
			const movedSchema = movePropertyAtPointer(
				schema,
				pref,
				streamNorm,
				moveIndex,
			);
			if (!movedSchema) return null;
			schema = movedSchema;
			ui = moveUiSchemaBranchAtPointer(ui, pref, streamNorm, moveIndex);
			typicalPointer = `${streamNorm}/${fieldKey}`;
		}
	} else {
		typicalPointer = findTypicalWorkPointerUnderParent(
			schema,
			ui,
			streamNorm,
		);
		if (!typicalPointer) {
			const typicalKey = `field_${nanoid(8)}`;
			const typicalIndex = clampCanvasInsertIndex(
				schema,
				streamNorm,
				ui as UiSchema,
				Number.MAX_SAFE_INTEGER,
			);
			const withTypical = insertChildPropertyAt(
				schema,
				pointerSegments(streamNorm),
				typicalKey,
				def.make(),
				typicalIndex,
			);
			if (!withTypical) return null;
			schema = withTypical;
			typicalPointer = `${streamNorm}/${typicalKey}`;
			ui = insertKeyToUiOrderAtPointer(ui, streamNorm, typicalKey, typicalIndex);
			ui = patchUiOptionsAtPointer(ui, typicalPointer, typicalUiOptions);
			if (def.uiBranch) {
				ui = mergeUiBranchAtPointer(ui, typicalPointer, def.uiBranch);
			}
		}
	}

	ui = patchUiOptionsAtPointer(ui, typicalPointer, { streamExecutor });

	return {
		jsonSchema: schema,
		uiSchema: ui,
		typicalWorkPointer: typicalPointer,
	};
}
