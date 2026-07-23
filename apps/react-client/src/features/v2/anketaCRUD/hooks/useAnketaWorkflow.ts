import {
	allRequiredSectionsCompleted,
	collectRequiredWorkflowTargetsForViewer,
	completeGlobalQuestionnaire,
	completePanelSection,
	completeSection,
	createDefaultV2AnketaWorkflow,
	isAnketaGloballyLocked,
	mainSectionIdForFormPath,
	markSectionInProgress,
	normalizeV2AnketaWorkflow,
	type V2AnketaMainSectionId,
	type V2AnketaViewerAccessContext,
	type V2AnketaWorkflowDto,
} from "@smart-anketa/api-contract";
import { useCallback, useMemo } from "react";
import { migrateV2AnketaFormData } from "../utils/v2FormDataMigration";

export function readWorkflowFromFormData(
	formData: Record<string, unknown>,
): V2AnketaWorkflowDto {
	return normalizeV2AnketaWorkflow(formData.workflow);
}

export function withWorkflow(
	formData: Record<string, unknown>,
	workflow: V2AnketaWorkflowDto,
): Record<string, unknown> {
	return { ...formData, workflow };
}

export function touchSectionInFormData(
	formData: Record<string, unknown>,
	sectionId: V2AnketaMainSectionId,
): Record<string, unknown> {
	const workflow = readWorkflowFromFormData(formData);
	const next = markSectionInProgress(workflow, sectionId);
	if (next === workflow) return formData;
	return withWorkflow(formData, next);
}

export function touchSectionForPathInFormData(
	formData: Record<string, unknown>,
	path: string,
): Record<string, unknown> {
	const sectionId = mainSectionIdForFormPath(path);
	if (!sectionId) return formData;
	return touchSectionInFormData(formData, sectionId);
}

export function useAnketaWorkflow(
	formData: Record<string, unknown>,
	setFormData: (next: Record<string, unknown>) => void,
	uiSchema?: unknown,
	viewerAccess?: V2AnketaViewerAccessContext & {
		applyAccessRules?: boolean;
	},
) {
	const workflow = useMemo(() => readWorkflowFromFormData(formData), [formData]);
	const globallyLocked = isAnketaGloballyLocked(workflow);
	const requiredTargets = useMemo(() => {
		if (!uiSchema) return undefined;
		return collectRequiredWorkflowTargetsForViewer(
			uiSchema,
			formData,
			viewerAccess,
			{ applyAccessRules: viewerAccess?.applyAccessRules !== false },
		);
	}, [uiSchema, formData, viewerAccess]);
	const allSectionsCompleted = useMemo(
		() => allRequiredSectionsCompleted(workflow, requiredTargets),
		[workflow, requiredTargets],
	);

	const setWorkflow = useCallback(
		(next: V2AnketaWorkflowDto, baseFormData?: Record<string, unknown>) => {
			setFormData(withWorkflow(baseFormData ?? formData, next));
		},
		[formData, setFormData],
	);

	const completeMainSection = useCallback(
		(sectionId: V2AnketaMainSectionId) => {
			const current = readWorkflowFromFormData(formData);
			setWorkflow(completeSection(current, sectionId));
		},
		[formData, setWorkflow],
	);

	const completePanelSectionByPath = useCallback(
		(pathKey: string) => {
			const current = readWorkflowFromFormData(formData);
			setWorkflow(completePanelSection(current, pathKey));
		},
		[formData, setWorkflow],
	);

	const touchMainSection = useCallback(
		(sectionId: V2AnketaMainSectionId, baseFormData?: Record<string, unknown>) => {
			const base = baseFormData ?? formData;
			const current = readWorkflowFromFormData(base);
			const next = markSectionInProgress(current, sectionId);
			if (next === current) return;
			setFormData(withWorkflow(base, next));
		},
		[formData, setFormData],
	);

	const completeGlobalFill = useCallback(() => {
		const current = readWorkflowFromFormData(formData);
		const next = completeGlobalQuestionnaire(current, requiredTargets);
		if (next === current) return;
		setFormData(withWorkflow(formData, next));
	}, [formData, requiredTargets, setFormData]);

	const isSectionLocked = useCallback(
		(sectionId: V2AnketaMainSectionId) =>
			globallyLocked || workflow.sections[sectionId] === "Заполнено",
		[globallyLocked, workflow.sections],
	);

	return {
		workflow,
		globallyLocked,
		allSectionsCompleted,
		completeMainSection,
		completePanelSectionByPath,
		touchMainSection,
		completeGlobalFill,
		isSectionLocked,
	};
}

export function ensureAnketaFormDataWithWorkflow(
	formData: Record<string, unknown>,
): Record<string, unknown> {
	const migrated = migrateV2AnketaFormData(formData);
	if (!migrated.workflow) {
		return withWorkflow(migrated, createDefaultV2AnketaWorkflow());
	}
	return migrated;
}
