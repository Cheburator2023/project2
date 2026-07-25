import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import {
	collectExecutorStreamBlocks,
	isV2ModelImplementationStreamCode,
	isV2ModelStreamUmbrellaLabel,
	normalizeStreamBlockExecutor,
	resolveModelStreamUmbrellaBlockPointer,
	V2_MODEL_STREAM_EXECUTOR,
	type V2ImplementationStreamCatalogEntry,
	type V2ImplementationStreamCode,
} from "@smart-anketa/api-contract";
import { nanoid } from "nanoid";
import { ARCH_COMPONENT_PRESET_DEFS } from "./archComponentPresets";
import {
	makeModelStreamUmbrellaBlockJsonSchema,
	makeModelStreamUmbrellaBlockUiOptions,
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
	catalog?: readonly V2ImplementationStreamCatalogEntry[],
): string | null {
	if (isV2ModelStreamUmbrellaLabel(streamExecutor)) {
		return resolveModelStreamUmbrellaBlockPointer(uiSchema);
	}
	const code = normalizeStreamBlockExecutor(streamExecutor, catalog);
	if (!code) return null;
	return (
		collectExecutorStreamBlocks(uiSchema).find((block) =>
			block.streamExecutors.includes(code),
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
 * «Модельный стрим» → umbrella-блок (detailInfo) без создания лишнего field_*.
 * Если передан preferredPointer (блок с DnD) — переносит его в стрим вместо дублирования.
 */
export function placeTypicalWorkInStream(
	jsonSchema: RJSFSchema,
	uiSchema: Record<string, unknown>,
	streamExecutor: string,
	preferredPointer?: string | null,
	catalog?: readonly V2ImplementationStreamCatalogEntry[],
): PlaceTypicalWorkInStreamResult | null {
	const trimmed = streamExecutor.trim();
	const isUmbrella = isV2ModelStreamUmbrellaLabel(trimmed);
	const code: V2ImplementationStreamCode | null = isUmbrella
		? null
		: normalizeStreamBlockExecutor(trimmed, catalog);
	if (!isUmbrella && !code) return null;

	let schema = jsonSchema;
	let ui = uiSchema;

	let streamPointer = resolveStreamBlockPointer(ui, trimmed, catalog);
	if (!streamPointer) {
		const streamKey = isUmbrella ? "detailInfo" : `field_${nanoid(8)}`;
		const streamIndex = clampCanvasInsertIndex(
			schema,
			"/",
			ui as UiSchema,
			listOrderedChildKeys(schema, "/", ui as UiSchema).length,
		);
		const streamSchema = isUmbrella
			? makeModelStreamUmbrellaBlockJsonSchema()
			: makeStreamBlockJsonSchema(code!);
		const withStream = insertChildPropertyAt(
			schema,
			[],
			streamKey,
			streamSchema,
			streamIndex,
		);
		if (!withStream) return null;
		schema = withStream;
		streamPointer = `/${streamKey}`;
		ui = insertKeyToUiOrderAtPointer(ui, "/", streamKey, streamIndex);
		ui = patchUiOptionsAtPointer(
			ui,
			streamPointer,
			isUmbrella
				? makeModelStreamUmbrellaBlockUiOptions()
				: makeStreamBlockUiOptions(code!),
		);
	}

	const streamNorm = normalizeJsonPointer(streamPointer);
	const def = ARCH_COMPONENT_PRESET_DEFS.typicalWork;
	/** На typicalWork: mother-label для umbrella, иначе код child/platform. */
	const executorForTypical: string = isUmbrella
		? V2_MODEL_STREAM_EXECUTOR
		: code!;
	const typicalUiOptions = {
		...def.uiOptions,
		streamExecutor: executorForTypical,
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
			const typicalKey = isUmbrella
				? "detailTypicalTasks"
				: `field_${nanoid(8)}`;
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

	ui = patchUiOptionsAtPointer(ui, typicalPointer, {
		streamExecutor: executorForTypical,
	});

	return {
		jsonSchema: schema,
		uiSchema: ui,
		typicalWorkPointer: typicalPointer,
	};
}

/** Для тестов / панели: стрим — umbrella или дочерний model code. */
export function isModelStreamPlacementTarget(streamExecutor: string): boolean {
	const trimmed = streamExecutor.trim();
	if (isV2ModelStreamUmbrellaLabel(trimmed)) return true;
	const code = normalizeStreamBlockExecutor(trimmed);
	return Boolean(code && isV2ModelImplementationStreamCode(code));
}
