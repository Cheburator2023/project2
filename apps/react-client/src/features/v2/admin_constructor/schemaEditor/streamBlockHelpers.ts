import type { RJSFSchema } from "@rjsf/utils";
import {
	resolveImplementationStreamLabel,
	serializeStreamBlockExecutors,
	V2_MODEL_STREAM_EXECUTOR,
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

/** Корневой umbrella-блок «Модельный стрим» (ключ detailInfo в заводской схеме). */
export function makeModelStreamUmbrellaBlockJsonSchema(): RJSFSchema {
	return {
		type: "object",
		title: "Детальная информация",
		properties: {},
	};
}

export function makeModelStreamUmbrellaBlockUiOptions() {
	return {
		streamBlock: true,
		streamExecutor: V2_MODEL_STREAM_EXECUTOR,
		sectionRole: "main" as const,
		defaultExpanded: true,
		workflowSectionId: "detailInfo",
	};
}
