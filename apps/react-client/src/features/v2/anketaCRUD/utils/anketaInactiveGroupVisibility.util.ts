import {
	readV2AnketaSectionUiOptions,
	resolveGroupIsActive,
} from "@smart-anketa/api-contract";
import { readAnketaFormContext } from "./anketaFormContext";

/** В финально заполненной анкете не показываем выключенные активируемые группы/стримы. */
export function shouldHideInactiveActivatableGroupInCompletedAnketa(
	formContext: unknown,
	pathKey: string,
	sectionUiSchema: unknown,
): boolean {
	const ctx = readAnketaFormContext(formContext);
	if (ctx.schemaEditorPreview) return false;
	if (ctx.workflow?.globalStatus !== "Заполнено") return false;

	const opts = readV2AnketaSectionUiOptions(sectionUiSchema);
	if (opts.groupActivatable !== true) return false;

	return !resolveGroupIsActive(
		pathKey,
		ctx.previewUiSchema,
		ctx.formData,
	);
}
