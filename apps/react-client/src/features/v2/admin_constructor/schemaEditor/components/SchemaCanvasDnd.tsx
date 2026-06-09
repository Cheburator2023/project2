import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import GridViewIcon from "@mui/icons-material/GridView";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import {
	Tree,
	type DropOptions,
	type NodeModel,
} from "@minoru/react-dnd-treeview";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	type CSSProperties,
} from "react";
import { useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import {
	readV2AnketaSectionUiOptions,
	resolveV2AnketaArchComponent,
	resolveV2AnketaCanvasUiKind,
	V2_ARCH_COMPONENT_LABELS,
	type V2AnketaCanvasUiKind,
	type V2ArchComponentType,
} from "@smart-anketa/api-contract";
import {
	getObjectItemsSchema,
	isObjectFieldGroup,
	listOrderedChildKeys,
	patchUiOptionsAtPointer,
	readUiSchemaBranchAtPointer,
	resolveSchemaNode,
} from "../../utils/schemaMutators";
import { pointerSegments } from "../../utils/schemaPaths";
import {
	ARCH_COMPONENT_CHIP_COLORS,
	ARCH_COMPONENT_PRESETS,
	CALCULATION_FIELD_PRESETS,
	CANVAS_HIDDEN_CHIP_COLOR,
	CANVAS_UTILITY_CHIP_COLOR,
	FIELD_PRESETS,
	LAYOUT_PRESETS,
	WORK_COMPONENT_PRESETS,
	type PalettePreset,
	ruSchemaTypeLabel,
} from "../constants";
import { useSchemaEditor } from "../SchemaEditorContext";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import { PanelChrome } from "./PanelChrome";
import { SchemaCanvasPlaceholder } from "./SchemaCanvasPlaceholder";
import {
	buildPaletteDragNode,
	buildSchemaCanvasTree,
	collectGroupOrders,
	getPresetIdFromPaletteDragSource,
	isPaletteDragSource,
	PALETTE_DRAG_TYPE,
	resolvePaletteDropTarget,
	SCHEMA_CANVAS_ROOT_ID,
	treeToGroupOrders,
	type SchemaCanvasNodeData,
} from "../schemaCanvasTree";

const DEPTH_INDENT_PX = 12;
const CANVAS_TREE_DROP_TARGET_CLASS = "schema-canvas-tree-drop-target";
const CANVAS_TREE_DRAGGING_CLASS = "schema-canvas-tree-dragging";
const CANVAS_TREE_PLACEHOLDER_CLASS = "schema-canvas-tree-placeholder";
const CANVAS_TREE_ROOT_CLASS = "schema-canvas-tree-root";

function ArchComponentChip({ arch }: { arch: V2ArchComponentType }) {
	const color = ARCH_COMPONENT_CHIP_COLORS[arch];
	return (
		<Chip
			size="small"
			label={V2_ARCH_COMPONENT_LABELS[arch]}
			variant="filled"
			sx={{
				height: 20,
				bgcolor: alpha(color, 0.12),
				color,
				border: `1px solid ${alpha(color, 0.35)}`,
				"& .MuiChip-label": { px: 0.75, fontSize: "0.65rem", fontWeight: 600 },
			}}
		/>
	);
}

const CANVAS_UI_KIND_LABELS: Record<V2AnketaCanvasUiKind, string> = {
	hidden: "Скрыто",
	utility: "Системное",
};

function CanvasUiKindChip({ kind }: { kind: V2AnketaCanvasUiKind }) {
	const color =
		kind === "hidden" ? CANVAS_HIDDEN_CHIP_COLOR : CANVAS_UTILITY_CHIP_COLOR;
	return (
		<Chip
			size="small"
			label={CANVAS_UI_KIND_LABELS[kind]}
			variant="filled"
			sx={{
				height: 20,
				bgcolor: alpha(color, 0.14),
				color,
				border: `1px solid ${alpha(color, 0.4)}`,
				"& .MuiChip-label": { px: 0.75, fontSize: "0.65rem", fontWeight: 600 },
			}}
		/>
	);
}

function findPointerByArchComponent(
	jsonSchema: import("@rjsf/utils").RJSFSchema,
	uiSchema: import("@rjsf/utils").UiSchema,
	arch: V2ArchComponentType,
): string | null {
	const rows = listOrderedChildKeys(jsonSchema, "/", uiSchema);
	const walk = (keys: string[], parentPointer: string): string | null => {
		for (const key of keys) {
			const pointer =
				parentPointer === "/" ? `/${key}` : `${parentPointer}/${key}`;
			const branch = readUiSchemaBranchAtPointer(uiSchema, pointer);
			if (resolveV2AnketaArchComponent(branch) === arch) {
				return pointer;
			}
			const node = resolveSchemaNode(jsonSchema, pointerSegments(pointer));
			if (isObjectFieldGroup(node)) {
				const childKeys = listOrderedChildKeys(jsonSchema, pointer, uiSchema);
				const found = walk(childKeys, pointer);
				if (found) return found;
			}
			const itemsObj = getObjectItemsSchema(node);
			if (itemsObj) {
				const itemKeys = listOrderedChildKeys(
					jsonSchema,
					`${pointer}/items`,
					uiSchema,
				);
				const found = walk(itemKeys, `${pointer}/items`);
				if (found) return found;
			}
		}
		return null;
	};
	return walk(rows, "/");
}

/** Паттерн ExternalElementInsideReactDnd/ExternalNode.tsx — native div + useRef + drag(ref). */
function PaletteItem({
	preset,
	archColor,
	isArch,
	onArchClick,
	onDoubleClickAdd,
}: {
	preset: PalettePreset;
	archColor?: string;
	isArch: boolean;
	onArchClick?: () => void;
	onDoubleClickAdd: () => void;
}) {
	const theme = useTheme();
	const ref = useRef<HTMLDivElement>(null);
	const dragNode = useMemo(
		() => buildPaletteDragNode(String(preset.id), preset.title),
		[preset.id, preset.title],
	);

	const [{ isDragging }, drag, dragPreview] = useDrag({
		type: PALETTE_DRAG_TYPE,
		item: dragNode,
		collect: (monitor) => ({ isDragging: monitor.isDragging() }),
	});

	useEffect(() => {
		dragPreview(getEmptyImage(), { captureDraggingState: true });
	}, [dragPreview]);

	drag(ref);

	const borderColor = isArch
		? (archColor ?? theme.palette.primary.main)
		: theme.palette.divider;

	const rootStyle: CSSProperties = {
		display: "flex",
		alignItems: "center",
		gap: 8,
		padding: "6px 8px",
		marginBottom: 4,
		borderRadius: 4,
		border: `1px solid ${isArch ? alpha(borderColor, 0.45) : borderColor}`,
		background: theme.palette.background.paper,
		cursor: isDragging ? "grabbing" : "grab",
		opacity: isDragging ? 0.45 : 0.92,
		userSelect: "none",
	};

	return (
		<div
			ref={ref}
			data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.paletteItem}
			onClick={onArchClick}
			onDoubleClick={onDoubleClickAdd}
			title={
				isArch
					? `Щёлкните — выбрать на холсте; перетащите или дважды щёлкните — добавить «${preset.title}»`
					: `Перетащите или дважды щёлкните — ${preset.title}`
			}
			style={rootStyle}
		>
			<DragIndicatorIcon
				fontSize="small"
				sx={{ color: "text.secondary", flexShrink: 0, pointerEvents: "none" }}
			/>
			<span
				style={{
					flex: 1,
					minWidth: 0,
					fontSize: "0.875rem",
					lineHeight: 1.43,
					color: archColor,
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
					pointerEvents: "none",
				}}
			>
				{preset.title}
			</span>
		</div>
	);
}

