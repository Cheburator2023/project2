export {
	allRequiredSectionsCompleted,
	completeGlobalQuestionnaire,
	completeSection,
	createDefaultV2AnketaWorkflow,
	holdQuestionnaire,
	isAnketaGloballyLocked,
	mainSectionIdForFormPath,
	markSectionInProgress,
	normalizeV2AnketaWorkflow,
	V2_ANKETA_GLOBAL_COMPLETE_LABEL,
	V2_ANKETA_HOLD_LABEL,
	V2_ANKETA_MAIN_SECTION_TITLES,
	V2_ANKETA_SECTION_COMPLETE_LABELS,
} from "@smart-anketa/api-contract";

import {
	isAnketaGloballyLocked,
	type V2AnketaWorkflowDto,
} from "@smart-anketa/api-contract";

export function isV2AnketaGloballyCompleted(
	workflow: V2AnketaWorkflowDto,
): boolean {
	return isAnketaGloballyLocked(workflow);
}
