import { type KanbanBoardData, type TaskRecord } from "./task-tracker.types";
export declare function toBoardData(rows: TaskRecord[]): KanbanBoardData;
export declare function fromBoardData(board: KanbanBoardData, stand: string, now: string): TaskRecord[];
export declare function boardsEquivalent(left: KanbanBoardData, right: KanbanBoardData): boolean;
