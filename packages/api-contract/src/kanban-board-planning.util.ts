import {
	KANBAN_BOARD_RELEASE_THEME_COLORS,
	KANBAN_BOARD_STATUSES,
	type KanbanBoardReleaseThemeDto,
} from "./kanban-board.types";

export const KANBAN_BOARD_PLANNING_UNTHEMED_ID = "__unthemed__";

export type KanbanBoardPlanningBoardColumn<T> = {
	id: string;
	title: string;
	color: string;
	items: T[];
};

export function nextKanbanBoardReleaseThemeColor(existingCount: number): string {
	const colors = KANBAN_BOARD_RELEASE_THEME_COLORS;
	return colors[existingCount % colors.length] ?? colors[0];
}

export function findKanbanBoardColumnByStatusTitle<
	T extends { id: string; title: string },
>(columns: T[], statusTitle: string): T | undefined {
	const needle = statusTitle.trim().toLowerCase();
	if (!needle) return undefined;
	return columns.find((column) => column.title.trim().toLowerCase() === needle);
}

function sortByPosition<T extends { position: number }>(a: T, b: T): number {
	return a.position - b.position;
}

export function groupPlanningTasksByTheme<
	T extends { themeId: string | null; position: number },
>(
	tasks: T[],
	themes: Pick<KanbanBoardReleaseThemeDto, "id" | "name" | "color" | "position">[],
	unthemedId = KANBAN_BOARD_PLANNING_UNTHEMED_ID,
): Array<KanbanBoardPlanningBoardColumn<T>> {
	const sortedThemes = [...themes].sort((a, b) => a.position - b.position);
	const byTheme = new Map<string, T[]>();
	for (const theme of sortedThemes) {
		byTheme.set(theme.id, []);
	}
	const unthemed: T[] = [];
	for (const task of [...tasks].sort(sortByPosition)) {
		if (task.themeId && byTheme.has(task.themeId)) {
			byTheme.get(task.themeId)?.push(task);
		} else {
			unthemed.push(task);
		}
	}

	const columns: Array<KanbanBoardPlanningBoardColumn<T>> = sortedThemes.map(
		(theme) => ({
			id: theme.id,
			title: theme.name,
			color: theme.color,
			items: byTheme.get(theme.id) ?? [],
		}),
	);
	columns.push({
		id: unthemedId,
		title: "Без группы",
		color: "#64748b",
		items: unthemed,
	});
	return columns;
}

export type PlanningTaskGridTaskRow<
	T extends { themeId: string | null; position: number },
> = T & { rowKind: "task" };

export type PlanningTaskGridThemeRow<
	T extends { themeId: string | null; position: number },
> = {
	rowKind: "theme";
	id: string;
	themeId: string | null;
	title: string;
	color: string;
	children: Array<PlanningTaskGridTaskRow<T>>;
};

export type PlanningTaskGridRow<
	T extends { themeId: string | null; position: number },
> = PlanningTaskGridThemeRow<T> | PlanningTaskGridTaskRow<T>;

export function buildPlanningTaskGridRows<
	T extends { themeId: string | null; position: number },
>(
	tasks: T[],
	themes: Pick<KanbanBoardReleaseThemeDto, "id" | "name" | "color" | "position">[],
): Array<PlanningTaskGridThemeRow<T>> {
	return groupPlanningTasksByTheme(tasks, themes).map((column) => ({
		rowKind: "theme",
		id: column.id,
		themeId:
			column.id === KANBAN_BOARD_PLANNING_UNTHEMED_ID ? null : column.id,
		title: column.title,
		color: column.color,
		children: column.items.map((item) => ({ ...item, rowKind: "task" as const })),
	}));
}

export function planningTaskGridRowId<
	T extends { themeId: string | null; position: number; taskId: string },
>(row: PlanningTaskGridRow<T>): string {
	if (row.rowKind === "theme") return `theme:${row.id}`;
	return `task:${row.taskId}`;
}

export function groupPlanningTasksByStatus<
	T extends { statusTitle: string; position: number },
>(tasks: T[]): Array<KanbanBoardPlanningBoardColumn<T>> {
	const knownOrder = new Map(
		KANBAN_BOARD_STATUSES.map((item, index) => [item.title.toLowerCase(), index]),
	);
	const buckets = new Map<string, T[]>();
	for (const task of [...tasks].sort(sortByPosition)) {
		const title = task.statusTitle.trim() || "Без статуса";
		const list = buckets.get(title) ?? [];
		list.push(task);
		buckets.set(title, list);
	}

	return [...buckets.entries()]
		.sort(([a], [b]) => {
			const aOrder = knownOrder.get(a.toLowerCase());
			const bOrder = knownOrder.get(b.toLowerCase());
			if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
			if (aOrder !== undefined) return -1;
			if (bOrder !== undefined) return 1;
			return a.localeCompare(b, "ru");
		})
		.map(([title, items]) => ({
			id: title,
			title,
			color: "#64748b",
			items,
		}));
}
