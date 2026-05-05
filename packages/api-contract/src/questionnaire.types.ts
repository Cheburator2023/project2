export type QuestionnaireResponseDtoDictionaries = Record<string, unknown[]>;

/** Stream averages keyed by stage label (aligned with questionnaire service). */
export type StreamAverageDto = Record<string, number>;

export interface ReferenceDataDto {
	streamExecutor: string[];
	department: string[];
}

export interface QuestionnaireResponseDto {
	version: string;
	lastUpdated: string;
	author?: string;
	dictionaries: QuestionnaireResponseDtoDictionaries;
	streamAverages: StreamAverageDto;
	referenceData: ReferenceDataDto;
}

export interface CoefficientControllerGetValueParams {
	value: string;
}
