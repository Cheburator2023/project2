import "@xyflow/react/dist/style.css";
import {
	Background,
	Controls,
	Handle,
	MiniMap,
	Position,
	ReactFlow,
	ReactFlowProvider,
	useEdgesState,
	useNodesState,
	type Edge,
	type Node,
	type NodeProps,
} from "@xyflow/react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useMemo } from "react";
import { ruleKindLabel } from "../constants";
import { useSchemaEditor } from "../SchemaEditorContext";

// ──────────────────────────────────────────────────────────────────────
// Custom node types
// ──────────────────────────────────────────────────────────────────────

type FieldNodeData = {
	label: string;
	varPath: string;
	selected: boolean;
};

function FieldNode({ data }: NodeProps) {
	const d = data as FieldNodeData;
	return (
		<>
			<Handle type="target" position={Position.Left} />
			<Box
				sx={{
					px: 1.5,
					py: 0.75,
					borderRadius: 1,
					border: 2,
					borderColor: d.selected ? "primary.main" : "divider",
					bgcolor: d.selected ? "primary.light" : "background.paper",
					minWidth: 120,
					maxWidth: 200,
				}}
			>
				<Typography
					variant="caption"
					fontWeight={700}
					noWrap
					title={d.varPath}
					display="block"
				>
					{d.label || d.varPath}
				</Typography>
				<Typography
					variant="caption"
					color="text.secondary"
					noWrap
					display="block"
					title={d.varPath}
				>
					{d.varPath}
				</Typography>
			</Box>
			<Handle type="source" position={Position.Right} />
		</>
	);
}

type RuleNodeData = {
	label: string;
	kind: string;
	ruleId: string;
	selected: boolean;
};

function RuleNode({ data }: NodeProps) {
	const d = data as RuleNodeData;
	return (
		<>
			<Handle type="target" position={Position.Left} />
			<Box
				sx={{
					px: 1,
					py: 0.5,
					borderRadius: 1,
					border: 1,
					borderColor: d.selected ? "secondary.main" : "divider",
					bgcolor: d.selected ? "secondary.light" : "action.hover",
					minWidth: 80,
					maxWidth: 180,
				}}
			>
				<Typography variant="caption" display="block" noWrap title={d.label}>
					{d.label || "Правило"}
				</Typography>
				<Chip
					size="small"
					label={ruleKindLabel(d.kind)}
					sx={{ height: 16, fontSize: 10 }}
				/>
			</Box>
			<Handle type="source" position={Position.Right} />
		</>
	);
}

const nodeTypes = { field: FieldNode, rule: RuleNode };

// ──────────────────────────────────────────────────────────────────────
// Build graph from context data
// ──────────────────────────────────────────────────────────────────────

const FIELD_X = 20;
const RULE_X = 320;
const NODE_GAP = 80;

function buildGraph(
	fieldPathHints: ReturnType<
		typeof import("../SchemaEditorContext").useSchemaEditor
	>["fieldPathHints"],
	rules: ReturnType<
		typeof import("../SchemaEditorContext").useSchemaEditor
	>["logic"]["rules"],
	selectedPointer: string | null,
	selectedRuleId: string | null,
): { nodes: Node[]; edges: Edge[] } {
	// Collect only fields that appear in rules (as target or dependency)
	const activeVarPaths = new Set<string>();
	for (const rule of rules) {
		if (rule.targetPath) activeVarPaths.add(rule.targetPath);
		for (const dep of rule.dependencies ?? []) {
			activeVarPaths.add(dep);
		}
		const arrayVarPath = (rule.payload?.arrayVarPath as string | undefined);
		if (arrayVarPath) activeVarPaths.add(arrayVarPath);
	}

	const activeHints = fieldPathHints.filter((h) =>
		activeVarPaths.has(h.varPath),
	);

	const nodes: Node[] = [];
	const edges: Edge[] = [];

	// Field nodes
	for (let i = 0; i < activeHints.length; i++) {
		const h = activeHints[i];
		nodes.push({
			id: `field:${h.varPath}`,
			type: "field",
			position: { x: FIELD_X, y: i * NODE_GAP },
			data: {
				label: h.title ?? h.key,
				varPath: h.varPath,
				selected:
					!!selectedPointer && h.pointer === selectedPointer,
			},
		});
	}

	// Rule nodes & edges
	for (let i = 0; i < rules.length; i++) {
		const rule = rules[i];
		const ruleNodeId = `rule:${rule.id}`;

		nodes.push({
			id: ruleNodeId,
			type: "rule",
			position: { x: RULE_X, y: i * NODE_GAP },
			data: {
				label: (rule.payload?.label as string | undefined) ?? rule.description ?? rule.kind,
				kind: rule.kind,
				ruleId: rule.id,
				selected: rule.id === selectedRuleId,
			},
		});

		// Dependencies → rule
		for (const dep of rule.dependencies ?? []) {
			const sourceId = `field:${dep}`;
			const edgeId = `e-dep-${rule.id}-${dep}`;
			if (activeHints.find((h) => h.varPath === dep)) {
				edges.push({
					id: edgeId,
					source: sourceId,
					target: ruleNodeId,
					animated: false,
					label: "зависит",
					style: { stroke: "#94a3b8" },
				});
			}
		}

		// Rule → target field
		if (rule.targetPath) {
			const targetId = `field:${rule.targetPath}`;
			if (activeHints.find((h) => h.varPath === rule.targetPath)) {
				edges.push({
					id: `e-target-${rule.id}`,
					source: ruleNodeId,
					target: targetId,
					animated: rule.kind === "computed" || rule.kind === "row_computed",
					label: "→ результат",
					style: { stroke: "#6366f1" },
				});
			}
		}
	}

	return { nodes, edges };
}

