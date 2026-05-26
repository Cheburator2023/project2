import type { UiSchema } from "@rjsf/utils";

/** Системные секции показываются вне тела RJSF-формы. */
export function hideSummaryInPreviewUi(uiSchema: UiSchema): UiSchema {
	return {
		...uiSchema,
		meta: {
			...(typeof uiSchema.meta === "object" && uiSchema.meta !== null
				? uiSchema.meta
				: {}),
			"ui:options": {
				...(typeof uiSchema.meta === "object" &&
				uiSchema.meta !== null &&
				typeof uiSchema.meta["ui:options"] === "object" &&
				uiSchema.meta["ui:options"] !== null
					? uiSchema.meta["ui:options"]
					: {}),
				hidden: true,
			},
		},
		summary: {
			...(typeof uiSchema.summary === "object" && uiSchema.summary !== null
				? uiSchema.summary
				: {}),
			"ui:widget": "hidden",
		},
	};
}
