import {
	V2_LEGACY_STAGE_SUMMARY_POINTERS,
	type V2LegacyStageEvaluationDto,
} from "@smart-anketa/api-contract";
import { normalizeJsonPointer } from "./schemaPaths";

const LEGACY_POINTER_SET = new Set(
	V2_LEGACY_STAGE_SUMMARY_POINTERS.map((p) => normalizeJsonPointer(p)),
);

/** Целевое поле computed перезаписывается движком этапов v1 на /calculate. */
export function isOverwrittenByLegacyStageEngine(targetPath: string): boolean {
	const pointer = normalizeJsonPointer(targetPath);
	return LEGACY_POINTER_SET.has(pointer);
}

export const LEGACY_STAGE_ENGINE_TITLE = "Этапы E2E (движок v1)";

export const LEGACY_STAGE_ENGINE_DESCRIPTION =
	"Порт расчёта v1 (stages.ts, coefficients): 11 этапов, платформенные стримы, " +
	"итоговые поля summary. Выполняется на бекенде после JsonLogic и перезаписывает " +
	"baseScoreStream, scoreWithComplexityCoeff, deviationFromBaseline, detailedCalculation, platformStreams. " +
	"Не настраивается в конструкторе JsonLogic.";

export function hasLegacyStageRows(
	meta: V2LegacyStageEvaluationDto | null | undefined,
): boolean {
	return Boolean(meta?.applied && (meta.stageRowCount > 0 || meta.platformStreamCount > 0));
}
