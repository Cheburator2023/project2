import {
	createDefaultV2AnketaWorkflow,
	normalizeV2AnketaWorkflow,
} from "@smart-anketa/api-contract";

import {
	ANKETA_ARCH_OBJECT_LIST_PATHS,
	writeArchObjectListAtPath,
	readArchObjectListAtPath,
} from "./anketaArchObjectListPaths";

function readRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return { ...(value as Record<string, unknown>) };
}

function normalizeArchObjectLists(
	formData: Record<string, unknown>,
): Record<string, unknown> {
	let next = formData;
	for (const path of ANKETA_ARCH_OBJECT_LIST_PATHS) {
		const parts = path.split(".");
		let current: unknown = next;
		for (const part of parts) {
			if (current == null || typeof current !== "object") {
				current = undefined;
				break;
			}
			current = (current as Record<string, unknown>)[part];
		}
		if (current == null) continue;
		if (Array.isArray(current)) continue;
		if (typeof current !== "object") continue;
		const items = readArchObjectListAtPath(next, path);
		next = writeArchObjectListAtPath(next, path, items);
	}
	return next;
}

/** Переносит legacy-пути formData в актуальную вложенность разделов. */
export function migrateV2AnketaFormData(
	formData: Record<string, unknown>,
): Record<string, unknown> {
	const next = normalizeArchObjectLists({ ...formData });
	const detailInfo = readRecord(next.detailInfo);
	const streamDataSources = readRecord(next.streamDataSources);
	const streamModelControl = readRecord(next.streamModelControl);

	if (detailInfo) {
		if (!streamDataSources.sourceSystems && detailInfo.sourceSystems) {
			streamDataSources.sourceSystems = detailInfo.sourceSystems;
		}
		if (!streamDataSources.sourceTypicalTasks && detailInfo.sourceTypicalTasks) {
			streamDataSources.sourceTypicalTasks = detailInfo.sourceTypicalTasks;
		}
		if (
			!streamDataSources.sourceTypicalTasks &&
			detailInfo.detailTypicalTasks
		) {
			streamDataSources.sourceTypicalTasks = detailInfo.detailTypicalTasks;
		}
	}

	if (next.mlPlatform && !next.streamMlPlatform) {
		next.streamMlPlatform = next.mlPlatform;
		delete next.mlPlatform;
	}

	const smc: Record<string, unknown> = { ...streamModelControl };

	if (detailInfo) {
		if (!smc.dataProcessing && detailInfo.dataProcess) {
			smc.dataProcessing = detailInfo.dataProcess;
		}
		if (!smc.dataObjects && detailInfo.dataMart) {
			smc.dataObjects = detailInfo.dataMart;
		}
		if (!smc.models && detailInfo.model) {
			smc.models = detailInfo.model;
		}
		if (!smc.atypicalTasks && detailInfo.detailAtypicalTasks) {
			smc.atypicalTasks = detailInfo.detailAtypicalTasks;
		}
	}

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

	// Пути detailInfo остаются в formData для UI; копии уходят в stream*-разделы для движка.
	if (detailInfo) {
		next.detailInfo = detailInfo;
	}

	if (Object.keys(streamDataSources).length > 0) {
		next.streamDataSources = streamDataSources;
	}

	next.workflow = normalizeV2AnketaWorkflow(
		next.workflow ?? createDefaultV2AnketaWorkflow(),
	);

	return next;
}
