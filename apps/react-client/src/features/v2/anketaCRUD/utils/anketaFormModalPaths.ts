export const ANKETA_MODAL_ARRAY_PATHS = [
	"detailInfo.sourceSystems",
	"dataObjects.trainingSources",
	"dataObjects.applicationSources",
	"models.modelsList",
	"atypicalTasks",
	"mlPlatform.atypicalTasks",
] as const;

export type AnketaModalArrayPath = (typeof ANKETA_MODAL_ARRAY_PATHS)[number];

export type AnketaModalKind = "dataSource" | "modelService" | "nonStandardTask";

export function modalKindForArrayPath(path: string): AnketaModalKind | null {
	switch (path) {
		case "detailInfo.sourceSystems":
		case "dataObjects.trainingSources":
		case "dataObjects.applicationSources":
			return "dataSource";
		case "models.modelsList":
			return "modelService";
		case "atypicalTasks":
		case "mlPlatform.atypicalTasks":
			return "nonStandardTask";
		default:
			return null;
	}
}

export const ANKETA_MODAL_ARRAY_PATH_SET = new Set<string>(
	ANKETA_MODAL_ARRAY_PATHS,
);
