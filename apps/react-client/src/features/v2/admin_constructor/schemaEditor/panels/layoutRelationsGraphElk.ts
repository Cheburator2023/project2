import ELK from "elkjs/lib/elk.bundled.js";
import { Position, type Edge, type Node } from "@xyflow/react";
import {
	FIELD_NODE_MIN_HEIGHT,
	FIELD_NODE_WIDTH,
	RULE_NODE_MIN_HEIGHT,
	RULE_NODE_WIDTH,
} from "./relationsGraph";

const elk = new ELK();

/** @see https://reactflow.dev/examples/layout/elkjs */
const elkOptions: Record<string, string> = {
	"elk.algorithm": "layered",
	"elk.direction": "RIGHT",
	"elk.layered.spacing.nodeNodeBetweenLayers": "180",
	"elk.spacing.nodeNode": "72",
	"elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
};

function nodeDimensions(node: Node): { width: number; height: number } {
	if (node.type === "field") {
		return {
			width: Number(node.width) || FIELD_NODE_WIDTH,
			height: Number(node.height) || FIELD_NODE_MIN_HEIGHT,
		};
	}
	return {
		width: Number(node.width) || RULE_NODE_WIDTH,
		height: Number(node.height) || RULE_NODE_MIN_HEIGHT,
	};
}

export async function layoutRelationsGraphWithElk(
	nodes: Node[],
	edges: Edge[],
): Promise<Node[]> {
	if (nodes.length === 0) return nodes;

	const graph = {
		id: "root",
		layoutOptions: elkOptions,
		children: nodes.map((node) => {
			const { width, height } = nodeDimensions(node);
			return {
				id: node.id,
				width,
				height,
			};
		}),
		edges: edges.map((edge) => ({
			id: edge.id,
			sources: [edge.source],
			targets: [edge.target],
		})),
	};

	const layouted = await elk.layout(graph);
	if (!layouted.children?.length) return nodes;

	const positionById = new Map(
		layouted.children.map((child) => [
			child.id,
			{ x: child.x ?? 0, y: child.y ?? 0 },
		]),
	);

	return nodes.map((node) => {
		const pos = positionById.get(node.id);
		if (!pos) return node;
		return {
			...node,
			position: pos,
			targetPosition: Position.Left,
			sourcePosition: Position.Right,
		};
	});
}
