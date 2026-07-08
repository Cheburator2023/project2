import { readSummaryFromFormData } from "@react-client/features/v2/admin_constructor/utils/readSummaryFromFormData";
import type { V2AnketaSchemaEngine } from "@react-client/features/v2/anketaCRUD/hooks/useV2AnketaSchemaEngine";
import { ensureAnketaFormDataWithWorkflow } from "@react-client/features/v2/anketaCRUD/hooks/useAnketaWorkflow";
import { mergeAnketaDisplayFormData } from "@react-client/features/v2/anketaCRUD/utils/mergeAnketaDisplayFormData";
import { useMemo } from "react";
import { useSchemaEditor } from "../schemaEditor/SchemaEditorContext";

/** Движок превью из черновика редактора — тот же контракт, что у `useV2AnketaSchemaEngine`. */
export function useSchemaEditorAnketaEngine(): V2AnketaSchemaEngine {
	const {
		previewSchema,
		previewUiSchema,
		formData,
		liveFormData,
		setFormData,
		dictionaryEnumsLoading,
		calculationLoading,
		calculationError,
		logicExtraErrors,
		logicValidationIssueCount,
	} = useSchemaEditor();

	const previewFormData = useMemo(
		() => ensureAnketaFormDataWithWorkflow(formData),
		[formData],
	);

	const displayFormData = useMemo(
		() =>
			mergeAnketaDisplayFormData(
				previewFormData,
				liveFormData,
				previewUiSchema as Record<string, unknown> | undefined,
			),
		[previewFormData, liveFormData, previewUiSchema],
	);

	return useMemo(
		(): V2AnketaSchemaEngine => ({
			template: undefined,
			version: { id: "editor-draft" } as V2AnketaSchemaEngine["version"],
			versionLoading: false,
			dictionaryEnumsLoading,
			calculationLoading,
			calculationError,
			logicValidationIssueCount,
			logicExtraErrors,
			previewSchema,
			previewUiSchema,
			displayFormData,
			formData: previewFormData,
			setFormData,
			summary: readSummaryFromFormData(displayFormData),
			readOnly: false,
		}),
		[
			previewSchema,
			previewUiSchema,
			displayFormData,
			previewFormData,
			setFormData,
			dictionaryEnumsLoading,
			calculationLoading,
			calculationError,
			logicExtraErrors,
			logicValidationIssueCount,
		],
	);
}
