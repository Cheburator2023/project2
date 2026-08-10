import {
	isAnketaFormPathLocked as isAnketaFormPathLockedShared,
	isV2AnketaPathEditableForViewer,
	type V2AnketaWorkflowDto,
} from "@smart-anketa/api-contract";
import { readAnketaFormContext } from "./anketaFormContext";

/**
 * Страница read-only, путь в чужом стрим-блоке (§2) или в завершённом разделе workflow.
 * Закрывает арх-панели и таблицы, где кнопки добавления/удаления не читают `ui:readonly`.
 */
export function isAnketaArchPathReadOnly(
	formContext: unknown,
	pathKey: string,
): boolean {
	const ctx = readAnketaFormContext(formContext);
	if (ctx.anketaReadOnly) return true;
	if (
		ctx.viewerAccess?.applyAccessRules &&
		ctx.previewUiSchema &&
		!isV2AnketaPathEditableForViewer(
			ctx.viewerAccess,
			ctx.previewUiSchema,
			pathKey,
			{ applyAccessRules: true },
		)
	) {
		return true;
	}
	if (!ctx.workflow || !pathKey.trim()) return false;
	return isAnketaFormPathLockedShared(ctx.workflow, pathKey);
}

export function isAnketaFormPathLocked(
	workflow: V2AnketaWorkflowDto,
	pathKey: string,
): boolean {
	return isAnketaFormPathLockedShared(workflow, pathKey);
}
