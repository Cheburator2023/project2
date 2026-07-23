import type { UiSchema } from "@rjsf/utils";
import {
	isAnketaGloballyLocked,
	V2_ANKETA_MAIN_SECTION_IDS,
	type V2AnketaMainSectionId,
	type V2AnketaWorkflowDto,
} from "@smart-anketa/api-contract";

const MAIN_SECTION_FIELD: Record<V2AnketaMainSectionId, string> = {
	generalInfo: "generalInfo",
	detailInfo: "detailInfo",
	streamDataSources: "streamDataSources",
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

function lockUiSchemaAtPath(uiSchema: UiSchema, path: string): UiSchema {
	const parts = path.split(".").filter(Boolean);
	if (parts.length === 0) return uiSchema;

	const next: UiSchema = { ...uiSchema };
	let current: UiSchema = next;

	for (let i = 0; i < parts.length - 1; i++) {
		const key = parts[i];
		const child =
			current[key] && typeof current[key] === "object"
				? ({ ...(current[key] as UiSchema) } as UiSchema)
				: {};
		current[key] = child;
		current = child;
	}

	const lastKey = parts[parts.length - 1];
	const leaf =
		current[lastKey] && typeof current[lastKey] === "object"
			? ({ ...(current[lastKey] as UiSchema) } as UiSchema)
			: {};
	current[lastKey] = lockUiBranch(leaf);
	return next;
}

/** Блокирует поля завершённых разделов и всей анкеты в «Заполнено» / «Утверждена». */
export function applySectionLocksToUiSchema(
	uiSchema: UiSchema,
	workflow: V2AnketaWorkflowDto,
): UiSchema {
	const globallyLocked = isAnketaGloballyLocked(workflow);
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

	if (workflow.panelSections) {
		for (const [pathKey, status] of Object.entries(workflow.panelSections)) {
			if (status !== "Заполнено" && !globallyLocked) continue;
			next = lockUiSchemaAtPath(next, pathKey);
		}
	}

	return next;
}
