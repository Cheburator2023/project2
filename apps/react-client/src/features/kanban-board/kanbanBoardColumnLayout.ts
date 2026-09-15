import {
	KANBAN_BOARD_COLUMN_WIDTH_PX,
	kanbanBoardReleasesLaneWidthPx,
	parseKanbanBoardReleasesLaneId,
} from "@smart-anketa/api-contract";
import type { CSSProperties } from "react";
import type { BoardItem } from "react-kanban-kit";

export { KANBAN_BOARD_COLUMN_WIDTH_PX, kanbanBoardReleasesLaneWidthPx };

export function kanbanBoardColumnWrapperStyle(
	column: BoardItem,
	releasesLaneWidthPx: number,
): CSSProperties {
	const isLane = Boolean(parseKanbanBoardReleasesLaneId(column.id));
	const width = isLane ? releasesLaneWidthPx : KANBAN_BOARD_COLUMN_WIDTH_PX;
	return { width, minWidth: width, maxWidth: width };
}

export function kanbanBoardColumnWrapperClassName(column: BoardItem): string {
	return parseKanbanBoardReleasesLaneId(column.id)
		? "kanban-releases-lane"
		: "";
}

export const kanbanBoardRkkBoardSx = {
	"& .rkk-board": {
		overflow: "visible",
		height: "auto",
		minHeight: "100%",
		width: "max-content",
		minWidth: "100%",
		alignItems: "flex-start",
	},
	"& .rkk-column-outer": {
		height: "auto",
		alignSelf: "stretch",
		boxSizing: "border-box",
	},
	"& .rkk-column-outer.kanban-releases-lane": {
		borderTop: "2px solid",
		borderColor: "divider",
	},
	"& .rkk-column-outer .rkk-column": {
		height: "auto",
		minHeight: "100%",
		overflow: "visible !important",
		borderRadius: "4px",
		width: "100%",
	},
	"& .rkk-column-outer .rkk-column-wrapper": {
		maxHeight: "none",
		overflow: "visible",
	},
	"& .rkk-column-content": {
		height: "auto",
		flex: "none",
		minHeight: "unset",
		overflow: "visible",
	},
	"& .rkk-column-content-list": {
		height: "auto",
		overflow: "visible !important",
		overflowX: "visible !important",
		overflowY: "visible !important",
	},
	"& .rkk-card-shadow-container": {
		overflow: "visible",
	},
} as const;