// ──────────────────────────────────────────────────────────────────────
// Panel body
// ──────────────────────────────────────────────────────────────────────

function RelationsFlow() {
	const {
		fieldPathHints,
		logic,
		selectedPointer,
		selectedRuleId,
		setSelectedPointer,
		setSelectedRuleId,
	} = useSchemaEditor();

	const { nodes: initNodes, edges: initEdges } = useMemo(
		() =>
			buildGraph(fieldPathHints, logic.rules, selectedPointer, selectedRuleId),
		[fieldPathHints, logic.rules, selectedPointer, selectedRuleId],
	);

	const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);

	useEffect(() => {
		setNodes(initNodes);
		setEdges(initEdges);
	}, [initNodes, initEdges, setNodes, setEdges]);

	const onNodeClick = useCallback(
		(_event: React.MouseEvent, node: Node) => {
			if (node.type === "field") {
				const d = node.data as FieldNodeData;
				const hint = fieldPathHints.find((h) => h.varPath === d.varPath);
				if (hint) setSelectedPointer(hint.pointer);
			} else if (node.type === "rule") {
				const d = node.data as RuleNodeData;
				setSelectedRuleId(d.ruleId);
			}
		},
		[fieldPathHints, setSelectedPointer, setSelectedRuleId],
	);

	if (logic.rules.length === 0) {
		return (
			<Box sx={{ p: 2 }}>
				<Typography variant="body2" color="text.secondary">
					Нет правил логики. Добавьте правила на вкладке «Логика».
				</Typography>
			</Box>
		);
	}

	return (
		<Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
			<Stack
				direction="row"
				spacing={1}
				alignItems="center"
				sx={{ px: 2, py: 1, flexShrink: 0, borderBottom: 1, borderColor: "divider" }}
			>
				<Typography variant="subtitle2">Граф связей</Typography>
				<Chip
					size="small"
					variant="outlined"
					label={`${logic.rules.length} правил`}
				/>
				<Chip
					size="small"
					variant="outlined"
					color="primary"
					label={`${nodes.filter((n) => n.type === "field").length} полей`}
				/>
			</Stack>

			<Box sx={{ flex: 1, minHeight: 0 }}>
				<ReactFlow
					nodes={nodes}
					edges={edges}
					nodeTypes={nodeTypes}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onNodeClick={onNodeClick}
					fitView
					fitViewOptions={{ padding: 0.2 }}
					attributionPosition="bottom-right"
				>
					<Background />
					<Controls />
					<MiniMap pannable zoomable />
				</ReactFlow>
			</Box>
		</Box>
	);
}

type Props = { embedded?: boolean };

export function SchemaRelationsPanel({ embedded }: Props) {
	return (
		<Box
			sx={{
				height: embedded ? "100%" : 600,
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
			}}
		>
			<ReactFlowProvider>
				<RelationsFlow />
			</ReactFlowProvider>
		</Box>
	);
}
