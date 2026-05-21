import type { UiSchema } from "@rjsf/utils";

/** Секция summary показывается в боковой панели «Итоговая оценка», не в теле формы. */
export function hideSummaryInPreviewUi(uiSchema: UiSchema): UiSchema {
	return {
		...uiSchema,
		summary: {
			...(typeof uiSchema.summary === "object" && uiSchema.summary !== null
				? uiSchema.summary
				: {}),
			"ui:widget": "hidden",
		},
	};
}
