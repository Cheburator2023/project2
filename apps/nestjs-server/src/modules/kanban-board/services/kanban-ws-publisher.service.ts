import { Injectable } from "@nestjs/common";
import type { KanbanSyncPayload } from "@smart-anketa/api-contract";

@Injectable()
export class KanbanWsPublisher {
	private emitSync: ((payload: KanbanSyncPayload) => void) | null = null;
	private readonly pending = new Map<
		string,
		{ taskIds: Set<string>; timer: ReturnType<typeof setTimeout> | null }
	>();

	attachSync(emit: (payload: KanbanSyncPayload) => void): void {
		this.emitSync = emit;
	}

	publishTaskChanged(boardId: string, taskId?: string): void {
		if (!boardId) return;
		const current = this.pending.get(boardId) ?? {
			taskIds: new Set<string>(),
			timer: null,
		};
		if (taskId) current.taskIds.add(taskId);
		if (current.timer) clearTimeout(current.timer);
		current.timer = setTimeout(() => {
			this.pending.delete(boardId);
			this.emitSync?.({
				boardId,
				taskIds: [...current.taskIds],
			});
		}, 50);
		this.pending.set(boardId, current);
	}
}
