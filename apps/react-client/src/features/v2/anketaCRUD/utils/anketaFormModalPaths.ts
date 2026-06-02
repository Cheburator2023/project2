export const ANKETA_MODAL_ARRAY_PATHS = [
	"streamDataSources.sourceSystems",
	"streamModelControl.dataObjects.trainingSources",
	"streamModelControl.dataObjects.applicationSources",
	"streamModelControl.models.modelsList",
	"streamModelControl.atypicalTasks",
	"streamMlPlatform.atypicalTasks",
] as const;

export type AnketaModalArrayPath = (typeof ANKETA_MODAL_ARRAY_PATHS)[number];

export type AnketaModalKind = "dataSource" | "modelService" | "nonStandardTask";

export function modalKindForArrayPath(path: string): AnketaModalKind | null {
	switch (path) {
		case "streamDataSources.sourceSystems":
		case "streamModelControl.dataObjects.trainingSources":
		case "streamModelControl.dataObjects.applicationSources":
			return "dataSource";
		case "streamModelControl.models.modelsList":
			return "modelService";
		case "streamModelControl.atypicalTasks":
		case "streamMlPlatform.atypicalTasks":
			return "nonStandardTask";
		default:
			return null;
	}
}

export const ANKETA_MODAL_ARRAY_PATH_SET = new Set<string>(
	ANKETA_MODAL_ARRAY_PATHS,
);
