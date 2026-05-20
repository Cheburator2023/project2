import "@xyflow/react/dist/style.css";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FileCopyOutlinedIcon from "@mui/icons-material/FileCopyOutlined";
import RuleOutlinedIcon from "@mui/icons-material/RuleOutlined";
import {
	Background,
	Controls,
	Handle,
	MiniMap,
	MarkerType,
	Position,
	ReactFlow,
	ReactFlowProvider,
	useEdgesState,
	useNodesState,
	useReactFlow,
	type Node,
	type NodeProps,
} from "@xyflow/react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { nanoid } from "nanoid";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { V2LogicRuleDto } from "@smart-anketa/api-contract";
import { normalizeJsonPointer } from "../../utils/schemaPaths";
import { ruleKindLabel } from "../constants";
import { useSchemaEditor } from "../SchemaEditorContext";
import { openV2TemplateLogicPage } from "../../utils/v2TemplateLogicPaths";
import { layoutRelationsGraphWithElk } from "./layoutRelationsGraphElk";
import {
	buildRelationsGraph,
	FIELD_NODE_WIDTH,
	RULE_NODE_WIDTH,
	type FieldNodeData,
	type RuleNodeData,
} from "./relationsGraph";
import { resolveCollisions } from "./resolveCollisions";
import { useRelationsNodeAutoSize } from "./useRelationsNodeAutoSize";
import {
	FIELD_ENTITY_ICON,
	FIELD_ROLE_VISUAL,
	RULE_KIND_VISUAL,
	type ChipColor,
	getRuleKindVisual,
	minimapNodeColor,
} from "./relationsGraphVisual";

const COLLISION_LAYOUT = {
	maxIterations: 100,
	overlapThreshold: 0.5,
	margin: 20,
} as const;

const COLLISION_DRAG = {
	maxIterations: Number.POSITIVE_INFINITY,
	overlapThreshold: 0.5,
	margin: 20,
} as const;

type RelationsGraphActions = {
	openFieldInLogic: (pointer: string) => void;
	openRuleInLogic: (ruleId: string) => void;
};

const RelationsGraphActionsContext =
	createContext<RelationsGraphActions | null>(null);

function useRelationsGraphActions(): RelationsGraphActions {
	const ctx = useContext(RelationsGraphActionsContext);
	if (!ctx) {
		throw new Error(
			"useRelationsGraphActions must be used within RelationsGraphActionsContext",
		);
	}
	return ctx;
}

function attachNodeHandlers(
	nodes: Node[],
	selectedPointer: string | null,
	selectedRuleId: string | null,
): Node[] {
	const selectedNorm = selectedPointer
		? normalizeJsonPointer(selectedPointer)
		: null;

	return nodes.map((node) => {
		if (node.type === "field") {
			const d = node.data as FieldNodeData;
			return {
				...node,
				data: {
					...d,
					selected: selectedNorm === normalizeJsonPointer(d.pointer),
				},
			};
		}
		if (node.type === "rule") {
			const d = node.data as RuleNodeData;
			return {
				...node,
				data: {
					...d,
					selected: d.ruleId === selectedRuleId,
				},
			};
		}
		return node;
	});
}

const handleSx = {
	width: 11,
	height: 11,
	border: "2px solid",
	borderColor: "background.paper",
};

const NODE_TEXT_SX = {
	wordBreak: "break-word" as const,
	lineHeight: 1.35,
	whiteSpace: "normal" as const,
};

const NODE_CARD_BG = "#ffffff";

function NodeOpenButton({ onOpen }: { onOpen: () => void }) {
	return (
		<IconButton
			size="small"
			className="nodrag nopan"
			title="Открыть на вкладке «Логика»"
			aria-label="Открыть в логике"
			onClick={(e) => {
				e.stopPropagation();
				onOpen();
			}}
			onMouseDown={(e) => e.stopPropagation()}
			onPointerDown={(e) => e.stopPropagation()}
			sx={{ pointerEvents: "all", p: 0.25 }}
		>
			<OpenInNewIcon sx={{ fontSize: 16 }} />
		</IconButton>
	);
}

