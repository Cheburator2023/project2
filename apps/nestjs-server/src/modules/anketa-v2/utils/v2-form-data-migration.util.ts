import {
	createDefaultV2AnketaWorkflow,
	normalizeV2AnketaWorkflow,
} from "@smart-anketa/api-contract";

export function resetWorkflowForCopy(
	formData: Record<string, unknown>,
): Record<string, unknown> {
	return {
		...formData,
		workflow: createDefaultV2AnketaWorkflow(),
	};
}

/** Переносит legacy-пути formData в актуальную вложенность разделов. */
export function migrateV2AnketaFormData(
	formData: Record<string, unknown>,
): Record<string, unknown> {
	const next = { ...formData };
	const detailInfo = readRecord(next.detailInfo);
	const streamDataSources = readRecord(next.streamDataSources);
	const streamMlPlatform = readRecord(next.streamMlPlatform);
	const streamModelControl = readRecord(next.streamModelControl);

	if (detailInfo) {
		if (!streamDataSources.sourceSystems && detailInfo.sourceSystems) {
			streamDataSources.sourceSystems = detailInfo.sourceSystems;
		}
		if (!streamDataSources.sourceTypicalTasks && detailInfo.sourceTypicalTasks) {
			streamDataSources.sourceTypicalTasks = detailInfo.sourceTypicalTasks;
		}
		const { sourceSystems: _s, sourceTypicalTasks: _t, ...detailRest } =
			detailInfo;
		next.detailInfo = detailRest;
	}

	if (next.mlPlatform && !next.streamMlPlatform) {
		next.streamMlPlatform = next.mlPlatform;
		delete next.mlPlatform;
	}

	const smc: Record<string, unknown> = { ...streamModelControl };
	if (next.dataObjects && !smc.dataObjects) smc.dataObjects = next.dataObjects;
	if (next.dataProcessing && !smc.dataProcessing)
		smc.dataProcessing = next.dataProcessing;
	if (next.models && !smc.models) smc.models = next.models;
	if (next.atypicalTasks && !smc.atypicalTasks)
		smc.atypicalTasks = next.atypicalTasks;
	if (next.modelControl && !smc.control) smc.control = next.modelControl;

	if (Object.keys(smc).length > 0) {
		next.streamModelControl = smc;
	}
	delete next.dataObjects;
	delete next.dataProcessing;
	delete next.models;
	delete next.atypicalTasks;
	delete next.modelControl;
	delete next.dataStorageAndProcessing;

	if (Object.keys(streamDataSources).length > 0) {
		next.streamDataSources = streamDataSources;
	}

	next.workflow = normalizeV2AnketaWorkflow(
		next.workflow ?? createDefaultV2AnketaWorkflow(),
	);

	return next;
}

function readRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return { ...(value as Record<string, unknown>) };
}
