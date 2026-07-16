import type { RJSFSchema } from "@rjsf/utils";
import {
	resolveImplementationStreamLabel,
	type V2ImplementationStreamCode,
} from "@smart-anketa/api-contract";

export function makeStreamBlockJsonSchema(
	streamExecutor: V2ImplementationStreamCode,
): RJSFSchema {
	return {
		type: "object",
		title: resolveImplementationStreamLabel(streamExecutor),
		properties: {},
	};
}

export function makeStreamBlockUiOptions(streamExecutor: V2ImplementationStreamCode) {
	return {
		streamBlock: true,
		streamExecutor,
		sectionRole: "main" as const,
		defaultExpanded: true,
	};
}
