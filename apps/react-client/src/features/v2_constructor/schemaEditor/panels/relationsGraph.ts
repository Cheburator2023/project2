import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { V2LogicRuleDto } from "@smart-anketa/api-contract";
import {
	jsonPointerToFormDataVarPath,
	normalizeJsonPointer,
} from "../../utils/schemaPaths";
import { extractVarsFromLogic } from "./logicPanel/helpers";
import type { FieldPathHint } from "../types";

export const FIELD_NODE_WIDTH = 300;
/** Стартовая высота для ELK; после монтирования подстраивается по контенту. */
export const FIELD_NODE_MIN_HEIGHT = 88;
export const RULE_NODE_WIDTH = 268;
export const RULE_NODE_MIN_HEIGHT = 80;

export type FieldNodeData = {
	label: string;
	varPath: string;
	pointer: string;
	role: "dep" | "target" | "both";
	selected: boolean;
	onOpen?: () => void;
};

export type RuleNodeData = {
	label: string;
	kind: string;
	ruleId: string;
	selected: boolean;
	onOpen?: () => void;
};

export function fieldNodeId(pointer: string): string {
	return `field:${normalizeJsonPointer(pointer)}`;
}

export function resolveFieldHint(
	ref: string,
	hints: FieldPathHint[],
): FieldPathHint | undefined {
	const trimmed = ref.trim();
	if (!trimmed) return undefined;
	const asPointer = normalizeJsonPointer(trimmed);
	let hint = hints.find((h) => normalizeJsonPointer(h.pointer) === asPointer);
	if (hint) return hint;
	if (!trimmed.startsWith("/")) {
		hint = hints.find((h) => h.varPath === trimmed);
		if (hint) return hint;
		const fromVar = hints.find(
			(h) => h.varPath === jsonPointerToFormDataVarPath(asPointer),
		);
		if (fromVar) return fromVar;
	}
	return hints.find((h) => h.pointer === trimmed || h.varPath === trimmed);
}

function collectActiveHints(
	fieldPathHints: FieldPathHint[],
	rules: V2LogicRuleDto[],
): {
	hints: FieldPathHint[];
	roles: Map<string, { dep: boolean; target: boolean }>;
} {
	const roles = new Map<string, { dep: boolean; target: boolean }>();
	const pointerKeys = new Set<string>();

	const touch = (ref: string, role: "dep" | "target") => {
		const hint = resolveFieldHint(ref, fieldPathHints);
		if (!hint) return;
		const key = normalizeJsonPointer(hint.pointer);
		pointerKeys.add(key);
		const prev = roles.get(key) ?? { dep: false, target: false };
		roles.set(key, { ...prev, [role]: true });
	};

	for (const rule of rules) {
		if (rule.targetPath) touch(rule.targetPath, "target");
		for (const dep of rule.dependencies ?? []) touch(dep, "dep");
		const arrayPath = rule.payload?.arrayPath;
		if (typeof arrayPath === "string") touch(arrayPath, "dep");
		for (const v of extractVarsFromLogic(rule.condition)) {
			touch(v, "dep");
		}
	}

	const hints = fieldPathHints.filter((h) =>
		pointerKeys.has(normalizeJsonPointer(h.pointer)),
	);

	return { hints, roles };
}

const DEP_EDGE: Partial<Edge> = {
	type: "smoothstep",
	markerEnd: {
		type: MarkerType.ArrowClosed,
		width: 18,
		height: 18,
		color: "#64748b",
	},
	style: { stroke: "#64748b", strokeWidth: 2 },
	labelStyle: { fill: "#1e293b", fontSize: 11, fontWeight: 600 },
	labelBgStyle: { fill: "#f1f5f9", fillOpacity: 0.95 },
};

const TARGET_EDGE: Partial<Edge> = {
	type: "smoothstep",
	markerEnd: {
		type: MarkerType.ArrowClosed,
		width: 18,
		height: 18,
		color: "#4f46e5",
	},
	style: { stroke: "#4f46e5", strokeWidth: 2 },
	labelStyle: { fill: "#312e81", fontSize: 11, fontWeight: 600 },
	labelBgStyle: { fill: "#eef2ff", fillOpacity: 0.95 },
};

