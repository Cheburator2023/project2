import {
	mainSectionIdForFormPath,
	type V2AnketaWorkflowDto,
} from "@smart-anketa/api-contract";
import { readAnketaFormContext } from "./anketaFormContext";

function isAnketaFormPathLocked(
	workflow: V2AnketaWorkflowDto,
	pathKey: string,
): boolean {
	if (workflow.globalStatus === "Заполнено") return true;

	const trimmed = pathKey.trim();
	if (!trimmed) return false;

	const mainSectionId = mainSectionIdForFormPath(trimmed);
	if (mainSectionId && workflow.sections[mainSectionId] === "Заполнено") {
		return true;
	}

	const panelSections = workflow.panelSections;
	if (!panelSections) return false;

	for (const [panelPath, status] of Object.entries(panelSections)) {
		if (status !== "Заполнено") continue;
		if (trimmed === panelPath || trimmed.startsWith(`${panelPath}.`)) {
			return true;
		}
	}

	return false;
}

/** Страница read-only или путь попадает в завершённый раздел workflow. */
export function isAnketaArchPathReadOnly(
	formContext: unknown,
	pathKey: string,
): boolean {
	const ctx = readAnketaFormContext(formContext);
	if (ctx.anketaReadOnly) return true;
	if (!ctx.workflow || !pathKey.trim()) return false;
	return isAnketaFormPathLocked(ctx.workflow, pathKey);
}
