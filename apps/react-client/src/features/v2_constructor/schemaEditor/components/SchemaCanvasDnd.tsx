import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { useDraggable, useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import type { ReactNode } from "react";
import {
	isObjectFieldGroup,
	resolveSchemaNode,
} from "../../utils/schemaMutators";
import { pointerSegments } from "../../utils/schemaPaths";
import { FIELD_PRESETS, ruSchemaTypeLabel } from "../constants";
import { useSchemaEditor } from "../SchemaEditorContext";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import { PanelChrome } from "./PanelChrome";
import {
	CANVAS_ZONE_TYPE,
	FIELD_DRAG_TYPE,
	PALETTE_DRAG_TYPE,
	type FieldDragData,
	type PaletteDragData,
	dropAppendId,
	fieldSortableId,
	groupIdFromParentPointer,
	useSchemaEditorDnd,
} from "./SchemaEditorDndProvider";

function PaletteItem({ preset }: { preset: (typeof FIELD_PRESETS)[number] }) {
	const { handleAddFieldPreset } = useSchemaEditor();
	const { ref, isDragging } = useDraggable<PaletteDragData>({
		id: `palette-${preset.id}`,
		type: PALETTE_DRAG_TYPE,
		data: { type: PALETTE_DRAG_TYPE, presetId: String(preset.id) },
	});

	return (
		<Box
			ref={ref}
			data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.paletteItem}
			onDoubleClick={() => handleAddFieldPreset(preset.make())}
			sx={{
				display: "flex",
				alignItems: "center",
				gap: 1,
				px: 1,
				py: 0.75,
				mb: 0.5,
				borderRadius: 1,
				border: 1,
				borderColor: "divider",
				bgcolor: isDragging ? "action.selected" : "background.paper",
				cursor: "grab",
				opacity: isDragging ? 0.5 : 1,
				"&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
			}}
		>
			<Typography variant="body2" sx={{ flex: 1 }}>
				{preset.title}
			</Typography>
			<Chip size="small" label={String(preset.id)} variant="outlined" sx={{ height: 20 }} />
		</Box>
	);
}

/** Вертикальный зазор между строками холста (padding слота × 2). */
const FIELD_ROW_SLOT_PY = 0.75;

function FieldRowSlot({
	children,
	showInsertLine,
}: {
	children: ReactNode;
	showInsertLine?: boolean;
}) {
	return (
		<Box
			sx={{
				position: "relative",
				pt: FIELD_ROW_SLOT_PY,
				pb: FIELD_ROW_SLOT_PY,
			}}
		>
			{showInsertLine ? <DropInsertionLine /> : null}
			{children}
		</Box>
	);
}

