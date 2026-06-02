import type { UiSchema } from "@rjsf/utils";
import {
	V2_ANKETA_MAIN_SECTION_IDS,
	type V2AnketaMainSectionId,
	type V2AnketaWorkflowDto,
} from "@smart-anketa/api-contract";

const MAIN_SECTION_FIELD: Record<V2AnketaMainSectionId, string> = {
	generalInfo: "generalInfo",
	detailInfo: "detailInfo",
	streamDataSources: "streamDataSources",
	streamMlPlatform: "streamMlPlatform",
	streamModelControl: "streamModelControl",
};

function lockUiBranch(node: UiSchema): UiSchema {
	const next: UiSchema = {
		...node,
		"ui:readonly": true,
	};
	for (const [key, child] of Object.entries(next)) {
		if (key.startsWith("ui:") || !child || typeof child !== "object") continue;
		next[key] = lockUiBranch(child as UiSchema);
	}
	return next;
}

/** Блокирует поля завершённых разделов и всей анкеты в «Заполнено». */
export function applySectionLocksToUiSchema(
	uiSchema: UiSchema,
	workflow: V2AnketaWorkflowDto,
): UiSchema {
	const globallyLocked = workflow.globalStatus === "Заполнено";
	let next: UiSchema = { ...uiSchema };

	for (const sectionId of V2_ANKETA_MAIN_SECTION_IDS) {
		const field = MAIN_SECTION_FIELD[sectionId];
		const locked =
			globallyLocked || workflow.sections[sectionId] === "Заполнено";
		if (!locked || !next[field] || typeof next[field] !== "object") continue;
		next = {
			...next,
			[field]: lockUiBranch(next[field] as UiSchema),
		};
	}
	return next;
}
