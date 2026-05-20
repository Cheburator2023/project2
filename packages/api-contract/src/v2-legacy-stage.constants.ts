/**
 * Поля `summary`, которые POST /calculate перезаписывает движком этапов v1
 * (`v2-legacy-stage-evaluation.ts`), после правил JsonLogic.
 *
 * Не переносятся в конструктор JsonLogic — правятся в TypeScript на бекенде.
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
