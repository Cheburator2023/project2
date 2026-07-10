import {
	TYPICAL_WORK_BOUND_WORK_IDS_KEY,
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
