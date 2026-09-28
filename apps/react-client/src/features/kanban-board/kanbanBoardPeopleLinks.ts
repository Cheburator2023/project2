import {
	kanbanBoardRelationInverseType,
	kanbanBoardRelationTypeColor,
	kanbanBoardRelationTypeTitle,
	type KanbanBoardRelationTypeId,
	type KanbanBoardRelatedTaskLink,
} from "@smart-anketa/api-contract";
import type { KanbanBoardPersonTask } from "@react-client/features/kanban-board/kanbanBoardPeopleGroups";

/** Типы, которые удобнее рисовать «в обратную» сторону (от причины к следствию). */
const FLIP_RELATION_TYPES = new Set<KanbanBoardRelationTypeId>([
	"blocked_by",
	"child",
	"duplicated_by",
	"depends_on",
]);

export type KanbanBoardPeopleLinkEdge = {
	id: string;
	fromId: string;
	toId: string;
	type: KanbanBoardRelationTypeId;
	color: string;
	title: string;
};

export type KanbanBoardPeopleLinkGeometry = KanbanBoardPeopleLinkEdge & {
	y1: number;
	y2: number;
	lane: number;
};

/** Одна связь между двумя задачами, без дублей A→B / B→A. */
export function buildKanbanBoardPeopleLinkEdges(
	tasks: readonly Pick<KanbanBoardPersonTask, "id" | "relatedLinks">[],
): KanbanBoardPeopleLinkEdge[] {
	const visibleIds = new Set(tasks.map((task) => task.id));
	const byPair = new Map<string, KanbanBoardPeopleLinkEdge>();

	const add = (
		fromId: string,
		link: KanbanBoardRelatedTaskLink,
	) => {
		if (!visibleIds.has(link.taskId) || link.taskId === fromId) return;
		let type = link.type;
		let source = fromId;
		let target = link.taskId;
		if (FLIP_RELATION_TYPES.has(type)) {
			source = link.taskId;
			target = fromId;
			type = kanbanBoardRelationInverseType(type);
		}
		const pairKey = [source, target].sort().join("\0");
		if (byPair.has(pairKey)) return;
		byPair.set(pairKey, {
			id: `${source}->${target}:${type}`,
			fromId: source,
			toId: target,
			type,
			color: kanbanBoardRelationTypeColor(type),
			title: kanbanBoardRelationTypeTitle(type),
		});
	};

	for (const task of tasks) {
		for (const link of task.relatedLinks) add(task.id, link);
	}

	return [...byPair.values()];
}

/** Коридоры слева: пересекающиеся дуги получают разные lane. */
export function assignKanbanBoardPeopleLinkLanes(
	edges: ReadonlyArray<{ y1: number; y2: number }>,
): number[] {
	const ranked = edges
		.map((edge, index) => {
			const top = Math.min(edge.y1, edge.y2);
			const bottom = Math.max(edge.y1, edge.y2);
			return { index, top, bottom, span: bottom - top };
		})
		.sort((a, b) => a.span - b.span || a.top - b.top);

	const lanes: number[] = Array.from({ length: edges.length }, () => 0);
	const occupied: { top: number; bottom: number; lane: number }[] = [];

	for (const item of ranked) {
		const used = new Set(
			occupied
				.filter(
					(slot) => !(item.bottom < slot.top || item.top > slot.bottom),
				)
				.map((slot) => slot.lane),
		);
		let lane = 0;
		while (used.has(lane)) lane += 1;
		lanes[item.index] = lane;
		occupied.push({ top: item.top, bottom: item.bottom, lane });
	}

	return lanes;
}

export function buildKanbanBoardPeopleLinkGeometry(
	edges: readonly KanbanBoardPeopleLinkEdge[],
	centers: ReadonlyMap<string, number>,
): KanbanBoardPeopleLinkGeometry[] {
	const withY = edges.flatMap((edge) => {
		const y1 = centers.get(edge.fromId);
		const y2 = centers.get(edge.toId);
		if (y1 == null || y2 == null || Math.abs(y1 - y2) < 4) return [];
		return [{ ...edge, y1, y2 }];
	});
	const lanes = assignKanbanBoardPeopleLinkLanes(withY);
	return withY.map((edge, index) => ({
		...edge,
		lane: lanes[index] ?? 0,
	}));
}

export function kanbanBoardPeopleLinkPath(
	edge: Pick<KanbanBoardPeopleLinkGeometry, "y1" | "y2" | "lane">,
	railRight: number,
	laneGap = 12,
): string {
	const x = Math.max(10, railRight - 6 - edge.lane * laneGap);
	const elbow = Math.max(4, x - 14);
	const y1 = edge.y1;
	const y2 = edge.y2;
	return [
		`M ${railRight} ${y1}`,
		`L ${x} ${y1}`,
		`C ${elbow} ${y1}, ${elbow} ${y2}, ${x} ${y2}`,
		`L ${railRight} ${y2}`,
	].join(" ");
}
