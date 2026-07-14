import type { KanbanBoardData, KanbanBoardTaskEditBlockedErrorDto } from "./kanban-board.types";
export declare function collectKanbanBoardExpectedVersions(board: KanbanBoardData): Record<string, string>;
export declare function isKanbanBoardTaskEditBlockedError(value: unknown): value is KanbanBoardTaskEditBlockedErrorDto;
export declare function parseKanbanBoardTaskEditBlockedError(error: unknown): KanbanBoardTaskEditBlockedErrorDto | null;
