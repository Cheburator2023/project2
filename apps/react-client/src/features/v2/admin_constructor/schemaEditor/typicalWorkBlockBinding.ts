import {
	TYPICAL_WORK_BOUND_WORK_IDS_KEY,
	collectGeneratedTypicalWorkArrayPaths,
	readTypicalWorkBoundWorkIdsAtOutputPath,
} from "@smart-anketa/api-contract";
import { normalizeJsonPointer } from "../utils/schemaPaths";
import { patchUiOptionsAtPointer } from "../utils/schemaMutators";

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

/** Эффективный список id для UI: legacy-блок без boundWorkIds показывает все работы шаблона. */
export function resolveEffectiveBoundWorkIds(
	uiSchema: unknown,
	pointer: string,
	allWorkIds: string[],
): string[] {
	const explicit = readBoundWorkIdsAtPointer(uiSchema, pointer);
	if (explicit !== undefined) return explicit;
	return allWorkIds;
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
	allWorkIds: string[],
): Record<string, unknown> {
	const current = resolveEffectiveBoundWorkIds(uiSchema, pointer, allWorkIds);
	if (current.includes(workId)) {
		return patchBoundWorkIdsAtPointer(uiSchema, pointer, current);
	}
	return patchBoundWorkIdsAtPointer(uiSchema, pointer, [...current, workId]);
}

export function removeBoundWorkIdAtPointer(
	uiSchema: Record<string, unknown>,
	pointer: string,
	workId: string,
	allWorkIds: string[],
): Record<string, unknown> {
	const current = resolveEffectiveBoundWorkIds(uiSchema, pointer, allWorkIds);
	return patchBoundWorkIdsAtPointer(
		uiSchema,
		pointer,
		current.filter((id) => id !== workId),
	);
}

function outputPathToPointer(outputPath: string): string {
	return `/${outputPath.split(".").filter(Boolean).join("/")}`;
}

/** Убрать work id из boundWorkIds на всех блоках typicalWork (после удаления работы в логике). */
export function removeWorkIdFromAllTypicalWorkBindings(
	uiSchema: Record<string, unknown>,
	workId: string,
	allWorkIds: string[],
): Record<string, unknown> {
	const outputPaths = collectGeneratedTypicalWorkArrayPaths(uiSchema);
	if (outputPaths.length === 0) return uiSchema;

	let next = uiSchema;
	for (const outputPath of outputPaths) {
		const pointer = outputPathToPointer(outputPath);
		const explicit = readBoundWorkIdsAtPointer(next, pointer);
		if (explicit === undefined) {
			if (!allWorkIds.includes(workId)) continue;
			const remaining = allWorkIds.filter((id) => id !== workId);
			next = patchBoundWorkIdsAtPointer(next, pointer, remaining);
			continue;
		}
		if (!explicit.includes(workId)) continue;
		next = removeBoundWorkIdAtPointer(next, pointer, workId, allWorkIds);
	}
	return next;
}
