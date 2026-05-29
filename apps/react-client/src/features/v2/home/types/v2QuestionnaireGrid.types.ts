import type {
	V2QuestionnaireDto,
	V2SchemaBindingStatus,
} from "@smart-anketa/api-contract";

export type V2QuestionnaireSeriesRow = {
	rowKind: "series";
	seriesId: string;
	displayLabel: string;
	calcName: string;
	children: V2QuestionnaireVersionRow[];
};

export type V2QuestionnaireVersionRow = V2QuestionnaireDto & {
	rowKind: "version";
	displayLabel: string;
};

export type V2QuestionnaireGridRow =
	| V2QuestionnaireSeriesRow
	| V2QuestionnaireVersionRow;

export type { V2SchemaBindingStatus };