/** Не участвует в потоке — без скачков layout при DnD. */
function DropInsertionLine() {
	const theme = useTheme();

	return (
		<Box
			role="presentation"
			aria-hidden
			sx={{
				position: "absolute",
				left: 8,
				right: 8,
				top: 0,
				height: 0,
				zIndex: 2,
				pointerEvents: "none",
				transform: "translateY(-50%)",
				"&::before": {
					content: '""',
					position: "absolute",
					left: 0,
					right: 0,
					top: 0,
					height: 3,
					borderRadius: 2,
					bgcolor: theme.palette.primary.main,
					boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.35)}`,
				},
				"&::after": {
					content: '""',
					position: "absolute",
					left: -2,
					top: -5,
					width: 10,
					height: 10,
					borderRadius: "50%",
					bgcolor: theme.palette.primary.main,
					border: `2px solid ${theme.palette.background.paper}`,
				},
			}}
		/>
	);
}

function CanvasDropZone({ groupId, label }: { groupId: string; label: string }) {
	const { ref, isDropTarget } = useDroppable({
		id: dropAppendId(groupId),
		type: CANVAS_ZONE_TYPE,
	});

	return (
		<Box
			ref={ref}
			data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.canvasDropZone}
			sx={{
				py: 1,
				px: 1,
				textAlign: "center",
				borderRadius: 1,
				border: 1,
				borderStyle: "dashed",
				borderColor: isDropTarget ? "primary.light" : "divider",
				color: "text.secondary",
				opacity: isDropTarget ? 1 : 0.85,
			}}
		>
			<Typography variant="caption">{label}</Typography>
		</Box>
	);
}

function SortableFieldRow({
	fieldKey,
	fieldPointer,
	parentPointer,
	index,
	depth,
}: {
	fieldKey: string;
	fieldPointer: string;
	parentPointer: string;
	index: number;
	depth: number;
}) {
	const theme = useTheme();
	const { displayOrders } = useSchemaEditorDnd();
	const { jsonSchema, selectedPointer, setSelectedPointer, handleDeleteField } =
		useSchemaEditor();

	const segs = pointerSegments(fieldPointer);
	const node = resolveSchemaNode(jsonSchema, segs);
	const selected = selectedPointer === fieldPointer;
	const isGroup = isObjectFieldGroup(node);

	const childGroupId = groupIdFromParentPointer(fieldPointer);
	const childKeys = isGroup
		? (displayOrders[childGroupId] ??
			Object.keys((node?.properties ?? {}) as Record<string, unknown>))
		: [];

	const { ref, handleRef, isDragging } = useSortable<FieldDragData>({
		id: fieldSortableId(fieldPointer),
		index,
		group: groupIdFromParentPointer(parentPointer),
		type: FIELD_DRAG_TYPE,
		data: { type: FIELD_DRAG_TYPE, key: fieldKey, parentPointer, index },
	});

	const typeLabel =
		typeof node?.type === "string"
			? node.type
			: Array.isArray(node?.type)
				? node.type.join(" | ")
				: "?";

	return (
		<Box sx={{ pl: depth > 0 ? 1.5 : 0 }}>
			<Box
				ref={ref}
				data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.canvasFieldRow}
				onClick={() => setSelectedPointer(fieldPointer)}
				sx={{
					display: "flex",
					alignItems: "flex-start",
					gap: 0.5,
					p: 1,
					borderRadius: 1,
					border: 1,
					borderColor: selected ? "primary.main" : "divider",
					bgcolor: selected
						? alpha(theme.palette.primary.main, 0.08)
						: isGroup
							? alpha(theme.palette.info.main, 0.03)
							: "background.paper",
					boxShadow: isDragging ? 3 : 0,
					opacity: isDragging ? 0.45 : 1,
					cursor: "pointer",
					transition: theme.transitions.create(
						["border-color", "background-color", "box-shadow", "opacity"],
						{ duration: 150 },
					),
				}}
			>
				<IconButton
					ref={handleRef}
					size="small"
					sx={{ cursor: "grab", mt: -0.25 }}
					onClick={(e) => e.stopPropagation()}
					aria-label="Перетащить"
				>
					<DragIndicatorIcon fontSize="small" />
				</IconButton>
				<Box sx={{ flex: 1, minWidth: 0 }}>
					<Box
						sx={{
							display: "flex",
							alignItems: "center",
							flexWrap: "wrap",
							gap: 0.75,
						}}
					>
						{isGroup ? (
							<FolderOutlinedIcon sx={{ fontSize: 16, color: "info.main" }} />
						) : null}
						<Typography variant="body2" fontWeight={selected ? 600 : 500}>
							{typeof node?.title === "string" ? node.title : fieldKey}
						</Typography>
						<Chip
							size="small"
							label={ruSchemaTypeLabel(typeLabel)}
							variant="outlined"
							sx={{ height: 20 }}
						/>
						{isGroup ? (
							<Chip
								size="small"
								label={`${childKeys.length} полей`}
								variant="outlined"
								sx={{ height: 20 }}
							/>
						) : null}
					</Box>
					<Typography variant="caption" color="text.secondary" fontFamily="monospace">
						{fieldKey}
					</Typography>
				</Box>
				<Box
					sx={{
						width: 34,
						flexShrink: 0,
						display: "flex",
						alignItems: "flex-start",
						justifyContent: "center",
					}}
				>
					<IconButton
						size="small"
						color="error"
						title="Удалить поле"
						aria-label="Удалить поле"
						tabIndex={selected ? 0 : -1}
						sx={{
							visibility: selected ? "visible" : "hidden",
							pointerEvents: selected ? "auto" : "none",
						}}
						onClick={(e) => {
							e.stopPropagation();
							handleDeleteField();
						}}
					>
						<DeleteOutlineIcon fontSize="small" />
					</IconButton>
				</Box>
			</Box>

			{isGroup ? (
				<Box
					sx={{
						mt: 1,
						ml: 2,
						pl: 1,
						borderLeft: 2,
						borderColor: selected ? "primary.light" : "divider",
					}}
				>
					<FieldList
						parentPointer={fieldPointer}
						depth={depth + 1}
						emptyLabel="Перетащите поле в группу"
					/>
				</Box>
			) : null}
		</Box>
	);
}

function FieldList({
	parentPointer,
	depth,
	emptyLabel,
}: {
	parentPointer: string;
	depth: number;
	emptyLabel: string;
}) {
	const { displayOrders, insertIndicator, isDragging } = useSchemaEditorDnd();
	const groupId = groupIdFromParentPointer(parentPointer);
	const keys = displayOrders[groupId] ?? [];
	const showIndicator = isDragging && insertIndicator?.groupId === groupId;

	return (
		<>
			{keys.map((key, index) => {
				const fieldPointer =
					parentPointer === "/" ? `/${key}` : `${parentPointer}/${key}`;
				return (
					<FieldRowSlot
						key={fieldPointer}
						showInsertLine={Boolean(
							showIndicator && insertIndicator!.index === index,
						)}
					>
						<SortableFieldRow
							fieldKey={key}
							fieldPointer={fieldPointer}
							parentPointer={parentPointer}
							index={index}
							depth={depth}
						/>
					</FieldRowSlot>
				);
			})}
			<FieldRowSlot
				showInsertLine={Boolean(
					showIndicator && insertIndicator!.index >= keys.length,
				)}
			>
				<CanvasDropZone groupId={groupId} label={emptyLabel} />
			</FieldRowSlot>
		</>
	);
}

export function SchemaPalettePanel({ embedded = false }: { embedded?: boolean }) {
	return (
		<PanelChrome
			embedded={embedded}
			dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.palette}
			description="Перетащите на холст или дважды щёлкните для добавления в корень схемы."
		>
			{FIELD_PRESETS.map((preset) => (
				<PaletteItem key={String(preset.id)} preset={preset} />
			))}
		</PanelChrome>
	);
}

export function SchemaCanvasPanel({ embedded = false }: { embedded?: boolean }) {
	return (
		<PanelChrome
			embedded={embedded}
			dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.canvas}
			title="Холст полей"
			description="Корневые поля и вложенные группы. Перетаскивайте для изменения порядка."
		>
			<FieldList
				parentPointer="/"
				depth={0}
				emptyLabel="Перетащите поле сюда"
			/>
		</PanelChrome>
	);
}
