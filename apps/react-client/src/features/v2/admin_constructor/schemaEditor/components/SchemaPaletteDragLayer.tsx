import { useDragLayer } from "react-dnd";
import {
	PALETTE_DRAG_TYPE,
	type PaletteDragItem,
} from "../schemaCanvasTree";

const layerRootStyle: React.CSSProperties = {
	height: "100%",
	left: 0,
	pointerEvents: "none",
	position: "fixed",
	top: 0,
	width: "100%",
	zIndex: 9999,
};

function getItemStyles(clientOffset: { x: number; y: number } | null) {
	if (!clientOffset) return {};
	const { x, y } = clientOffset;
	return {
		pointerEvents: "none" as const,
		transform: `translate(${x}px, ${y}px)`,
	};
}

function readPaletteDragLabel(item: unknown): string {
	if (typeof item !== "object" || item === null) return "";
	if ("text" in item && typeof (item as { text: unknown }).text === "string") {
		return (item as { text: string }).text;
	}
	if (
		"type" in item &&
		(item as PaletteDragItem).type === PALETTE_DRAG_TYPE &&
		typeof (item as PaletteDragItem).text === "string"
	) {
		return (item as PaletteDragItem).text;
	}
	return "";
}

/**
 * Кастомный превью-слой для палитры (после getEmptyImage).
 * Паттерн: ExternalElementInsideReactDnd/DragLayer.tsx
 */
export function SchemaPaletteDragLayer() {
	const { item, itemType, isDragging, clientOffset } = useDragLayer((monitor) => ({
		item: monitor.getItem(),
		itemType: monitor.getItemType(),
		clientOffset: monitor.getClientOffset(),
		isDragging: monitor.isDragging(),
	}));

	if (
		!isDragging ||
		!clientOffset ||
		!item ||
		itemType !== PALETTE_DRAG_TYPE
	) {
		return null;
	}

	const label = readPaletteDragLabel(item);

	return (
		<div style={layerRootStyle}>
			<div style={getItemStyles(clientOffset)}>
				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						padding: "6px 10px",
						borderRadius: 4,
						border: "1px solid var(--mui-palette-primary-main, #1976d2)",
						background: "var(--mui-palette-background-paper, #fff)",
						boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
						maxWidth: 220,
						fontSize: "0.875rem",
						fontWeight: 600,
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis",
					}}
				>
					{label}
				</div>
			</div>
		</div>
	);
}
