import {
	defaultWorkFormula,
	defaultWorkRounding,
	type PatchV2TypicalWorkRequestDto,
} from "@smart-anketa/api-contract";

/** Минимальные поля работы для назначения на стрим (список или каталог). */
export type WorkStreamsRef = {
	id: string;
	streams: string[];
	normsByStream?: Record<string, number | null>;
	currentNorm?: number | null;
};
import { pickDbStreamForLogicStream } from "./typicalWorksAreas";

export function buildAssignWorkPatch(
	streamExecutor: string,
	baseNormValue = 1,
): PatchV2TypicalWorkRequestDto {
	const today = new Date().toISOString().slice(0, 10);
	return {
		streamExecutor,
		norms: [{ normValue: baseNormValue, validFrom: today, validTo: null }],
		formula: defaultWorkFormula(),
		rounding: defaultWorkRounding(),
	};
}

export function inferBaseNormValue(work: WorkStreamsRef): number {
	for (const stream of work.streams) {
		const norm = work.normsByStream?.[stream];
		if (typeof norm === "number" && norm > 0) return norm;
	}
	if (typeof work.currentNorm === "number" && work.currentNorm > 0) {
		return work.currentNorm;
	}
	return 1;
}

export function targetStreamsForAssign(
	work: WorkStreamsRef,
	scopeStreams: string[],
	logicStream?: string,
): string[] {
	if (logicStream) {
		const dbStream = pickDbStreamForLogicStream(logicStream, work.streams);
		return work.streams.includes(dbStream) ? [] : [dbStream];
	}
	return scopeStreams.filter((stream) => !work.streams.includes(stream));
}