function SchemaCanvasFieldRow({
	node,
	depth,
	isDragging,
	isOpen,
	isDropTarget,
	hasChild,
	onToggle,
}: {
	node: NodeModel<SchemaCanvasNodeData>;
	depth: number;
	isDragging: boolean;
	isOpen: boolean;
	isDropTarget: boolean;
	hasChild: boolean;
	onToggle: () => void;
}) {
	const theme = useTheme();
	const {
		jsonSchema,
		uiSchema,
		selectedPointer,
		setSelectedPointer,
		setUiSchema,
		handleDeleteField,
	} = useSchemaEditor();

	if (node.data?.kind === "array-items-section") {
		return (
			<Box
				sx={{
					pl: `${depth * DEPTH_INDENT_PX}px`,
					py: 0.5,
					pr: 1,
				}}
			>
				<Typography variant="caption" color="text.secondary" fontWeight={600}>
					{node.text}
				</Typography>
			</Box>
		);
	}

	const fieldPointer = node.data?.fieldPointer ?? String(node.id);
	const fieldKey = node.data?.fieldKey ?? "";
	const segs = pointerSegments(fieldPointer);
	const schemaNode = resolveSchemaNode(jsonSchema, segs);
	const selected = selectedPointer === fieldPointer;
	const isGroup = isObjectFieldGroup(schemaNode);
	const arrayItemsObj = isGroup ? undefined : getObjectItemsSchema(schemaNode);
	const childKeys = isGroup
		? listOrderedChildKeys(jsonSchema, fieldPointer, uiSchema)
		: [];
	const itemFieldKeys = arrayItemsObj
		? listOrderedChildKeys(jsonSchema, `${fieldPointer}/items`, uiSchema)
		: [];

	const typeLabel =
		typeof schemaNode?.type === "string"
			? schemaNode.type
			: Array.isArray(schemaNode?.type)
				? schemaNode.type.join(" | ")
				: "?";

	const uiBranch = readUiSchemaBranchAtPointer(uiSchema, fieldPointer);
	const uiWidget =
		typeof uiBranch?.["ui:widget"] === "string" ? uiBranch["ui:widget"] : "";
	const isGeneralUncertainty =
		uiWidget === "GeneralUncertaintyWidget" ||
		uiWidget === "V2UncertaintyModalWidget";
	const uiOptions =
		uiBranch?.["ui:options"] &&
		typeof uiBranch["ui:options"] === "object" &&
		!Array.isArray(uiBranch["ui:options"])
			? (uiBranch["ui:options"] as Record<string, unknown>)
			: undefined;
	const isLayoutGroup = uiOptions?.layoutGroup === true;
	const sectionUiOptions = readV2AnketaSectionUiOptions(uiBranch);
	const groupInactive =
		isGroup &&
		sectionUiOptions.groupActivatable &&
		sectionUiOptions.groupActive === false;
	const archComponent = resolveV2AnketaArchComponent(uiBranch);
	const canvasUiKind = resolveV2AnketaCanvasUiKind(uiBranch);
	const canvasUiColor =
		canvasUiKind === "hidden"
			? CANVAS_HIDDEN_CHIP_COLOR
			: canvasUiKind === "utility"
				? CANVAS_UTILITY_CHIP_COLOR
				: undefined;

	const showExpand = hasChild && node.data?.kind === "field";

	return (
		<Box
			data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.canvasFieldRow}
			onClick={() => setSelectedPointer(fieldPointer)}
			sx={{
				display: "flex",
				alignItems: "flex-start",
				gap: 0.5,
				ml: `${depth * DEPTH_INDENT_PX}px`,
				mr: 1,
				my: 0.5,
				p: 1,
				borderRadius: 1,
				border: 2,
				borderStyle: "solid",
				borderColor: isDropTarget
					? theme.palette.primary.main
					: selected
						? "primary.main"
						: "divider",
				bgcolor: isDropTarget
					? alpha(theme.palette.primary.main, 0.14)
					: selected
						? alpha(theme.palette.primary.main, 0.08)
						: canvasUiColor
							? alpha(canvasUiColor, 0.08)
							: isGroup
								? alpha(theme.palette.info.main, 0.03)
								: "background.paper",
				boxShadow: isDragging ? 3 : 0,
				opacity: isDragging ? 0.55 : groupInactive ? 0.55 : 1,
				cursor: "grab",
			}}
		>
			{showExpand ? (
				<IconButton
					size="small"
					sx={{ mt: -0.25, flexShrink: 0 }}
					onClick={(e) => {
						e.stopPropagation();
						onToggle();
					}}
					aria-label={isOpen ? "Свернуть" : "Развернуть"}
					title={isOpen ? "Свернуть" : "Развернуть"}
				>
					<ChevronRightIcon
						fontSize="small"
						sx={{
							transform: isOpen ? "rotate(90deg)" : "none",
							transition: "transform 0.15s ease",
						}}
					/>
				</IconButton>
			) : (
				<Box sx={{ width: 28, flexShrink: 0 }} />
			)}
			<Box sx={{ flex: 1, minWidth: 0 }}>
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						flexWrap: "wrap",
						gap: 0.75,
					}}
				>
					{isLayoutGroup ? (
						<GridViewIcon sx={{ fontSize: 16, color: "secondary.main" }} />
					) : isGroup || arrayItemsObj ? (
						<FolderOutlinedIcon sx={{ fontSize: 16, color: "info.main" }} />
					) : null}
					<Typography variant="body2" fontWeight={selected ? 600 : 500}>
						{node.text}
					</Typography>
					<Chip
						size="small"
						label={
							isLayoutGroup
								? "разметка"
								: isGeneralUncertainty
									? "неопределённость"
									: ruSchemaTypeLabel(typeLabel)
						}
						variant="outlined"
						sx={{ height: 20 }}
					/>
					{archComponent ? <ArchComponentChip arch={archComponent} /> : null}
					{canvasUiKind ? <CanvasUiKindChip kind={canvasUiKind} /> : null}
					{isGroup ? (
						<Chip
							size="small"
							label={`${childKeys.length} полей`}
							variant="outlined"
							sx={{ height: 20 }}
						/>
					) : null}
					{groupInactive ? (
						<Chip
							size="small"
							label="неактивна"
							variant="outlined"
							color="warning"
							sx={{ height: 20 }}
						/>
					) : null}
					{arrayItemsObj ? (
						<Chip
							size="small"
							label={`${itemFieldKeys.length} полей элемента`}
							variant="outlined"
							sx={{ height: 20 }}
						/>
					) : null}
				</Box>
				<Typography
					variant="caption"
					color="text.secondary"
					fontFamily="monospace"
				>
					{fieldKey}
				</Typography>
			</Box>
			{sectionUiOptions.groupActivatable ? (
				<IconButton
					size="small"
					color={groupInactive ? "primary" : "default"}
					title={
						groupInactive
							? "Активировать группу по умолчанию"
							: "Деактивировать группу по умолчанию"
					}
					aria-label={
						groupInactive
							? "Активировать группу по умолчанию"
							: "Деактивировать группу по умолчанию"
					}
					tabIndex={selected ? 0 : -1}
					onClick={(e) => {
						e.stopPropagation();
						setUiSchema(
							(prev) =>
								patchUiOptionsAtPointer(
									prev as Record<string, unknown>,
									fieldPointer,
									{ groupActive: groupInactive },
								) as typeof prev,
						);
					}}
					sx={{ flexShrink: 0 }}
				>
					<PowerSettingsNewIcon fontSize="small" />
				</IconButton>
			) : null}
			<IconButton
				size="small"
				color="error"
				title="Удалить поле"
				aria-label="Удалить поле"
				tabIndex={selected ? 0 : -1}
				onClick={(e) => {
					e.stopPropagation();
					handleDeleteField(fieldPointer);
				}}
				sx={{ flexShrink: 0 }}
			>
				<DeleteOutlineIcon fontSize="small" />
			</IconButton>
		</Box>
	);
}

