import type { KanbanBoardTaskLockDto } from "./kanban-board.types";

export const KANBAN_WS_NAMESPACE = "/kanban";

export const KANBAN_WS_EVENTS = {
	join: "lock:join",
	leave: "lock:leave",
	snapshot: "lock:snapshot",
	changed: "lock:changed",
	sync: "board:sync",
} as const;

export type KanbanLockJoinPayload = {
	taskId: string;
	lockedByLabel?: string;
};

export type KanbanLockLeavePayload = {
	taskId: string;
};

export type KanbanLockSnapshotPayload = {
	locks: KanbanBoardTaskLockDto[];
};

export type KanbanLockChangedPayload =
	| { type: "acquired"; lock: KanbanBoardTaskLockDto }
	| { type: "released"; taskId: string };

export type KanbanLockJoinAck =
	| { ok: true; lock: KanbanBoardTaskLockDto }
	| {
			ok: false;
			message: string;
			lock?: KanbanBoardTaskLockDto;
	  };

/** Изменение задач: клиент один раз подтягивает board/task, без интервала. */
export type KanbanSyncPayload = {
	boardId: string;
	taskIds: string[];
};