function NodeIconBadge({
	Icon,
	palette,
}: {
	Icon: typeof FIELD_ENTITY_ICON;
	palette: "info" | "secondary" | "warning" | "primary" | "success" | "error";
}) {
	return (
		<Box
			sx={{
				width: 40,
				height: 40,
				borderRadius: 1.25,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				flexShrink: 0,
				bgcolor: (t) => alpha(t.palette[palette].main, 0.14),
				color: `${palette}.main`,
				border: 1,
				borderColor: (t) => alpha(t.palette[palette].main, 0.35),
			}}
		>
			<Icon sx={{ fontSize: 24 }} />
		</Box>
	);
}

function FieldNode({ id, data }: NodeProps) {
	const d = data as FieldNodeData;
	const { openFieldInLogic } = useRelationsGraphActions();
	const visual = FIELD_ROLE_VISUAL[d.role];
	const { Icon } = visual;
	const palette = visual.palette;
	const showPointer = d.pointer !== d.varPath;
	const cardRef = useRelationsNodeAutoSize(
		id,
		FIELD_NODE_WIDTH,
		`${d.label}|${d.varPath}|${d.pointer}|${showPointer}|${d.role}|${d.selected}`,
	);

	return (
		<>
			<Handle
				type="target"
				position={Position.Left}
				id="in"
				style={{ ...handleSx, background: visual.handleIn }}
			/>
			<Box
				ref={cardRef}
				sx={{
					boxSizing: "border-box",
					width: FIELD_NODE_WIDTH,
					px: 1.5,
					py: 1.25,
					borderRadius: 1.5,
					border: 2,
					borderColor: d.selected
						? "primary.main"
						: (t) => alpha(t.palette[palette].main, 0.55),
					bgcolor: d.selected ? "#e8f4fc" : NODE_CARD_BG,
					boxShadow: d.selected ? 3 : 1,
					pointerEvents: "all",
				}}
			>
				<Stack direction="row" spacing={1} alignItems="flex-start">
					<NodeIconBadge Icon={Icon} palette={palette} />
					<Box sx={{ flex: 1, minWidth: 0 }}>
						<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap mb={0.5}>
							<Chip
								size="small"
								icon={
									<FIELD_ENTITY_ICON sx={{ fontSize: "14px !important" }} />
								}
								label={visual.entityLabel}
								variant="outlined"
								sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
							/>
							<Chip
								size="small"
								label={visual.roleLabel}
								color={visual.chipColor}
								sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
							/>
						</Stack>
						<Typography
							variant="body2"
							fontWeight={700}
							title={d.label || d.varPath}
							sx={NODE_TEXT_SX}
						>
							{d.label || d.varPath}
						</Typography>
						<Typography
							variant="caption"
							color="text.secondary"
							title={d.varPath}
							sx={{
								...NODE_TEXT_SX,
								fontFamily: "monospace",
								fontSize: 11,
								mt: 0.35,
							}}
						>
							{d.varPath}
						</Typography>
						{showPointer ? (
							<Typography
								variant="caption"
								color="text.disabled"
								title={d.pointer}
								sx={{
									...NODE_TEXT_SX,
									fontSize: 10,
									mt: 0.25,
								}}
							>
								{d.pointer}
							</Typography>
						) : null}
					</Box>
					<NodeOpenButton onOpen={() => openFieldInLogic(d.pointer)} />
				</Stack>
			</Box>
			<Handle
				type="source"
				position={Position.Right}
				id="out"
				style={{ ...handleSx, background: visual.handleOut }}
			/>
		</>
	);
}

