import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import GridViewIcon from "@mui/icons-material/GridView";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { useDraggable, useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import type { ReactNode } from "react";
import {
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

function PaletteItem({ preset }: { preset: PalettePreset }) {
	const {
		handleAddFieldPresetAtParent,
		jsonSchema,
		uiSchema,
		setSelectedPointer,
	} = useSchemaEditor();
	const rootCount = listOrderedChildKeys(jsonSchema, "/", uiSchema).length;
	const { ref, isDragging } = useDraggable<PaletteDragData>({
		id: `palette-${preset.id}`,
		type: PALETTE_DRAG_TYPE,
		data: { type: PALETTE_DRAG_TYPE, presetId: String(preset.id) },
	});

	const isArch = preset.section === "arch" || preset.section === "works";
	const archType = isArch ? (preset.chipLabel as V2ArchComponentType) : null;
	const archColor = archType ? ARCH_COMPONENT_CHIP_COLORS[archType] : undefined;

	const handleArchClick = () => {
		if (!archType) return;
		const pointer = findPointerByArchComponent(jsonSchema, uiSchema, archType);
		if (pointer) {
			setSelectedPointer(pointer);
			return;
		}
	};

	return (
		<Box
			ref={ref}
			data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.paletteItem}
			onClick={isArch ? handleArchClick : undefined}
			onDoubleClick={() =>
				handleAddFieldPresetAtParent(
					"/",
					preset.make(),
					rootCount,
					preset.uiOptions,
					preset.uiBranch,
				)
			}
			title={
				isArch
					? `Щёлкните — выбрать на холсте; перетащите или дважды щёлкните — добавить «${preset.title}»`
					: `Перетащите или дважды щёлкните — ${preset.title}`
			}
			sx={{
				display: "flex",
				alignItems: "center",
				gap: 1,
				px: 1,
				py: 0.75,
				mb: 0.5,
				borderRadius: 1,
				border: 1,
				borderColor: isArch
					? alpha(archColor ?? "primary.main", 0.45)
					: "divider",
				bgcolor: isDragging ? "action.selected" : "background.paper",
				cursor: "grab",
				opacity: isDragging ? 0.5 : 1,
				"&:hover": {
					borderColor: isArch ? archColor : "primary.main",
					bgcolor: "action.hover",
				},
			}}
		>
			<Typography
				variant="body2"
				sx={{ flex: 1, minWidth: 0, color: archColor }}
			>
				{preset.title}
			</Typography>
			{/* <Chip
				size="small"
				label={
					isArch
						? (V2_ARCH_COMPONENT_LABELS[
								preset.chipLabel as keyof typeof V2_ARCH_COMPONENT_LABELS
							] ?? preset.chipLabel)
						: preset.chipLabel
				}
				variant={isArch ? "filled" : "outlined"}
				sx={{
					height: 20,
					maxWidth: 120,
					...(isArch && archColor
						? {
								bgcolor: alpha(archColor, 0.12),
								color: archColor,
								border: `1px solid ${alpha(archColor, 0.35)}`,
								"& .MuiChip-label": { px: 0.75, fontSize: "0.65rem" },
							}
						: {}),
				}}
			/> */}
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

function CanvasDropZone({
	groupId,
	label,
}: {
	groupId: string;
	label: string;
}) {
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
	const { isDragging: isCanvasDragging } = useSchemaEditorDnd();
	const {
		jsonSchema,
		uiSchema,
		selectedPointer,
		setSelectedPointer,
		handleDeleteField,
	} = useSchemaEditor();

	const segs = pointerSegments(fieldPointer);
	const node = resolveSchemaNode(jsonSchema, segs);
	const selected = selectedPointer === fieldPointer;
	const isGroup = isObjectFieldGroup(node);
	const arrayItemsObj = isGroup ? undefined : getObjectItemsSchema(node);

	const childKeys = isGroup
		? listOrderedChildKeys(jsonSchema, fieldPointer, uiSchema)
		: [];

	const itemFieldKeys = arrayItemsObj
		? listOrderedChildKeys(jsonSchema, `${fieldPointer}/items`, uiSchema)
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

	const hasNestedContent = isGroup || Boolean(arrayItemsObj);
	const uiBranch = readUiSchemaBranchAtPointer(uiSchema, fieldPointer);
	const uiWidget =
		typeof uiBranch?.["ui:widget"] === "string" ? uiBranch["ui:widget"] : "";
	const isGeneralUncertainty = uiWidget === "GeneralUncertaintyWidget";
	const uiOptions =
		uiBranch?.["ui:options"] &&
		typeof uiBranch["ui:options"] === "object" &&
		!Array.isArray(uiBranch["ui:options"])
			? (uiBranch["ui:options"] as Record<string, unknown>)
			: undefined;
	const isLayoutGroup = uiOptions?.layoutGroup === true;
	const archComponent = resolveV2AnketaArchComponent(uiBranch);
	const canvasUiKind = resolveV2AnketaCanvasUiKind(uiBranch);
	const canvasUiColor =
		canvasUiKind === "hidden"
			? CANVAS_HIDDEN_CHIP_COLOR
			: canvasUiKind === "utility"
				? CANVAS_UTILITY_CHIP_COLOR
				: undefined;
	const showDragging = isCanvasDragging && isDragging;

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
						: canvasUiColor
							? alpha(canvasUiColor, 0.08)
							: isGroup
								? alpha(theme.palette.info.main, 0.03)
								: "background.paper",
					boxShadow: showDragging ? 3 : 0,
					opacity: showDragging ? 0.45 : 1,
					cursor: "pointer",
					transition: theme.transitions.create(
						["border-color", "background-color", "box-shadow", "opacity"],
						{ duration: 150 },
					),
				}}
			>
				<Box sx={{ width: 28, flexShrink: 0 }} />
				<IconButton
					ref={handleRef}
					size="small"
					sx={{ cursor: "grab", mt: -0.25 }}
					onClick={(e) => e.stopPropagation()}
					aria-label="Перетащить"
					title="Перетащить"
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
						{isLayoutGroup ? (
							<GridViewIcon sx={{ fontSize: 16, color: "secondary.main" }} />
						) : isGroup || arrayItemsObj ? (
							<FolderOutlinedIcon sx={{ fontSize: 16, color: "info.main" }} />
						) : null}
						<Typography variant="body2" fontWeight={selected ? 600 : 500}>
							{typeof node?.title === "string" ? node.title : fieldKey}
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
						onClick={(e) => {
							e.stopPropagation();
							handleDeleteField(fieldPointer);
						}}
					>
						<DeleteOutlineIcon fontSize="small" />
					</IconButton>
				</Box>
			</Box>

			{hasNestedContent ? (
				<>
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
					{arrayItemsObj ? (
						<Box
							sx={{
								mt: isGroup ? 1.5 : 1,
								ml: 2,
								pl: 1,
								borderLeft: 2,
								borderColor: selected ? "primary.light" : "divider",
							}}
						>
							<Typography
								variant="caption"
								color="text.secondary"
								sx={{ display: "block", mb: 0.5 }}
							>
								Поля элемента массива
							</Typography>
							<FieldList
								parentPointer={`${fieldPointer}/items`}
								depth={depth + 1}
								emptyLabel="Перетащите поле в элемент массива"
							/>
						</Box>
					) : null}
				</>
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
	const { insertIndicator, isDragging } = useSchemaEditorDnd();
	const { jsonSchema, uiSchema } = useSchemaEditor();
	const groupId = groupIdFromParentPointer(parentPointer);
	const keys = listOrderedChildKeys(jsonSchema, parentPointer, uiSchema);
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
				<PaletteItem key={String(preset.id)} preset={preset} />
			))}
			<Typography
				variant="caption"
				color="text.secondary"
				sx={{ display: "block", mt: 1.5, mb: 0.75, fontWeight: 600 }}
			>
				Разметка
			</Typography>
			{LAYOUT_PRESETS.map((preset) => (
				<PaletteItem key={String(preset.id)} preset={preset} />
			))}
			<Typography
				variant="caption"
				color="text.secondary"
				sx={{ display: "block", mt: 1.5, mb: 0.75, fontWeight: 600 }}
			>
				Расчёты
			</Typography>
			{CALCULATION_FIELD_PRESETS.map((preset) => (
				<PaletteItem key={String(preset.id)} preset={preset} />
			))}
			<Typography
				variant="caption"
				color="text.secondary"
				sx={{ display: "block", mt: 1.5, mb: 0.75, fontWeight: 600 }}
			>
				Арх. компоненты
			</Typography>
			{ARCH_COMPONENT_PRESETS.map((preset) => (
				<PaletteItem key={String(preset.id)} preset={preset} />
			))}
			<Typography
				variant="caption"
				color="text.secondary"
				sx={{ display: "block", mt: 1.5, mb: 0.75, fontWeight: 600 }}
			>
				Работы
			</Typography>
			{WORK_COMPONENT_PRESETS.map((preset) => (
				<PaletteItem key={String(preset.id)} preset={preset} />
			))}
		</PanelChrome>
	);
}

export function SchemaCanvasPanel({
	embedded = false,
}: {
	embedded?: boolean;
}) {
	return (
		<PanelChrome
			embedded={embedded}
			dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.canvas}
			title="Холст полей"
			description="Корневые поля, группы и поля элементов массива. Перетаскивайте для изменения порядка."
		>
			<FieldList
				parentPointer="/"
				depth={0}
				emptyLabel="Перетащите поле сюда"
			/>
		</PanelChrome>
	);
}
