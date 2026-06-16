import { type KanbanBoardData, type KanbanBoardTaskRecord } from "./kanban-board.types";
export declare function toBoardData(rows: KanbanBoardTaskRecord[]): KanbanBoardData;
export declare function fromBoardData(board: KanbanBoardData, stand: string, now: string, boardId: string): KanbanBoardTaskRecord[];
export declare function boardsEquivalent(left: KanbanBoardData, right: KanbanBoardData): boolean;
