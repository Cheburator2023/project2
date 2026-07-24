import {
	isAnketaFormPathLocked as isAnketaFormPathLockedShared,
	type V2AnketaWorkflowDto,
} from "@smart-anketa/api-contract";
import { readAnketaFormContext } from "./anketaFormContext";

/** Страница read-only или путь попадает в завершённый раздел workflow. */
export function isAnketaArchPathReadOnly(
	formContext: unknown,
	pathKey: string,
): boolean {
	const ctx = readAnketaFormContext(formContext);
	if (ctx.anketaReadOnly) return true;
	if (!ctx.workflow || !pathKey.trim()) return false;
	return isAnketaFormPathLockedShared(ctx.workflow, pathKey);
}

export function isAnketaFormPathLocked(
	workflow: V2AnketaWorkflowDto,
	pathKey: string,
): boolean {
	return isAnketaFormPathLockedShared(workflow, pathKey);
}
