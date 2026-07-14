import type { RJSFSchema } from "@rjsf/utils";
import type { V2ExecutorStreamLabel } from "@smart-anketa/api-contract";

export function makeStreamBlockJsonSchema(
	streamExecutor: V2ExecutorStreamLabel,
): RJSFSchema {
	return {
		type: "object",
		title: streamExecutor,
		properties: {},
	};
}

export function makeStreamBlockUiOptions(streamExecutor: V2ExecutorStreamLabel) {
	return {
		streamBlock: true,
		streamExecutor,
		sectionRole: "main" as const,
		defaultExpanded: true,
	};
}