function RuleNode({ id, data }: NodeProps) {
	const d = data as RuleNodeData;
	const { openRuleInLogic } = useRelationsGraphActions();
	const visual = getRuleKindVisual(d.kind);
	const { Icon } = visual;
	const palette = visual.palette;
	const kindLabel = ruleKindLabel(d.kind);
	const cardRef = useRelationsNodeAutoSize(
		id,
		RULE_NODE_WIDTH,
		`${d.label}|${d.kind}|${kindLabel}|${d.selected}`,
	);

	return (
		<>
			<Handle
				type="target"
				position={Position.Left}
				id="in"
				style={{ ...handleSx, background: "#64748b" }}
			/>
			<Box
				ref={cardRef}
				sx={{
					boxSizing: "border-box",
					width: RULE_NODE_WIDTH,
					px: 1.5,
					py: 1.25,
					borderRadius: 1.5,
					border: 2,
					borderColor: d.selected
						? "secondary.main"
						: (t) => alpha(t.palette[palette].main, 0.5),
					bgcolor: d.selected ? "#f3e8ff" : NODE_CARD_BG,
					boxShadow: d.selected ? 3 : 1,
					pointerEvents: "all",
				}}
			>
				<Stack direction="row" spacing={1} alignItems="flex-start">
					<NodeIconBadge Icon={Icon} palette={palette} />
					<Box sx={{ flex: 1, minWidth: 0 }}>
						<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap mb={0.5}>
							<Chip
								size="small"
								icon={<RuleOutlinedIcon sx={{ fontSize: "14px !important" }} />}
								label="Правило"
								variant="outlined"
								sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
							/>
							<Chip
								size="small"
								label={kindLabel}
								color={visual.chipColor}
								sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
							/>
						</Stack>
						<Typography
							variant="body2"
							fontWeight={700}
							title={d.label || kindLabel}
							sx={NODE_TEXT_SX}
						>
							{d.label || kindLabel}
						</Typography>
						<Typography
							variant="caption"
							color="text.secondary"
							sx={{ fontSize: 10, mt: 0.35, display: "block" }}
						>
							Тип: {kindLabel}
						</Typography>
					</Box>
					<NodeOpenButton onOpen={() => openRuleInLogic(d.ruleId)} />
				</Stack>
			</Box>
			<Handle
				type="source"
				position={Position.Right}
				id="out"
				style={{ ...handleSx, background: "#4f46e5" }}
			/>
		</>
	);
}

const nodeTypes = { field: FieldNode, rule: RuleNode };

function LegendItem({ color, label }: { color: string; label: string }) {
	return (
		<Stack direction="row" spacing={0.75} alignItems="center">
			<Box
				sx={{
					width: 28,
					height: 0,
					borderTop: `2px solid ${color}`,
					position: "relative",
					"&::after": {
						content: '""',
						position: "absolute",
						right: -6,
						top: -5,
						border: "4px solid transparent",
						borderLeft: `6px solid ${color}`,
					},
				}}
			/>
			<Typography variant="caption" color="text.secondary">
				{label}
			</Typography>
		</Stack>
	);
}

function LegendChip({
	Icon,
	label,
	color,
}: {
	Icon: typeof FIELD_ENTITY_ICON;
	label: string;
	color: ChipColor;
}) {
	return (
		<Chip
			size="small"
			icon={<Icon sx={{ fontSize: "14px !important" }} />}
			label={label}
			color={color}
			variant={color === "default" ? "outlined" : "filled"}
			sx={{ height: 24, fontSize: 11 }}
		/>
	);
}

type ContextMenuState = {
	mouseX: number;
	mouseY: number;
	nodeType: "field" | "rule";
	field?: FieldNodeData;
	rule?: RuleNodeData;
};

