export const ANKETA_MODAL_ARRAY_PATHS = [
	"detailInfo.sourceSystems",
	"detailInfo.model.modelsList",
	"streamDataSources.sourceSystems",
	"streamModelControl.dataObjects.trainingSources",
	"streamModelControl.dataObjects.applicationSources",
	"streamModelControl.models.modelsList",
	"streamModelControl.atypicalTasks",
	"streamMlPlatform.atypicalTasks",
] as const;

export type AnketaModalArrayPath = (typeof ANKETA_MODAL_ARRAY_PATHS)[number];

/** Объектные арх. блоки: поля скрыты в теле, редактирование через модалку. */
export const ANKETA_MODAL_OBJECT_PATHS = [
	"generalInfo.modelService",
	"detailInfo.dataProcess",
	"detailInfo.dataMart",
] as const;

export type AnketaModalObjectPath = (typeof ANKETA_MODAL_OBJECT_PATHS)[number];

/** В `detailInfo.model` скаляры в модалке, `modelsList` — таблица массива. */
export const ANKETA_MODEL_WRAPPER_PATH = "detailInfo.model";

export const ANKETA_MODEL_WRAPPER_HIDDEN_CHILDREN = [
	"workType",
	"modelsCount",
	"algorithmType",
	"algorithmCoeff",
	"autoML",
	"specialist",
	"cascadeEnsemble",
] as const;

export type AnketaModalKind =
	| "dataSource"
	| "modelService"
	| "modelServiceBlock"
	| "nonStandardTask"
	| "rjsfObject";

export function modalKindForArrayPath(path: string): AnketaModalKind | null {
	switch (path) {
		case "detailInfo.sourceSystems":
		case "streamDataSources.sourceSystems":
		case "streamModelControl.dataObjects.trainingSources":
		case "streamModelControl.dataObjects.applicationSources":
			return "dataSource";
		case "detailInfo.model.modelsList":
		case "streamModelControl.models.modelsList":
			return "modelService";
		case "streamModelControl.atypicalTasks":
		case "streamMlPlatform.atypicalTasks":
			return "nonStandardTask";
		default:
			return null;
	}
}

export function modalKindForObjectPath(path: string): AnketaModalKind | null {
	switch (path) {
		case "generalInfo.modelService":
			return "modelServiceBlock";
		case "detailInfo.dataProcess":
		case "detailInfo.dataMart":
			return "rjsfObject";
		default:
			return null;
	}
}

export function modalKindForPath(path: string): AnketaModalKind | null {
	return modalKindForArrayPath(path) ?? modalKindForObjectPath(path);
}

export const ANKETA_MODAL_ARRAY_PATH_SET = new Set<string>(
	ANKETA_MODAL_ARRAY_PATHS,
);

export const ANKETA_MODAL_OBJECT_PATH_SET = new Set<string>(
	ANKETA_MODAL_OBJECT_PATHS,
);
