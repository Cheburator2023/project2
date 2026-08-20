import { In, type Repository } from "typeorm";
import type { KanbanBoardTaskReleaseRefDto } from "@smart-anketa/api-contract";
import { KanbanBoardReleaseTaskEntity } from "../entities/kanban-board-release-task.entity";

export async function loadReleasesByTaskIds(
	membershipRepository: Repository<KanbanBoardReleaseTaskEntity>,
	taskIds: string[],
): Promise<Map<string, KanbanBoardTaskReleaseRefDto[]>> {
	const uniqueIds = [...new Set(taskIds.filter(Boolean))];
	const map = new Map<string, KanbanBoardTaskReleaseRefDto[]>();
	if (!uniqueIds.length) return map;

	const rows = await membershipRepository.find({
		where: { taskId: In(uniqueIds) },
		relations: { release: true },
		order: { position: "ASC" },
	});
	for (const row of rows) {
		if (!row.release) continue;
		const list = map.get(row.taskId) ?? [];
		list.push({
			id: row.release.id,
			code: row.release.code,
			name: row.release.name,
		});
		map.set(row.taskId, list);
	}
	return map;
}