function PalettePresetRow({ preset }: { preset: PalettePreset }) {
	const {
		handleAddFieldPresetAtParent,
		jsonSchema,
		uiSchema,
		setSelectedPointer,
	} = useSchemaEditor();
	const rootCount = listOrderedChildKeys(jsonSchema, "/", uiSchema).length;
	const isArch = preset.section === "arch" || preset.section === "works";
	const archType = isArch ? (preset.chipLabel as V2ArchComponentType) : null;
	const archColor = archType ? ARCH_COMPONENT_CHIP_COLORS[archType] : undefined;

	return (
		<PaletteItem
			preset={preset}
			isArch={isArch}
			archColor={archColor}
			onArchClick={
				archType
					? () => {
							const pointer = findPointerByArchComponent(
								jsonSchema,
								uiSchema,
								archType,
							);
							if (pointer) setSelectedPointer(pointer);
						}
					: undefined
			}
			onDoubleClickAdd={() =>
				handleAddFieldPresetAtParent(
					"/",
					preset.make(),
					rootCount,
					preset.uiOptions,
					preset.uiBranch,
				)
			}
		/>
	);
}

export function SchemaPalettePanel({
	embedded = false,
}: {
	embedded?: boolean;
}) {
	return (
		<PanelChrome
			embedded={embedded}
			dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.palette}
			description="Перетащите на холст или дважды щёлкните для добавления в корень схемы."
		>
			<Typography
				variant="caption"
				color="text.secondary"
				sx={{ display: "block", mb: 0.75, fontWeight: 600 }}
			>
				Примитивные типы
			</Typography>
			{FIELD_PRESETS.map((preset) => (
				<PalettePresetRow key={String(preset.id)} preset={preset} />
			))}
			<Typography
				variant="caption"
				color="text.secondary"
				sx={{ display: "block", mt: 1.5, mb: 0.75, fontWeight: 600 }}
			>
				Разметка
			</Typography>
			{LAYOUT_PRESETS.map((preset) => (
				<PalettePresetRow key={String(preset.id)} preset={preset} />
			))}
			<Typography
				variant="caption"
				color="text.secondary"
				sx={{ display: "block", mt: 1.5, mb: 0.75, fontWeight: 600 }}
			>
				Расчёты
			</Typography>
			{CALCULATION_FIELD_PRESETS.map((preset) => (
				<PalettePresetRow key={String(preset.id)} preset={preset} />
			))}
			<Typography
				variant="caption"
				color="text.secondary"
				sx={{ display: "block", mt: 1.5, mb: 0.75, fontWeight: 600 }}
			>
				Арх. компоненты
			</Typography>
			{ARCH_COMPONENT_PRESETS.map((preset) => (
				<PalettePresetRow key={String(preset.id)} preset={preset} />
			))}
			<Typography
				variant="caption"
				color="text.secondary"
				sx={{ display: "block", mt: 1.5, mb: 0.75, fontWeight: 600 }}
			>
				Работы
			</Typography>
			{WORK_COMPONENT_PRESETS.map((preset) => (
				<PalettePresetRow key={String(preset.id)} preset={preset} />
			))}
		</PanelChrome>
	);
}

