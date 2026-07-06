import { type KanbanBoardAssigneeRoleId, type KanbanBoardColumnDto, type KanbanBoardData, type KanbanBoardRoleEstimates, type KanbanBoardSubtaskItem, type KanbanBoardTaskContent, type KanbanBoardTaskRecord } from "./kanban-board.types";
export declare function toBoardData(rows: KanbanBoardTaskRecord[], columns: KanbanBoardColumnDto[]): KanbanBoardData;
export declare function normalizeKanbanBoardData(board: KanbanBoardData): KanbanBoardData;
export declare function fromBoardData(board: KanbanBoardData, stand: string, now: string, boardId: string): KanbanBoardTaskRecord[];
export declare function kanbanBoardTaskAssignees(content: Pick<KanbanBoardTaskContent, "assignee" | "assignees">): string[];
export declare function kanbanBoardTaskAssigneesTitle(content: Pick<KanbanBoardTaskContent, "assignee" | "assignees">): string;
export declare function isKanbanBoardAssigneeRoleId(value: string | null | undefined): value is KanbanBoardAssigneeRoleId;
export declare function kanbanBoardAssigneeRoleByName(assignees: ReadonlyArray<{
    name: string;
    role: KanbanBoardAssigneeRoleId | null;
}>): Map<string, KanbanBoardAssigneeRoleId | null>;
/** Уникальные роли исполнителей задачи по справочнику. */
export declare function kanbanBoardTaskAssigneeRoles(content: Pick<KanbanBoardTaskContent, "assignee" | "assignees">, roleByAssigneeName: ReadonlyMap<string, KanbanBoardAssigneeRoleId | null | undefined>): KanbanBoardAssigneeRoleId[];
export declare function kanbanBoardTaskAssigneeRoleTitles(content: Pick<KanbanBoardTaskContent, "assignee" | "assignees">, roleByAssigneeName: ReadonlyMap<string, KanbanBoardAssigneeRoleId | null | undefined>): string[];
export declare function kanbanBoardRoleEstimatesTotal(roleEstimates?: KanbanBoardRoleEstimates): number | undefined;
/** Итоговая оценка: сумма по ролям или явное estimatePd. */
export declare function kanbanBoardEffectiveEstimatePd(content: Pick<KanbanBoardTaskContent, "estimatePd" | "roleEstimates">): number | undefined;
export declare function kanbanBoardEffectiveSprintCapacityPd(input: {
    sprintCapacityPd?: number | null;
    defaultSprintCapacityPd?: number;
}): number;
/** Нормализует чеклист подзадач: убирает пустые строки, сохраняет порядок. */
export declare function normalizeKanbanBoardSubtasks(items: KanbanBoardSubtaskItem[] | undefined): KanbanBoardSubtaskItem[] | undefined;
export declare function kanbanBoardSubtasksProgress(content: Pick<KanbanBoardTaskContent, "subtasks"> | undefined): {
    done: number;
    total: number;
} | undefined;
/** Нормализует content: проставляет estimatePd из roleEstimates, убирает пустые роли. */
export declare function normalizeKanbanBoardTaskContent(content: KanbanBoardTaskContent): KanbanBoardTaskContent;
export declare function boardsEquivalent(left: KanbanBoardData, right: KanbanBoardData): boolean;
export declare function resolveKanbanBoardLegacyColumnId(columnId: string, validIds?: ReadonlySet<string>): string;
