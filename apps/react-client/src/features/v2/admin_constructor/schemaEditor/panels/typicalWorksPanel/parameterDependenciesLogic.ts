import type {
	V2ParamDependencyGraph,
	V2ParamFieldBinding,
	V2TypicalWorkParameterDto,
} from "@smart-anketa/api-contract";
import { stripParamNameSourceKeys } from "@smart-anketa/api-contract";
import type { FieldPathHint } from "../../types";
import type { ParameterDependencyDraft } from "./parameterDependenciesStorage";
import { resolveSchemaParamForTriggerRule } from "./schemaWorkParameters";

function normalizeBindingLabel(value: string): string {
	return stripParamNameSourceKeys(value).trim().toLowerCase();
}

function appendPointer(
	map: Map<string, string[]>,
	key: string,
	pointer: string,
): void {
	const list = map.get(key) ?? [];
	if (!list.includes(pointer)) list.push(pointer);
	map.set(key, list);
}

function resolveBindingPointers(
	param: V2TypicalWorkParameterDto,
	pointersByTitle: Map<string, string[]>,
	pointersByNormTitle: Map<string, string[]>,
	pointersByKey: Map<string, string[]>,
	schemaParams?: V2TypicalWorkParameterDto[],
): string[] {
	const pointers = new Set<string>();

	for (const pointer of pointersByTitle.get(param.name.trim()) ?? []) {
		pointers.add(pointer);
	}

	const normName = normalizeBindingLabel(param.name);
	for (const pointer of pointersByNormTitle.get(normName) ?? []) {
		pointers.add(pointer);
	}

	for (const pointer of pointersByKey.get(param.code) ?? []) {
		pointers.add(pointer);
	}

	if (param.sourceKeys?.length) {
		for (const key of param.sourceKeys) {
			for (const pointer of pointersByKey.get(key) ?? []) {
				pointers.add(pointer);
			}
		}
	}

	if (schemaParams?.length) {
		const schemaMatch = resolveSchemaParamForTriggerRule(
			{ paramCode: param.code, paramName: param.name },
			schemaParams,
		);
		if (schemaMatch?.schemaPointer) {
			pointers.add(schemaMatch.schemaPointer);
		}
	}

	return [...pointers];
}

export function buildParamFieldBindings(
	catalog: V2TypicalWorkParameterDto[],
	fieldPathHints: FieldPathHint[],
	schemaParams?: V2TypicalWorkParameterDto[],
): V2ParamFieldBinding[] {
	const pointersByTitle = new Map<string, string[]>();
	const pointersByNormTitle = new Map<string, string[]>();
	const pointersByKey = new Map<string, string[]>();

	for (const hint of fieldPathHints) {
		if (hint.title) {
			const title = hint.title.trim();
			appendPointer(pointersByTitle, title, hint.pointer);
			appendPointer(
				pointersByNormTitle,
				normalizeBindingLabel(title),
				hint.pointer,
			);
		}
		if (hint.key?.trim()) {
			appendPointer(pointersByKey, hint.key.trim(), hint.pointer);
		}
	}

	return catalog.map((param) => ({
		paramCode: param.code,
		paramName: param.name,
		pointers: resolveBindingPointers(
			param,
			pointersByTitle,
			pointersByNormTitle,
			pointersByKey,
			schemaParams,
		),
	}));
}

export function draftToGraph(draft: ParameterDependencyDraft): V2ParamDependencyGraph {
	return {
		targets: draft.targets.map((target) => ({
			targetParamCode: target.targetParamCode,
			rules: target.rules,
		})),
	};
}

export function graphToDraft(graph: V2ParamDependencyGraph): ParameterDependencyDraft {
	return {
		targets: graph.targets.map((target) => ({
			targetParamCode: target.targetParamCode,
			rules: target.rules,
		})),
	};
}

export function countUnmappedDependencyTargets(
	graph: V2ParamDependencyGraph,
	bindings: V2ParamFieldBinding[],
): number {
	return listUnmappedDependencyTargets(graph, bindings).length;
}

export function listUnmappedDependencyTargets(
	graph: V2ParamDependencyGraph,
	bindings: V2ParamFieldBinding[],
): Array<{ targetParamCode: string; paramName: string }> {
	const nameByCode = new Map(bindings.map((b) => [b.paramCode, b.paramName]));
	const pointersByCode = new Map(bindings.map((b) => [b.paramCode, b.pointers]));
	return graph.targets
		.filter(
			(target) =>
				target.rules.length > 0 &&
				(pointersByCode.get(target.targetParamCode)?.length ?? 0) === 0,
		)
		.map((target) => ({
			targetParamCode: target.targetParamCode,
			paramName:
				nameByCode.get(target.targetParamCode) ?? target.targetParamCode,
		}));
}
