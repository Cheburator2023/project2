/**
 * Поля `summary`, которые POST /calculate перезаписывает после JsonLogic
 * (`v2-legacy-stage-evaluation.ts`).
 *
 * `baseScoreStream` = сумма нормативов типовых работ (без коэффициентов),
 * `scoreWithComplexityCoeff` = типовые с коэфф. + нетиповые,
 * `deviationFromBaseline` = (scoreWithComplexityCoeff / База) × 100%.
 * `detailedCalculation` / `platformStreams` — детализация.
 *
 * Не настраиваются в конструкторе JsonLogic.
 */
export const V2_LEGACY_STAGE_SUMMARY_FIELD_KEYS = [
	"baseScoreStream",
	"scoreWithComplexityCoeff",
	"deviationFromBaseline",
	"detailedCalculation",
	"platformStreams",
] as const;

export type V2LegacyStageSummaryFieldKey =
	(typeof V2_LEGACY_STAGE_SUMMARY_FIELD_KEYS)[number];

export const V2_LEGACY_STAGE_SUMMARY_POINTERS = [
	"/summary/baseScoreStream",
	"/summary/scoreWithComplexityCoeff",
	"/summary/deviationFromBaseline",
	"/summary/detailedCalculation",
	"/summary/platformStreams",
] as const;

/** Метаданные применения движка этапов v1 на /calculate. */
export type V2LegacyStageEvaluationDto = {
	applied: boolean;
	source: "v1_stages";
	overwrittenPaths: string[];
	stageRowCount: number;
	platformStreamCount: number;
};