/** Строит узлы и рёбра; позиции задаёт ELK + resolveCollisions в панели. */
export function buildRelationsGraph(
	fieldPathHints: FieldPathHint[],
	rules: V2LogicRuleDto[],
	selectedPointer: string | null,
	selectedRuleId: string | null,
): { nodes: Node[]; edges: Edge[] } {
	const { hints: activeHints, roles } = collectActiveHints(
		fieldPathHints,
		rules,
	);

	const nodes: Node[] = [];
	const edges: Edge[] = [];
	const edgeIds = new Set<string>();

	const selectedNorm = selectedPointer
		? normalizeJsonPointer(selectedPointer)
		: null;

	for (const h of activeHints) {
		const key = normalizeJsonPointer(h.pointer);
		const role = roles.get(key) ?? { dep: false, target: false };
		const roleLabel: FieldNodeData["role"] =
			role.dep && role.target
				? "both"
				: role.dep
					? "dep"
					: role.target
						? "target"
						: "both";

		nodes.push({
			id: fieldNodeId(h.pointer),
			type: "field",
			position: { x: 0, y: 0 },
			width: FIELD_NODE_WIDTH,
			height: FIELD_NODE_MIN_HEIGHT,
			data: {
				label: h.title ?? h.key,
				varPath: h.varPath,
				pointer: h.pointer,
				role: roleLabel,
				selected: selectedNorm === key,
			} satisfies FieldNodeData,
		});
	}

	for (const rule of rules) {
		const ruleNodeId = `rule:${rule.id}`;
		const selected = rule.id === selectedRuleId;

		nodes.push({
			id: ruleNodeId,
			type: "rule",
			position: { x: 0, y: 0 },
			width: RULE_NODE_WIDTH,
			height: RULE_NODE_MIN_HEIGHT,
			data: {
				label:
					(rule.payload?.label as string | undefined) ??
					rule.description ??
					rule.kind,
				kind: rule.kind,
				ruleId: rule.id,
				selected,
			} satisfies RuleNodeData,
		});

		const addDepEdge = (ref: string) => {
			const hint = resolveFieldHint(ref, activeHints);
			if (!hint) return;
			const source = fieldNodeId(hint.pointer);
			const edgeId = `dep:${source}->${ruleNodeId}`;
			if (edgeIds.has(edgeId)) return;
			edgeIds.add(edgeId);
			edges.push({
				id: edgeId,
				source,
				target: ruleNodeId,
				sourceHandle: "out",
				targetHandle: "in",
				label: "зависимость",
				...DEP_EDGE,
				...(selected
					? { style: { stroke: "#0f766e", strokeWidth: 2.5 } }
					: {}),
			});
		};

		for (const dep of rule.dependencies ?? []) addDepEdge(dep);
		const arrayPath = rule.payload?.arrayPath;
		if (typeof arrayPath === "string") addDepEdge(arrayPath);
		for (const v of extractVarsFromLogic(rule.condition)) addDepEdge(v);

		if (rule.targetPath) {
			const hint = resolveFieldHint(rule.targetPath, activeHints);
			if (hint) {
				const target = fieldNodeId(hint.pointer);
				const edgeId = `target:${ruleNodeId}->${target}`;
				if (!edgeIds.has(edgeId)) {
					edgeIds.add(edgeId);
					const isCalc =
						rule.kind === "computed" || rule.kind === "row_computed";
					edges.push({
						id: edgeId,
						source: ruleNodeId,
						target,
						sourceHandle: "out",
						targetHandle: "in",
						label: isCalc ? "записывает" : "влияет на",
						animated: isCalc,
						...TARGET_EDGE,
						...(selected
							? { style: { stroke: "#4338ca", strokeWidth: 2.5 } }
							: {}),
					});
				}
			}
		}
	}

	return { nodes, edges };
}
