import { get, set, del } from "idb-keyval";
import type { PatchV2TypicalWorkRequestDto } from "@smart-anketa/api-contract";

const bufferKey = (workId: string) => `v2-work-patch:${workId}`;

export type BufferedTypicalWorkPatch = {
	workId: string;
	dto: PatchV2TypicalWorkRequestDto;
	savedAt: string;
	errorMessage: string | null;
};

export async function saveBufferedTypicalWorkPatch(
	entry: BufferedTypicalWorkPatch,
): Promise<void> {
	await set(bufferKey(entry.workId), entry);
}

export async function readBufferedTypicalWorkPatch(
	workId: string,
): Promise<BufferedTypicalWorkPatch | undefined> {
	return get<BufferedTypicalWorkPatch>(bufferKey(workId));
}

export async function clearBufferedTypicalWorkPatch(workId: string): Promise<void> {
	await del(bufferKey(workId));
}
