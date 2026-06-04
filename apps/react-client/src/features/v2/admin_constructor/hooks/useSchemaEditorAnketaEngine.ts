import { readSummaryFromFormData } from "@react-client/features/v2/admin_constructor/utils/readSummaryFromFormData";
import type { V2AnketaSchemaEngine } from "@react-client/features/v2/anketaCRUD/hooks/useV2AnketaSchemaEngine";
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

	const displayFormData = useMemo(
		() => mergeAnketaDisplayFormData(formData, liveFormData),
		[formData, liveFormData],
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
			formData,
			setFormData,
			summary: readSummaryFromFormData(displayFormData),
			readOnly: false,
		}),
		[
			previewSchema,
			previewUiSchema,
			displayFormData,
			formData,
			setFormData,
			dictionaryEnumsLoading,
			calculationLoading,
			calculationError,
			logicExtraErrors,
			logicValidationIssueCount,
		],
	);
}
