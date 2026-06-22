import {
	defaultWorkFormula,
	defaultWorkRounding,
	type PatchV2TypicalWorkRequestDto,
	type V2TypicalWorkListItemDto,
} from "@smart-anketa/api-contract";
import { pickDbStreamForLogicStream } from "./typicalWorksAreas";

export function buildAssignWorkPatch(
	streamExecutor: string,
	baseNormValue = 1,
): PatchV2TypicalWorkRequestDto {
	const today = new Date().toISOString().slice(0, 10);
	return {
		streamExecutor,
		norms: [{ normValue: baseNormValue, validFrom: today, validTo: null }],
		rules: [],
		laborCoefficients: [],
		formula: defaultWorkFormula(),
		rounding: defaultWorkRounding(),
	};
}

export function inferBaseNormValue(work: V2TypicalWorkListItemDto): number {
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
	work: V2TypicalWorkListItemDto,
	scopeStreams: string[],
	logicStream?: string,
): string[] {
	if (logicStream) {
		const dbStream = pickDbStreamForLogicStream(logicStream, work.streams);
		return work.streams.includes(dbStream) ? [] : [dbStream];
	}
	return scopeStreams.filter((stream) => !work.streams.includes(stream));
}
