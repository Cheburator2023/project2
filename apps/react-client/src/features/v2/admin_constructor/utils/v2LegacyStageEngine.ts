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

export const LEGACY_STAGE_ENGINE_TITLE = "Итоги стримов (типовые / нетиповые)";

export const LEGACY_STAGE_ENGINE_DESCRIPTION =
	"После JsonLogic бекенд перезаписывает итоговые поля summary: " +
	"baseScoreStream = сумма типовых работ стримов, " +
	"scoreWithComplexityCoeff = База×Коэффициенты + Нетиповые, " +
	"deviationFromBaseline = (оценка с коэф. / База) × 100%, " +
	"плюс detailedCalculation и platformStreams. " +
	"Не настраивается в конструкторе JsonLogic.";

export function hasLegacyStageRows(
	meta: V2LegacyStageEvaluationDto | null | undefined,
): boolean {
	return Boolean(meta?.applied && (meta.stageRowCount > 0 || meta.platformStreamCount > 0));
}