function RelationsFlowInner() {
	const theme = useTheme();
	const {
		templateId,
		fieldPathHints,
		logic,
		setLogic,
		selectedPointer,
		selectedRuleId,
		setSelectedPointer,
		setSelectedRuleId,
		cycles,
	} = useSchemaEditor();

	const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

	const openFieldInLogic = useCallback(
		(pointer: string) => {
			setSelectedPointer(pointer);
			openV2TemplateLogicPage({ templateId, pointer });
		},
		[setSelectedPointer, templateId],
	);

	const openRuleInLogic = useCallback(
		(ruleId: string) => {
			setSelectedRuleId(ruleId);
			openV2TemplateLogicPage({ templateId, ruleId });
		},
		[setSelectedRuleId, templateId],
	);

	const relationsGraphActions = useMemo(
		(): RelationsGraphActions => ({
			openFieldInLogic,
			openRuleInLogic,
		}),
		[openFieldInLogic, openRuleInLogic],
	);

	const graphActions = useMemo(
		() => ({
			selectField: (pointer: string) => setSelectedPointer(pointer),
			selectRule: (ruleId: string) => setSelectedRuleId(ruleId),
			openFieldInLogic,
			openRuleInLogic,
			copyText: (text: string) => void navigator.clipboard.writeText(text),
			duplicateRule: (ruleId: string) => {
				const rule = logic.rules.find((r) => r.id === ruleId);
				if (!rule) return;
				const id = nanoid();
				const copy: V2LogicRuleDto = {
					...rule,
					id,
					description: rule.description
						? `${rule.description} (копия)`
						: undefined,
				};
				setLogic((prev) => ({ rules: [...prev.rules, copy] }));
				openRuleInLogic(id);
			},
			removeRule: (ruleId: string) => {
				setLogic((prev) => ({
					rules: prev.rules.filter((r) => r.id !== ruleId),
				}));
				if (selectedRuleId === ruleId) setSelectedRuleId(null);
			},
		}),
		[
			logic.rules,
			openFieldInLogic,
			openRuleInLogic,
			selectedRuleId,
			setLogic,
			setSelectedPointer,
			setSelectedRuleId,
		],
	);

	const { fitView } = useReactFlow();

	const { nodes: structureNodes, edges: structureEdges } = useMemo(
		() => buildRelationsGraph(fieldPathHints, logic.rules, null, null),
		[fieldPathHints, logic.rules],
	);

	const graphStructureKey = useMemo(
		() =>
			[
				structureNodes.map((n) => n.id).join(","),
				structureEdges.map((e) => `${e.source}->${e.target}`).join(","),
			].join("|"),
		[structureNodes, structureEdges],
	);

	const displayEdges = useMemo(
		() =>
			buildRelationsGraph(
				fieldPathHints,
				logic.rules,
				selectedPointer,
				selectedRuleId,
			).edges,
		[fieldPathHints, logic.rules, selectedPointer, selectedRuleId],
	);

	const selectedPointerRef = useRef(selectedPointer);
	const selectedRuleIdRef = useRef(selectedRuleId);
	selectedPointerRef.current = selectedPointer;
	selectedRuleIdRef.current = selectedRuleId;

	const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState(structureEdges);

	const runElkLayout = useCallback(async () => {
		let layouted = await layoutRelationsGraphWithElk(
			structureNodes,
			structureEdges,
		);
		layouted = resolveCollisions(layouted, COLLISION_LAYOUT);
		return layouted;
	}, [structureNodes, structureEdges]);

	const commitLayout = useCallback(
		(layouted: Node[], fitAfter = true) => {
			setNodes(
				attachNodeHandlers(
					layouted,
					selectedPointerRef.current,
					selectedRuleIdRef.current,
				),
			);
			setEdges(
				buildRelationsGraph(
					fieldPathHints,
					logic.rules,
					selectedPointerRef.current,
					selectedRuleIdRef.current,
				).edges,
			);
			if (fitAfter) {
				requestAnimationFrame(() =>
					fitView({ padding: 0.3, maxZoom: 1.15 }),
				);
			}
		},
		[fieldPathHints, fitView, logic.rules, setEdges, setNodes],
	);

	useEffect(() => {
		let cancelled = false;
		void runElkLayout().then((layouted) => {
			if (!cancelled) commitLayout(layouted);
		});
		return () => {
			cancelled = true;
		};
	}, [graphStructureKey, runElkLayout, commitLayout]);

	useEffect(() => {
		setNodes((nds) =>
			nds.length === 0
				? nds
				: attachNodeHandlers(nds, selectedPointer, selectedRuleId),
		);
		setEdges(displayEdges);
	}, [displayEdges, selectedPointer, selectedRuleId, setEdges, setNodes]);

	const onRelayoutClick = useCallback(() => {
		void runElkLayout().then((layouted) => commitLayout(layouted));
	}, [runElkLayout, commitLayout]);

	const onNodeDragStop = useCallback(() => {
		setNodes((nds) => resolveCollisions(nds, COLLISION_DRAG));
	}, [setNodes]);

	const nodesSizeKey = useMemo(
		() =>
			nodes
				.map((n) => `${n.id}:${n.width ?? 0}x${n.height ?? 0}`)
				.join("|"),
		[nodes],
	);

	useEffect(() => {
		if (nodes.length === 0) return;
		const t = window.setTimeout(() => {
			setNodes((nds) => resolveCollisions(nds, COLLISION_LAYOUT));
		}, 300);
		return () => window.clearTimeout(t);
	}, [nodesSizeKey, setNodes]);

	const onNodeClick = useCallback(
		(_event: React.MouseEvent, node: Node) => {
			if (node.type === "field") {
				graphActions.selectField((node.data as FieldNodeData).pointer);
			} else if (node.type === "rule") {
				graphActions.selectRule((node.data as RuleNodeData).ruleId);
			}
		},
		[graphActions],
	);

	const onNodeContextMenu = useCallback(
		(event: React.MouseEvent, node: Node) => {
			event.preventDefault();
			if (node.type === "field") {
				setContextMenu({
					mouseX: event.clientX,
					mouseY: event.clientY,
					nodeType: "field",
					field: node.data as FieldNodeData,
				});
			} else if (node.type === "rule") {
				setContextMenu({
					mouseX: event.clientX,
					mouseY: event.clientY,
					nodeType: "rule",
					rule: node.data as RuleNodeData,
				});
			}
		},
		[],
	);

	const closeMenu = () => setContextMenu(null);

	const fieldCount = nodes.filter((n) => n.type === "field").length;

	if (logic.rules.length === 0) {
		return (
			<Box sx={{ p: 2 }}>
				<Typography variant="body2" color="text.secondary">
					Нет правил логики. Добавьте правила на вкладке «Логика», затем здесь
					появится схема: поля-источники → правила → поля-результаты.
				</Typography>
			</Box>
		);
	}

	return (
		<RelationsGraphActionsContext.Provider value={relationsGraphActions}>
			<Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
				<Stack
					spacing={1}
					sx={{
						px: 2,
						py: 1,
						flexShrink: 0,
						borderBottom: 1,
						borderColor: "divider",
					}}
				>
					<Stack
						direction="row"
						spacing={1}
						alignItems="center"
						flexWrap="wrap"
						useFlexGap
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
							label={`${fieldCount} полей`}
						/>
						<Chip
							size="small"
							variant="outlined"
							color={edges.length > 0 ? "success" : "warning"}
							label={`${edges.length} связей`}
						/>
						<Button
							size="small"
							variant="outlined"
							onClick={onRelayoutClick}
							sx={{ ml: "auto" }}
						>
							Пересобрать раскладку
						</Button>
					</Stack>
					<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
						<LegendItem color="#64748b" label="зависимость (поле → правило)" />
						<LegendItem color="#4f46e5" label="результат (правило → поле)" />
					</Stack>
					<Stack spacing={0.5}>
						<Typography variant="caption" color="text.secondary" fontWeight={600}>
							Поля
						</Typography>
						<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
							{(["dep", "target", "both"] as const).map((role) => {
								const v = FIELD_ROLE_VISUAL[role];
								return (
									<LegendChip
										key={role}
										Icon={v.Icon}
										label={v.roleLabel}
										color={v.chipColor}
									/>
								);
							})}
						</Stack>
					</Stack>
					<Stack spacing={0.5}>
						<Typography variant="caption" color="text.secondary" fontWeight={600}>
							Правила
						</Typography>
						<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
							{Object.entries(RULE_KIND_VISUAL).map(([kind, v]) => (
								<LegendChip
									key={kind}
									Icon={v.Icon}
									label={ruleKindLabel(kind)}
									color={v.chipColor}
								/>
							))}
						</Stack>
					</Stack>
					<Typography variant="caption" color="text.secondary">
						Раскладка ELK (слева направо: поля → правила → поля). ↗ открывает редактор
						логики в отдельной вкладке. Узлы можно перетаскивать.
					</Typography>
					{edges.length === 0 ? (
						<Typography variant="caption" color="warning.main">
							Связей нет: укажите «Целевое поле» и «Зависимости» в правилах.
						</Typography>
					) : null}
					{cycles.length > 0 ? (
						<Typography variant="caption" color="warning.main">
							Циклы: {cycles.slice(0, 2).join(" · ")}
						</Typography>
					) : null}
				</Stack>

				<Box
					sx={{
						flex: 1,
						minHeight: 240,
						"& .react-flow__edge-path": { strokeLinecap: "round" },
						"& .react-flow__node": { overflow: "visible" },
					}}
				>
					<ReactFlow
						nodes={nodes}
						edges={edges}
						nodeTypes={nodeTypes}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						onNodeClick={onNodeClick}
						onNodeContextMenu={onNodeContextMenu}
						onNodeDragStop={onNodeDragStop}
						onPaneClick={closeMenu}
						nodesDraggable
						fitView
						fitViewOptions={{ padding: 0.3, maxZoom: 1.15 }}
						minZoom={0.15}
						maxZoom={1.5}
						nodesConnectable={false}
						elementsSelectable
						proOptions={{ hideAttribution: true }}
						defaultEdgeOptions={{
							type: "smoothstep",
							markerEnd: {
								type: MarkerType.ArrowClosed,
								width: 18,
								height: 18,
							},
							style: { strokeWidth: 2 },
						}}
						style={{
							background:
								theme.palette.mode === "dark"
									? theme.palette.grey[900]
									: theme.palette.grey[50],
						}}
					>
						<Background gap={16} size={1} />
						<Controls showInteractive={false} />
						<MiniMap
							pannable
							zoomable
							nodeColor={(n) => minimapNodeColor(n, theme)}
						/>
					</ReactFlow>
				</Box>

				<Menu
					open={contextMenu !== null}
					onClose={closeMenu}
					anchorReference="anchorPosition"
					anchorPosition={
						contextMenu
							? { top: contextMenu.mouseY, left: contextMenu.mouseX }
							: undefined
					}
				>
					{contextMenu?.nodeType === "field" && contextMenu.field ? (
						<>
							<MenuItem
								onClick={() => {
									graphActions.openFieldInLogic(contextMenu.field!.pointer);
									closeMenu();
								}}
							>
								<ListItemIcon>
									<OpenInNewIcon fontSize="small" />
								</ListItemIcon>
								<ListItemText>Открыть в логике</ListItemText>
							</MenuItem>
							<MenuItem
								onClick={() => {
									graphActions.selectField(contextMenu.field!.pointer);
									closeMenu();
								}}
							>
								<ListItemText inset>Выделить поле</ListItemText>
							</MenuItem>
							<MenuItem
								onClick={() => {
									graphActions.copyText(contextMenu.field!.pointer);
									closeMenu();
								}}
							>
								<ListItemIcon>
									<ContentCopyIcon fontSize="small" />
								</ListItemIcon>
								<ListItemText>Копировать JSON Pointer</ListItemText>
							</MenuItem>
							<MenuItem
								onClick={() => {
									graphActions.copyText(contextMenu.field!.varPath);
									closeMenu();
								}}
							>
								<ListItemIcon>
									<ContentCopyIcon fontSize="small" />
								</ListItemIcon>
								<ListItemText>Копировать var</ListItemText>
							</MenuItem>
						</>
					) : null}
					{contextMenu?.nodeType === "rule" && contextMenu.rule ? (
						<>
							<MenuItem
								onClick={() => {
									graphActions.openRuleInLogic(contextMenu.rule!.ruleId);
									closeMenu();
								}}
							>
								<ListItemIcon>
									<OpenInNewIcon fontSize="small" />
								</ListItemIcon>
								<ListItemText>Открыть в логике</ListItemText>
							</MenuItem>
							<MenuItem
								onClick={() => {
									graphActions.selectRule(contextMenu.rule!.ruleId);
									closeMenu();
								}}
							>
								<ListItemText inset>Выделить правило</ListItemText>
							</MenuItem>
							<MenuItem
								onClick={() => {
									graphActions.duplicateRule(contextMenu.rule!.ruleId);
									closeMenu();
								}}
							>
								<ListItemIcon>
									<FileCopyOutlinedIcon fontSize="small" />
								</ListItemIcon>
								<ListItemText>Дублировать правило</ListItemText>
							</MenuItem>
							<MenuItem
								onClick={() => {
									graphActions.removeRule(contextMenu.rule!.ruleId);
									closeMenu();
								}}
							>
								<ListItemIcon>
									<DeleteOutlineIcon fontSize="small" color="warning" />
								</ListItemIcon>
								<ListItemText>Удалить правило</ListItemText>
							</MenuItem>
						</>
					) : null}
				</Menu>
			</Box>
		</RelationsGraphActionsContext.Provider>
	);
}

function RelationsFlow() {
	return <RelationsFlowInner />;
}

type Props = { embedded?: boolean };

export function SchemaRelationsPanel({ embedded }: Props) {
	return (
		<Box
			sx={{
				height: embedded ? "100%" : 600,
				minHeight: embedded ? 320 : 600,
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
