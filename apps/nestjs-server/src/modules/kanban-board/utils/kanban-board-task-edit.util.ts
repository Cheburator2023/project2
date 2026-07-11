import { ConflictException } from "@nestjs/common";
import type {
	KanbanBoardTaskConflictItemDto,
	KanbanBoardTaskEditBlockedErrorDto,
} from "@smart-anketa/api-contract";
import type { KanbanBoardTaskEntity } from "../entities/kanban-board-task.entity";

export function assertKanbanBoardTaskVersion(
	task: KanbanBoardTaskEntity,
	expectedUpdatedAt: string | undefined,
	forceOverwrite: boolean | undefined,
	meta?: { taskKey?: string; taskTitle?: string },
): void {
	if (forceOverwrite || !expectedUpdatedAt) return;
	if (task.updatedAt === expectedUpdatedAt) return;

	const conflict: KanbanBoardTaskConflictItemDto = {
		taskId: task.id,
		taskKey: meta?.taskKey,
		taskTitle: meta?.taskTitle ?? task.content.title,
		expectedUpdatedAt,
		actualUpdatedAt: task.updatedAt,
	};
	throwKanbanBoardTaskEditBlocked({
		message: "Задача была изменена другим пользователем",
		reason: "version",
		conflicts: [conflict],
	});
}

export function throwKanbanBoardTaskEditBlocked(
	payload: KanbanBoardTaskEditBlockedErrorDto,
): never {
	throw new ConflictException(payload);
}

export function throwKanbanBoardTaskVersionConflicts(
	conflicts: KanbanBoardTaskConflictItemDto[],
): never {
	throwKanbanBoardTaskEditBlocked({
		message:
			conflicts.length === 1
				? "Задача была изменена другим пользователем"
				: `Конфликт версий у задач: ${conflicts.length}`,
		reason: "version",
		conflicts,
	});
}