export function SchemaCanvasPanel({
	embedded = false,
}: {
	embedded?: boolean;
}) {
	const {
		jsonSchema,
		uiSchema,
		applyGroupFieldOrders,
		handleAddFieldPresetAtParent,
	} = useSchemaEditor();
	const initialOrdersRef = useRef<Record<string, string[]>>({});

	const presetById = useMemo(
		() =>
			new Map(
				[
					...FIELD_PRESETS,
					...LAYOUT_PRESETS,
					...CALCULATION_FIELD_PRESETS,
					...ARCH_COMPONENT_PRESETS,
					...WORK_COMPONENT_PRESETS,
				].map((preset) => [String(preset.id), preset]),
			),
		[],
	);

	const treeData = useMemo(
		() => buildSchemaCanvasTree(jsonSchema, uiSchema),
		[jsonSchema, uiSchema],
	);

	const handleDragStart = useCallback(() => {
		initialOrdersRef.current = collectGroupOrders(jsonSchema, uiSchema);
	}, [jsonSchema, uiSchema]);

	const handleDrop = useCallback(
		(
			newTree: NodeModel<SchemaCanvasNodeData>[],
			options: DropOptions<SchemaCanvasNodeData>,
		) => {
			if (options.monitor.getItemType() === PALETTE_DRAG_TYPE) {
				const presetId = getPresetIdFromPaletteDragSource(
					options.monitor.getItem(),
				);
				if (!presetId) return;
				const preset = presetById.get(presetId);
				if (!preset) return;
				const { parentPointer, index } = resolvePaletteDropTarget(options);
				handleAddFieldPresetAtParent(
					parentPointer,
					preset.make(),
					index,
					preset.uiOptions,
					preset.uiBranch,
				);
				return;
			}

			const finalOrders = treeToGroupOrders(newTree);
			applyGroupFieldOrders(finalOrders, initialOrdersRef.current);
		},
		[applyGroupFieldOrders, handleAddFieldPresetAtParent, presetById],
	);

	const canDrop = useCallback(
		(
			_tree: NodeModel<SchemaCanvasNodeData>[],
			{
				dragSource,
				dropTarget,
				dropTargetId,
			}: DropOptions<SchemaCanvasNodeData>,
		) => {
			if (dragSource?.data?.kind === "array-items-section") {
				return false;
			}

			if (isPaletteDragSource(dragSource)) {
				if (dropTargetId === SCHEMA_CANVAS_ROOT_ID) return true;
				if (dropTarget?.droppable) return true;
				if (dropTarget?.data?.kind === "field") return true;
				return false;
			}

			if (!dragSource) {
				if (dropTargetId === SCHEMA_CANVAS_ROOT_ID) return true;
				return dropTarget?.droppable === true;
			}

			if (dragSource.parent === dropTargetId) return true;
			if (dropTargetId === SCHEMA_CANVAS_ROOT_ID) return true;
			if (dropTarget?.droppable) return true;
			if (dropTarget?.data?.kind === "field") return true;

			return undefined;
		},
		[],
	);

	const canDrag = useCallback((node?: NodeModel<SchemaCanvasNodeData>) => {
		return node?.data?.kind === "field";
	}, []);

	const theme = useTheme();

	return (
		<PanelChrome
			embedded={embedded}
			dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.canvas}
			title="Холст полей"
			description="Корневые поля, группы и поля элементов массива. Перетаскивайте для изменения порядка."
		>
			<Box
				sx={{
					flex: 1,
					minHeight: 0,
					overflow: "auto",
					px: 0.5,
					py: 0.5,
					height: "100%",
					[`& .${CANVAS_TREE_ROOT_CLASS}`]: {
						listStyle: "none",
						m: 0,
						p: 1,
						minHeight: 72,
						boxSizing: "border-box",
						height: "100%",
					},
					[`& [role="listitem"].${CANVAS_TREE_DROP_TARGET_CLASS}`]: {
						borderRadius: 1,
						bgcolor: alpha(theme.palette.primary.main, 0.1),
						outline: `2px solid ${alpha(theme.palette.primary.main, 0.4)}`,
					},
					[`& [role="listitem"].${CANVAS_TREE_DRAGGING_CLASS}`]: {
						opacity: 0.45,
					},
					[`& .${CANVAS_TREE_PLACEHOLDER_CLASS}`]: {
						listStyle: "none",
					},
				}}
			>
				<Tree<SchemaCanvasNodeData>
					tree={treeData}
					rootId={SCHEMA_CANVAS_ROOT_ID}
					extraAcceptTypes={[PALETTE_DRAG_TYPE]}
					sort={false}
					insertDroppableFirst={false}
					initialOpen
					dropTargetOffset={5}
					rootProps={{
						style: {
							minHeight: 72,
							width: "100%",
						},
					}}
					onDragStart={handleDragStart}
					onDrop={handleDrop}
					canDrop={canDrop}
					canDrag={canDrag}
					placeholderRender={(node, { depth }) => (
						<SchemaCanvasPlaceholder node={node} depth={depth} />
					)}
					dragPreviewRender={(monitorProps) => (
						<Box
							sx={{
								display: "inline-flex",
								px: 1.25,
								py: 0.75,
								borderRadius: 1,
								border: 1,
								borderColor: "primary.main",
								bgcolor: "background.paper",
								boxShadow: 3,
								fontSize: "0.875rem",
								fontWeight: 600,
								maxWidth: 240,
							}}
						>
							{monitorProps.item.text}
						</Box>
					)}
					classes={{
						root: CANVAS_TREE_ROOT_CLASS,
						dropTarget: CANVAS_TREE_DROP_TARGET_CLASS,
						draggingSource: CANVAS_TREE_DRAGGING_CLASS,
						placeholder: CANVAS_TREE_PLACEHOLDER_CLASS,
					}}
					render={(
						node,
						{ depth, isDragging, isOpen, isDropTarget, hasChild, onToggle },
					) => (
						<SchemaCanvasFieldRow
							node={node}
							depth={depth}
							isDragging={isDragging}
							isOpen={isOpen}
							isDropTarget={isDropTarget}
							hasChild={hasChild}
							onToggle={onToggle}
						/>
					)}
				/>
				{treeData.length === 0 ? (
					<Box
						data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.canvasDropZone}
						sx={{
							py: 2,
							px: 1,
							textAlign: "center",
							borderRadius: 1,
							border: 1,
							borderStyle: "dashed",
							borderColor: "divider",
							color: "text.secondary",
							position: "absolute",
							top: 0,
							right: 0,
							bottom: 0,
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							height: "100%",
							pointerEvents: "none",
							width: `calc(100% - ${250}px)`,
						}}
					>
						<Typography variant="caption">Перетащите поле сюда</Typography>
					</Box>
				) : null}
			</Box>
		</PanelChrome>
	);
}
