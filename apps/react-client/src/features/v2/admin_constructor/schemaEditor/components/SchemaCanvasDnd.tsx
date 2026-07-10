import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import GridViewIcon from "@mui/icons-material/GridView";
import RedoIcon from "@mui/icons-material/Redo";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UndoIcon from "@mui/icons-material/Undo";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import {
	Tree,
	type DropOptions,
	type NodeModel,
	type TreeMethods,
} from "@minoru/react-dnd-treeview";
import { useSchemaConstructorSettings } from "@react-client/common/settings/schemaConstructorSettings";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
} from "react";
import { useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import {
	readV2AnketaSectionUiOptions,
	resolveV2AnketaArchComponent,
	resolveV2AnketaCanvasUiKind,
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
	CANVAS_SYSTEM_CHIP_COLOR,
	CANVAS_UTILITY_CHIP_COLOR,
	resolveCanvasTypeChipColor,
	FIELD_PRESETS,
	LAYOUT_PRESETS,
	WORK_COMPONENT_PRESETS,
	type PalettePreset,
} from "../constants";
import {
	resolveCanvasCategoryChips,
	resolveCanvasFieldTypeChipLabel,
	type CanvasCategoryChip as CanvasCategoryChipModel,
} from "../propertiesFieldKind";
import { useParams } from "react-router";
import { useV2TypicalWorksList } from "@react-client/common/api/queries/v2-works";
import { resolveEffectiveBoundWorkIds } from "../typicalWorkBlockBinding";
import { useSchemaEditor } from "../SchemaEditorContext";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import { PanelChrome } from "./PanelChrome";
import { SchemaCanvasFieldSearch } from "./SchemaCanvasFieldSearch";
import { SchemaCanvasPlaceholder } from "./SchemaCanvasPlaceholder";
import { isCanvasStockField } from "../canvasStockFields";
import {
	buildPaletteDragNode,
	buildSchemaCanvasTree,
	clampCanvasInsertIndex,
	getPresetIdFromPaletteDragSource,
	isCanvasSystemField,
	isPaletteDragSource,
	listCanvasEditableChildKeys,
	PALETTE_DRAG_TYPE,
	resolveCanvasDropTarget,
	SCHEMA_CANVAS_ROOT_ID,
	type SchemaCanvasNodeData,
} from "../schemaCanvasTree";

const DEPTH_INDENT_PX = 12;

type CanvasDeleteConfirmState = {
	pointer: string;
	label: string;
	hasChildren: boolean;
};
const CANVAS_TREE_DROP_TARGET_CLASS = "schema-canvas-tree-drop-target";
const CANVAS_TREE_DRAGGING_CLASS = "schema-canvas-tree-dragging";
const CANVAS_TREE_PLACEHOLDER_CLASS = "schema-canvas-tree-placeholder";
const CANVAS_TREE_ROOT_CLASS = "schema-canvas-tree-root";

function CanvasCategoryChipView({ chip }: { chip: CanvasCategoryChipModel }) {
	return (
		<Chip
			size="small"
			label={chip.label}
			title={chip.title}
			variant="filled"
			sx={{
				height: 20,
				bgcolor: alpha(chip.color, 0.12),
				color: chip.color,
				border: `1px solid ${alpha(chip.color, 0.35)}`,
				"& .MuiChip-label": { px: 0.75, fontSize: "0.65rem", fontWeight: 600 },
			}}
		/>
	);
}

const CANVAS_UI_KIND_LABELS: Record<V2AnketaCanvasUiKind, string> = {
	hidden: "Скрыто",
	utility: "Служебное",
	system: "Системное",
};

function CanvasUiKindChip({ kind }: { kind: V2AnketaCanvasUiKind }) {
	const color =
		kind === "hidden"
			? CANVAS_HIDDEN_CHIP_COLOR
			: kind === "system"
				? CANVAS_SYSTEM_CHIP_COLOR
				: CANVAS_UTILITY_CHIP_COLOR;
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

export function findPointerByArchComponent(
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
	onRequestDelete,
	typicalWorkNameById,
	allTypicalWorkIds,
}: {
	node: NodeModel<SchemaCanvasNodeData>;
	depth: number;
	isDragging: boolean;
	isOpen: boolean;
	isDropTarget: boolean;
	hasChild: boolean;
	onToggle: () => void;
	onRequestDelete: (state: CanvasDeleteConfirmState) => void;
	typicalWorkNameById: Map<string, string>;
	allTypicalWorkIds: string[];
}) {
	const theme = useTheme();
	const {
		jsonSchema,
		uiSchema,
		fieldChangeByPointer,
		selectedPointer,
		setSelectedPointer,
		setUiSchema,
		duplicateCanvasField,
	} = useSchemaEditor();

	if (node.data?.kind === "system-divider") {
		return (
			<Box
				data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.canvasSystemDivider}
				sx={{
					mx: 1,
					my: 1.5,
					display: "flex",
					flexDirection: "column",
					gap: 0.75,
				}}
			>
				<Divider />
				<Typography
					variant="caption"
					color="text.secondary"
					sx={{ px: 0.5, fontWeight: 600 }}
				>
					{node.text}
				</Typography>
			</Box>
		);
	}

	const fieldPointer = node.data?.fieldPointer ?? String(node.id);
	const fieldKey = node.data?.fieldKey ?? "";
	const isChanged = fieldChangeByPointer.has(fieldPointer);
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

	const uiBranch = readUiSchemaBranchAtPointer(uiSchema, fieldPointer);
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
	const canvasUiKind = resolveV2AnketaCanvasUiKind(uiBranch, { fieldPointer });
	const isSystemField = canvasUiKind === "system";
	const isStockField = isCanvasStockField(uiSchema, fieldPointer);
	const { label: typeChipLabel, colorKey: typeChipColorKey } =
		resolveCanvasFieldTypeChipLabel(schemaNode, uiBranch);
	const typeChipColor = resolveCanvasTypeChipColor(typeChipColorKey);
	const categoryChips = resolveCanvasCategoryChips(schemaNode, uiBranch, fieldKey);

	const canvasUiColor =
		canvasUiKind === "hidden"
			? CANVAS_HIDDEN_CHIP_COLOR
			: canvasUiKind === "system"
				? CANVAS_SYSTEM_CHIP_COLOR
				: canvasUiKind === "utility"
					? CANVAS_UTILITY_CHIP_COLOR
					: undefined;

	const showExpand = hasChild && node.data?.kind === "field";

	const typicalWorkTitleSuffix = useMemo(() => {
		if (sectionUiOptions.archComponent !== "typicalWork") return "";
		const ids = resolveEffectiveBoundWorkIds(
			uiSchema,
			fieldPointer,
			allTypicalWorkIds,
		);
		const names = [
			...new Set(
				ids
					.map((id) => typicalWorkNameById.get(id)?.trim())
					.filter((name): name is string => Boolean(name)),
			),
		];
		if (names.length === 0) return "";
		const preview = names.slice(0, 3).join(", ");
		return names.length > 3 ? `${preview}…` : preview;
	}, [
		sectionUiOptions.archComponent,
		uiSchema,
		fieldPointer,
		allTypicalWorkIds,
		typicalWorkNameById,
	]);

	const rowTitle =
		typicalWorkTitleSuffix
			? `${node.text} · ${typicalWorkTitleSuffix}`
			: node.text;

	return (
		<Box
			data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.canvasFieldRow}
			data-canvas-field-pointer={fieldPointer}
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
						: isChanged
							? theme.palette.warning.main
							: "divider",
				bgcolor: isDropTarget
					? alpha(theme.palette.primary.main, 0.14)
					: selected
						? alpha(theme.palette.primary.main, 0.08)
						: isChanged
							? alpha(theme.palette.warning.main, 0.12)
							: canvasUiColor
								? alpha(canvasUiColor, 0.08)
								: isGroup
									? alpha(theme.palette.info.main, 0.03)
									: "background.paper",
				boxShadow: isDragging ? 3 : 0,
				opacity: isDragging ? 0.55 : groupInactive ? 0.55 : 1,
				cursor: isSystemField ? "default" : "grab",
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
						{rowTitle}
					</Typography>
					<Chip
						size="small"
						label={typeChipLabel}
						variant="filled"
						sx={{
							height: 20,
							...(typeChipColor
								? {
										bgcolor: alpha(typeChipColor, 0.12),
										color: typeChipColor,
										border: `1px solid ${alpha(typeChipColor, 0.35)}`,
									}
								: {
										bgcolor: alpha(theme.palette.text.secondary, 0.08),
										color: "text.secondary",
										border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
									}),
							"& .MuiChip-label": {
								px: 0.75,
								fontSize: "0.65rem",
								fontWeight: 600,
							},
						}}
					/>
					{categoryChips.map((chip) => (
						<CanvasCategoryChipView key={chip.label} chip={chip} />
					))}
					{canvasUiKind ? <CanvasUiKindChip kind={canvasUiKind} /> : null}
					{isStockField ? (
						<Chip
							size="small"
							label="стоковое"
							variant="outlined"
							sx={{
								height: 20,
								"& .MuiChip-label": { px: 0.75, fontSize: "0.65rem" },
							}}
						/>
					) : null}
					{isChanged ? (
						<Chip
							size="small"
							label="изменено"
							variant="outlined"
							color="warning"
							sx={{
								height: 20,
								"& .MuiChip-label": { px: 0.75, fontSize: "0.65rem" },
							}}
						/>
					) : null}
					{isGroup ? (
						<Chip
							size="small"
							label={`${childKeys.length} полей`}
							variant="filled"
							sx={{
								height: 20,
								bgcolor: alpha(theme.palette.info.main, 0.1),
								color: "info.main",
								border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
								"& .MuiChip-label": { px: 0.75, fontSize: "0.65rem" },
							}}
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
							variant="filled"
							sx={{
								height: 20,
								bgcolor: alpha(theme.palette.warning.main, 0.1),
								color: "warning.dark",
								border: `1px solid ${alpha(theme.palette.warning.main, 0.35)}`,
								"& .MuiChip-label": { px: 0.75, fontSize: "0.65rem" },
							}}
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
			{!isSystemField && !isStockField ? (
				<>
					<IconButton
						size="small"
						title="Дублировать поле"
						aria-label="Дублировать поле"
						data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.canvasDuplicateField}
						tabIndex={selected ? 0 : -1}
						onClick={(e) => {
							e.stopPropagation();
							duplicateCanvasField(fieldPointer);
						}}
						sx={{ flexShrink: 0 }}
					>
						<ContentCopyIcon fontSize="small" />
					</IconButton>
					<IconButton
						size="small"
						color="error"
						title="Удалить поле"
						aria-label="Удалить поле"
						tabIndex={selected ? 0 : -1}
						onClick={(e) => {
							e.stopPropagation();
							onRequestDelete({
								pointer: fieldPointer,
								label: node.text,
								hasChildren: hasChild,
							});
						}}
						sx={{ flexShrink: 0 }}
					>
						<DeleteOutlineIcon fontSize="small" />
					</IconButton>
				</>
			) : null}
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
	const rootCount = listCanvasEditableChildKeys(jsonSchema, "/", uiSchema).length;
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
		handleAddFieldPresetAtParent,
		handleDeleteField,
		moveCanvasField,
		canUndoDraft,
		canRedoDraft,
		undoDraft,
		redoDraft,
	} = useSchemaEditor();
	const { hideSystemFields } = useSchemaConstructorSettings();
	const { templateId = "" } = useParams<{ templateId: string }>();
	const { data: worksData } = useV2TypicalWorksList({ templateId });
	const typicalWorkNameById = useMemo(() => {
		const map = new Map<string, string>();
		for (const work of worksData?.items ?? []) {
			if (work.name?.trim()) map.set(work.id, work.name.trim());
		}
		return map;
	}, [worksData?.items]);
	const allTypicalWorkIds = useMemo(
		() => [...typicalWorkNameById.keys()],
		[typicalWorkNameById],
	);
	const treeRef = useRef<TreeMethods>(null);
	const [deleteConfirm, setDeleteConfirm] =
		useState<CanvasDeleteConfirmState | null>(null);

	const handleRequestDelete = useCallback((state: CanvasDeleteConfirmState) => {
		setDeleteConfirm(state);
	}, []);

	const handleConfirmDelete = useCallback(() => {
		if (!deleteConfirm) return;
		handleDeleteField(deleteConfirm.pointer);
		setDeleteConfirm(null);
	}, [deleteConfirm, handleDeleteField]);

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
		() =>
			buildSchemaCanvasTree(jsonSchema, uiSchema, {
				hideSystemFields,
			}),
		[jsonSchema, uiSchema, hideSystemFields],
	);

	const hasExpandableNodes = useMemo(
		() =>
			treeData.some((node) =>
				treeData.some((child) => child.parent === node.id),
			),
		[treeData],
	);

	const handleExpandAll = useCallback(() => {
		treeRef.current?.openAll();
	}, []);

	const handleCollapseAll = useCallback(() => {
		treeRef.current?.closeAll();
	}, []);

	const canvasToolbarActions = (
		<Box sx={{ display: "flex", gap: 0.5, flexShrink: 0, alignItems: "center" }}>
			<IconButton
				size="small"
				disabled={!canUndoDraft}
				onClick={undoDraft}
				data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.canvasUndo}
				aria-label="Отменить действие на холсте"
				title="Отменить"
			>
				<UndoIcon fontSize="small" />
			</IconButton>
			<IconButton
				size="small"
				disabled={!canRedoDraft}
				onClick={redoDraft}
				data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.canvasRedo}
				aria-label="Повторить действие на холсте"
				title="Повторить"
			>
				<RedoIcon fontSize="small" />
			</IconButton>
			<SchemaCanvasFieldSearch treeData={treeData} treeRef={treeRef} />
			<IconButton
				size="small"
				disabled={!hasExpandableNodes}
				onClick={handleExpandAll}
				data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.canvasExpandAll}
				aria-label="Раскрыть все группы на холсте"
				title="Раскрыть все"
			>
				<UnfoldMoreIcon fontSize="small" />
			</IconButton>
			<IconButton
				size="small"
				disabled={!hasExpandableNodes}
				onClick={handleCollapseAll}
				data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.canvasCollapseAll}
				aria-label="Свернуть все группы на холсте"
				title="Свернуть все"
			>
				<UnfoldLessIcon fontSize="small" />
			</IconButton>
		</Box>
	);

	const isSystemDropBlocked = useCallback(
		(dropTarget?: NodeModel<SchemaCanvasNodeData>) => {
			if (!dropTarget?.data) return false;
			if (dropTarget.data.kind === "system-divider") return true;
			if (dropTarget.data.kind !== "field") return false;
			return isCanvasSystemField(uiSchema, dropTarget.data.fieldPointer);
		},
		[uiSchema],
	);

	const handleDrop = useCallback(
		(
			_newTree: NodeModel<SchemaCanvasNodeData>[],
			options: DropOptions<SchemaCanvasNodeData>,
		) => {
			const { parentPointer, index: rawIndex } = resolveCanvasDropTarget(
				options,
				SCHEMA_CANVAS_ROOT_ID,
				jsonSchema,
			);
			const index = clampCanvasInsertIndex(
				jsonSchema,
				parentPointer,
				uiSchema,
				rawIndex,
			);

			if (options.monitor.getItemType() === PALETTE_DRAG_TYPE) {
				const presetId = getPresetIdFromPaletteDragSource(
					options.monitor.getItem(),
				);
				if (!presetId) return;
				const preset = presetById.get(presetId);
				if (!preset) return;
				handleAddFieldPresetAtParent(
					parentPointer,
					preset.make(),
					index,
					preset.uiOptions,
					preset.uiBranch,
				);
				return;
			}

			const dragSource = options.dragSource;
			if (dragSource?.data?.kind !== "field") return;
			if (isCanvasSystemField(uiSchema, dragSource.data.fieldPointer)) return;

			moveCanvasField(dragSource.data.fieldPointer, parentPointer, index);
		},
		[
			handleAddFieldPresetAtParent,
			jsonSchema,
			moveCanvasField,
			presetById,
			uiSchema,
		],
	);

	const canDrop = useCallback(
		(
			_tree: NodeModel<SchemaCanvasNodeData>[],
			options: DropOptions<SchemaCanvasNodeData>,
		) => {
			const { dragSource, dropTarget, dropTargetId } = options;

			if (
				dragSource?.data?.kind === "field" &&
				isCanvasSystemField(uiSchema, dragSource.data.fieldPointer)
			) {
				return false;
			}

			if (isSystemDropBlocked(dropTarget)) {
				return false;
			}

			const stockDrag =
				dragSource?.data?.kind === "field" &&
				isCanvasStockField(uiSchema, dragSource.data.fieldPointer);

			if (stockDrag) {
				const { parentPointer: targetParent } = resolveCanvasDropTarget(
					options,
					SCHEMA_CANVAS_ROOT_ID,
					jsonSchema,
				);
				return targetParent === dragSource.data?.parentPointer;
			}

			if (isPaletteDragSource(dragSource)) {
				if (dropTargetId === SCHEMA_CANVAS_ROOT_ID) return true;
				if (dropTarget?.droppable) return true;
				return false;
			}

			if (!dragSource) {
				if (dropTargetId === SCHEMA_CANVAS_ROOT_ID) return true;
				return dropTarget?.droppable === true;
			}

			if (dragSource.parent === dropTargetId) return true;
			if (dropTargetId === SCHEMA_CANVAS_ROOT_ID) return true;
			if (dropTarget?.droppable) return true;

			return undefined;
		},
		[isSystemDropBlocked, jsonSchema, uiSchema],
	);

	const canDrag = useCallback(
		(node?: NodeModel<SchemaCanvasNodeData>) => {
			if (node?.data?.kind !== "field") return false;
			return !isCanvasSystemField(uiSchema, node.data.fieldPointer);
		},
		[uiSchema],
	);

	const theme = useTheme();

	return (
		<PanelChrome
			embedded={embedded}
			dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.canvas}
			title="Холст полей"
			description="Корневые поля, группы и поля элементов массива. Перетаскивайте для изменения порядка."
			actions={embedded ? undefined : canvasToolbarActions}
		>
			<Box
				sx={{
					display: "flex",
					flexDirection: "column",
					flex: 1,
					minHeight: 0,
					height: "100%",
				}}
			>
				{embedded ? (
					<Box
						sx={{
							display: "flex",
							justifyContent: "flex-end",
							px: 0.5,
							pt: 0.5,
							pb: 0.25,
							flexShrink: 0,
						}}
					>
						{canvasToolbarActions}
					</Box>
				) : null}
				<Box
					sx={{
						flex: 1,
						minHeight: 0,
						overflow: "auto",
						px: 0.5,
						py: 0.5,
						position: "relative",
					[`& .${CANVAS_TREE_ROOT_CLASS}, & .${CANVAS_TREE_ROOT_CLASS} ul`]:
						{
							listStyle: "none",
							m: 0,
							p: 0,
						},
					[`& .${CANVAS_TREE_ROOT_CLASS}`]: {
						p: 1,
						minHeight: 72,
						boxSizing: "border-box",
						height: "100%",
					},
					[`& .${CANVAS_TREE_ROOT_CLASS} li, & [role="listitem"]`]: {
						listStyle: "none",
						"&::marker": { display: "none" },
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
						"&::marker": { display: "none" },
					},
				}}
			>
				<Tree<SchemaCanvasNodeData>
					ref={treeRef}
					tree={treeData}
					rootId={SCHEMA_CANVAS_ROOT_ID}
					listComponent="div"
					listItemComponent="div"
					placeholderComponent="div"
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
							onRequestDelete={handleRequestDelete}
							typicalWorkNameById={typicalWorkNameById}
							allTypicalWorkIds={allTypicalWorkIds}
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
							inset: 0,
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							pointerEvents: "none",
						}}
					>
						<Typography variant="caption">Перетащите поле сюда</Typography>
					</Box>
				) : null}
				</Box>
			</Box>
			<Dialog
				open={deleteConfirm !== null}
				onClose={() => setDeleteConfirm(null)}
				maxWidth="xs"
				fullWidth
				data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.canvasDeleteConfirm}
			>
				<DialogTitle>Удалить поле?</DialogTitle>
				<DialogContent>
					<Typography variant="body2">
						Поле «{deleteConfirm?.label}» будет удалено из схемы.
						{deleteConfirm?.hasChildren
							? " Вместе с ним удалятся все вложенные поля."
							: null}{" "}
						Связанные правила логики для этого поля и его потомков тоже будут
						удалены.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteConfirm(null)}>Отмена</Button>
					<Button
						variant="contained"
						color="error"
						data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.canvasDeleteConfirmSubmit}
						onClick={handleConfirmDelete}
					>
						Удалить
					</Button>
				</DialogActions>
			</Dialog>
		</PanelChrome>
	);
}
