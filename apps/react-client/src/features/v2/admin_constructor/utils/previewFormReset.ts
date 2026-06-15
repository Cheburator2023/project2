import {
	createDefaultV2AnketaWorkflow,
	ensureGroupActivationDefaults,
} from "@smart-anketa/api-contract";

/** Пустые тестовые данные превью: workflow, groupActivation и без значений полей. */
export function createResetSchemaEditorPreviewFormData(
	uiSchema: unknown,
): Record<string, unknown> {
	const base: Record<string, unknown> = {
		workflow: createDefaultV2AnketaWorkflow(),
	};
	return ensureGroupActivationDefaults(base, uiSchema);
}
