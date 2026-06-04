/** Массивы с компактной таблицей + модалкой (добавить / редактировать / удалить). */
export const ANKETA_MODAL_ARRAY_PATHS = [
	"detailInfo.sourceSystems",
	"detailInfo.model.modelsList",
	"detailInfo.detailAtypicalTasks",
	"streamDataSources.sourceSystems",
	"streamModelControl.dataObjects.trainingSources",
	"streamModelControl.dataObjects.applicationSources",
	"streamModelControl.models.modelsList",
	"streamModelControl.atypicalTasks",
	"streamMlPlatform.atypicalTasks",
] as const;

export type AnketaModalArrayPath = (typeof ANKETA_MODAL_ARRAY_PATHS)[number];

/** Типовые работы: только таблица (генерируются движком, без модалки). */
export const ANKETA_READONLY_ARRAY_TABLE_PATHS = [
	"detailInfo.detailTypicalTasks",
	"streamDataSources.sourceTypicalTasks",
	"streamModelControl.control.controlTypicalTasks",
	"streamMlPlatform.typicalTasks",
] as const;

export type AnketaReadonlyArrayTablePath =
	(typeof ANKETA_READONLY_ARRAY_TABLE_PATHS)[number];

/** Все массивы с компактной таблицей (арх. + типовые + нетиповые). */
export const ANKETA_COMPACT_ARRAY_TABLE_PATHS = [
	...ANKETA_MODAL_ARRAY_PATHS,
	...ANKETA_READONLY_ARRAY_TABLE_PATHS,
] as const;

export type AnketaCompactArrayTablePath =
	(typeof ANKETA_COMPACT_ARRAY_TABLE_PATHS)[number];

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

export function isReadonlyArrayTablePath(path: string): boolean {
	return (ANKETA_READONLY_ARRAY_TABLE_PATH_SET as Set<string>).has(path);
}

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
		case "detailInfo.detailAtypicalTasks":
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

export const ANKETA_READONLY_ARRAY_TABLE_PATH_SET = new Set<string>(
	ANKETA_READONLY_ARRAY_TABLE_PATHS,
);

export const ANKETA_COMPACT_ARRAY_TABLE_PATH_SET = new Set<string>(
	ANKETA_COMPACT_ARRAY_TABLE_PATHS,
);

export const ANKETA_MODAL_OBJECT_PATH_SET = new Set<string>(
	ANKETA_MODAL_OBJECT_PATHS,
);
