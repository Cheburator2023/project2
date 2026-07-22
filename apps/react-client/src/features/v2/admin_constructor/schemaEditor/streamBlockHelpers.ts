import type { RJSFSchema } from "@rjsf/utils";
import {
	resolveImplementationStreamLabel,
	serializeStreamBlockExecutors,
	type V2ImplementationStreamCode,
} from "@smart-anketa/api-contract";

export function makeStreamBlockJsonSchema(
	streamExecutor: V2ImplementationStreamCode | V2ImplementationStreamCode[],
): RJSFSchema {
	const executors = Array.isArray(streamExecutor)
		? streamExecutor
		: [streamExecutor];
	const title =
		executors.length === 1
			? resolveImplementationStreamLabel(executors[0])
			: executors.map(resolveImplementationStreamLabel).join(", ");
	return {
		type: "object",
		title,
		properties: {},
	};
}

export function makeStreamBlockUiOptions(
	streamExecutor: V2ImplementationStreamCode | V2ImplementationStreamCode[],
) {
	const executors = Array.isArray(streamExecutor)
		? streamExecutor
		: [streamExecutor];
	return {
		streamBlock: true,
		streamExecutor: serializeStreamBlockExecutors(executors),
		sectionRole: "main" as const,
		defaultExpanded: true,
	};
}
