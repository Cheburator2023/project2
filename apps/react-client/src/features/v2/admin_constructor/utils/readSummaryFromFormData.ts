import type { V2SummaryFormSlice } from "../organisms/V2FinalEvaluationPanel";

export function readSummaryFromFormData(
	formData: Record<string, unknown> | undefined | null,
): V2SummaryFormSlice | null {
	const summary = formData?.summary;
	if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
		return null;
	}
	return summary as V2SummaryFormSlice;
}
