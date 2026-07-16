import {
	collectGeneratedTypicalWorkArrayPaths,
	normalizeStreamBlockExecutors,
	readTypicalWorkBoundWorkIdsAtOutputPath,
	resolveStreamExecutorForTypicalWorkOutputPath,
	TYPICAL_WORK_BOUND_WORK_IDS_KEY,
	typicalWorkAssignedToAnyExecutorStream,
	type TypicalWorkCatalogBindingItem,
} from "@smart-anketa/api-contract";
import { normalizeJsonPointer } from "../utils/schemaPaths";
import { patchUiOptionsAtPointer } from "../utils/schemaMutators";

export type TypicalWorkCatalogItem = TypicalWorkCatalogBindingItem;

export function pointerToOutputPath(pointer: string): string {
	return normalizeJsonPointer(pointer).split("/").filter(Boolean).join(".");
}

export function readBoundWorkIdsAtPointer(
	uiSchema: unknown,
	pointer: string,
): string[] | undefined {
	return readTypicalWorkBoundWorkIdsAtOutputPath(
		uiSchema,
		pointerToOutputPath(pointer),
	);
}

export function filterTypicalWorksForStreamExecutor(
	catalog: readonly TypicalWorkCatalogItem[],
	streamExecutor: string | readonly string[] | null | undefined,
): TypicalWorkCatalogItem[] {
	const streams = normalizeStreamBlockExecutors(streamExecutor);
	if (streams.length === 0) return [];
	return catalog.filter((work) =>
		typicalWorkAssignedToAnyExecutorStream(work.streams, streams),
	);
}

/** Список id для отображения: явный boundWorkIds или работы стрима блока (legacy). */
export function resolveTypicalWorkDisplayBoundIds(
	uiSchema: unknown,
	pointer: string,
	catalog: readonly TypicalWorkCatalogItem[],
	streamExecutor: string | readonly string[] | null | undefined,
): string[] {
	const explicit = readBoundWorkIdsAtPointer(uiSchema, pointer);
	if (explicit !== undefined) return explicit;
	return filterTypicalWorksForStreamExecutor(catalog, streamExecutor).map(
		(work) => work.id,
	);
}

/** @deprecated Используйте resolveTypicalWorkDisplayBoundIds с streamExecutor. */
export function resolveEffectiveBoundWorkIds(
	uiSchema: unknown,
	pointer: string,
	allWorkIds: string[],
): string[] {
	const explicit = readBoundWorkIdsAtPointer(uiSchema, pointer);
	if (explicit !== undefined) return explicit;
	return allWorkIds;
}

function resolveBindingBaseIds(
	uiSchema: unknown,
	pointer: string,
	catalog: readonly TypicalWorkCatalogItem[],
	streamExecutor: string | readonly string[] | null | undefined,
): string[] {
	return resolveTypicalWorkDisplayBoundIds(
		uiSchema,
		pointer,
		catalog,
		streamExecutor,
	);
}

export function patchBoundWorkIdsAtPointer(
	uiSchema: Record<string, unknown>,
	pointer: string,
	boundWorkIds: string[],
): Record<string, unknown> {
	return patchUiOptionsAtPointer(uiSchema, pointer, {
		[TYPICAL_WORK_BOUND_WORK_IDS_KEY]: [...new Set(boundWorkIds)],
	});
}

export function appendBoundWorkIdAtPointer(
	uiSchema: Record<string, unknown>,
	pointer: string,
	workId: string,
	catalog: readonly TypicalWorkCatalogItem[],
	streamExecutor: string | readonly string[] | null | undefined,
): Record<string, unknown> {
	const current = resolveBindingBaseIds(
		uiSchema,
		pointer,
		catalog,
		streamExecutor,
	);
	if (current.includes(workId)) {
		return patchBoundWorkIdsAtPointer(uiSchema, pointer, current);
	}
	return patchBoundWorkIdsAtPointer(uiSchema, pointer, [...current, workId]);
}

export function removeBoundWorkIdAtPointer(
	uiSchema: Record<string, unknown>,
	pointer: string,
	workId: string,
	catalog: readonly TypicalWorkCatalogItem[],
	streamExecutor: string | readonly string[] | null | undefined,
): Record<string, unknown> {
	const current = resolveBindingBaseIds(
		uiSchema,
		pointer,
		catalog,
		streamExecutor,
	);
	return patchBoundWorkIdsAtPointer(
		uiSchema,
		pointer,
		current.filter((id) => id !== workId),
	);
}

export function outputPathToPointer(outputPath: string): string {
	return `/${outputPath.split(".").filter(Boolean).join("/")}`;
}

/** Убрать work id из boundWorkIds на всех блоках typicalWork (после удаления работы в логике). */
export function removeWorkIdFromAllTypicalWorkBindings(
	uiSchema: Record<string, unknown>,
	workId: string,
	catalog: readonly TypicalWorkCatalogItem[],
): Record<string, unknown> {
	const outputPaths = collectGeneratedTypicalWorkArrayPaths(uiSchema);
	if (outputPaths.length === 0) return uiSchema;

	let next = uiSchema;
	for (const outputPath of outputPaths) {
		const pointer = outputPathToPointer(outputPath);
		const streamExecutors = resolveStreamExecutorForTypicalWorkOutputPath(
			next,
			outputPath,
		);
		const base = resolveBindingBaseIds(next, pointer, catalog, streamExecutors);
		if (!base.includes(workId)) continue;
		next = removeBoundWorkIdAtPointer(
			next,
			pointer,
			workId,
			catalog,
			streamExecutors,
		);
	}
	return next;
}
