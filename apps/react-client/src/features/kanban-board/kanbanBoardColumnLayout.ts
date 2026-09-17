import {
	KANBAN_BOARD_COLUMN_WIDTH_PX,
	parseKanbanBoardReleasesLaneId,
} from "@smart-anketa/api-contract";
import type { CSSProperties } from "react";
import type { BoardItem } from "react-kanban-kit";

export { KANBAN_BOARD_COLUMN_WIDTH_PX };

export function kanbanBoardColumnWrapperStyle(
	_column: BoardItem,
): CSSProperties {
	return {
		width: KANBAN_BOARD_COLUMN_WIDTH_PX,
		minWidth: KANBAN_BOARD_COLUMN_WIDTH_PX,
		maxWidth: KANBAN_BOARD_COLUMN_WIDTH_PX,
	};
}

export function kanbanBoardColumnWrapperClassName(column: BoardItem): string {
	return parseKanbanBoardReleasesLaneId(column.id)
		? "kanban-releases-lane"
		: "";
}

export const kanbanBoardRkkBoardSx = {
	"& .rkk-board": {
		overflow: "visible",
		height: "100%",
		width: "max-content",
		minWidth: "100%",
	},
	"& .rkk-column-outer": {
		height: "100%",
		boxSizing: "border-box",
	},
	"& .rkk-column-outer.kanban-releases-lane": {
		borderTop: "2px solid",
		borderColor: "divider",
	},
	"& .rkk-column-outer .rkk-column": {
		height: "100%",
		minHeight: 0,
		borderRadius: "4px",
		width: "100%",
	},
	"& .rkk-column-outer .rkk-column-wrapper": {
		flex: 1,
		minHeight: 0,
		overflow: "hidden",
	},
	"& .rkk-column-content": {
		flex: 1,
		height: 0,
		minHeight: 0,
	},
	"& .rkk-column-content-list": {
		height: "100%",
		overflowX: "hidden",
		overflowY: "auto",
	},
} as const;
