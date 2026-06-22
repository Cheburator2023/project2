import type {
	V2ParamDependencyGraph,
	V2ParamFieldBinding,
	V2TypicalWorkParameterDto,
} from "@smart-anketa/api-contract";
import type { FieldPathHint } from "../../types";
import type { ParameterDependencyDraft } from "./parameterDependenciesStorage";

export function buildParamFieldBindings(
	catalog: V2TypicalWorkParameterDto[],
	fieldPathHints: FieldPathHint[],
): V2ParamFieldBinding[] {
	const pointersByTitle = new Map<string, string[]>();

	for (const hint of fieldPathHints) {
		if (!hint.title) continue;
		const title = hint.title.trim();
		const list = pointersByTitle.get(title) ?? [];
		list.push(hint.pointer);
		pointersByTitle.set(title, list);
	}

	return catalog.map((param) => ({
		paramCode: param.code,
		paramName: param.name,
		pointers: pointersByTitle.get(param.name.trim()) ?? [],
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
	const pointersByCode = new Map(bindings.map((b) => [b.paramCode, b.pointers]));
	return graph.targets.filter(
		(target) =>
			target.rules.length > 0 &&
			(pointersByCode.get(target.targetParamCode)?.length ?? 0) === 0,
	).length;
}
