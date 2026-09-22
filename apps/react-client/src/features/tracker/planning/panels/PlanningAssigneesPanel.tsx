import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Flex } from "@react-client/common/primitives/Flex";
import { useKanbanBoardAssignees } from "@react-client/common/api/queries/kanban-board";
import { TrackerRegistryGrid } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import { usePlanningWorkspace } from "@react-client/features/tracker/planning/PlanningWorkspaceContext";
import {
	buildPlanningAssigneeLoadFooter,
	buildPlanningAssigneeLoadRows,
} from "@react-client/features/tracker/planning/planningAssigneeLoad";
import {
	kanbanBoardReleaseVisibleOnBoard,
	kanbanBoardTaskReleaseLabel,
	type KanbanBoardReleaseTaskDto,
} from "@smart-anketa/api-contract";
import { useMemo } from "react";

type AssigneeGridRow = {
	id: string;
	rowKind: "release" | "assignee";
	title: string;
	roleTitle: string;
	taskCount: number;
	totalPd: number;
	capacityPd?: number;
	loadPercent?: number;
	children?: AssigneeGridRow[];
};

function formatPd(value: unknown, emptyZero = false): string {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return "";
	if (emptyZero && parsed === 0) return "";
	return parsed.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

function formatPercent(value: unknown): string {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return "";
	return `${Math.round(parsed)}%`;
}

function taskOpenReleaseIds(
	task: KanbanBoardReleaseTaskDto,
	openReleaseIds: Set<string>,
): string[] {
	const ids = task.releaseIds?.length
		? task.releaseIds
		: task.releaseId
			? [task.releaseId]
			: [];
	return ids.filter((id) => openReleaseIds.has(id));
}

function GroupTitleRenderer(params: ICellRendererParams<AssigneeGridRow>) {
	const row = params.data;
	if (!row) return "";
	if (row.rowKind === "release") {
		const label = `${row.title} (${row.taskCount})`;
		return <span title={label}>{label}</span>;
	}
	return row.title;
}

export function PlanningAssigneesPanel() {
	const { planning } = usePlanningWorkspace();
	const assigneesQuery = useKanbanBoardAssignees();

	const rowData = useMemo(() => {
		const openReleases = planning.releases.filter((release) =>
			kanbanBoardReleaseVisibleOnBoard(release.status),
		);
		const openIds = new Set(openReleases.map((release) => release.id));
		const directory = assigneesQuery.data ?? [];
		const sections = openReleases.map((release) => ({
			id: release.id,
			title: kanbanBoardTaskReleaseLabel(release),
			tasks: planning.tasks
				.filter((task) => taskOpenReleaseIds(task, openIds).includes(release.id))
				.map((task) => ({ ...task, releaseId: release.id })),
		}));
		const withoutRelease = planning.tasks.filter(
			(task) => taskOpenReleaseIds(task, openIds).length === 0,
		);
		if (withoutRelease.length) {
			sections.push({
				id: "",
				title: "Без релиза",
				tasks: withoutRelease.map((task) => ({ ...task, releaseId: "" })),
			});
		}

		return sections
			.filter((section) => section.tasks.length > 0)
			.map((section): AssigneeGridRow => {
				const loadRows = buildPlanningAssigneeLoadRows({
					tasks: section.tasks,
					directory,
				});
				const totals = buildPlanningAssigneeLoadFooter(
					loadRows,
					section.tasks.length,
				);
				return {
					id: `release:${section.id || "none"}`,
					rowKind: "release",
					title: section.title,
					roleTitle: "",
					taskCount: totals.taskCount,
					totalPd: totals.totalPd,
					loadPercent: totals.loadPercent,
					children: loadRows.map((row) => ({
						id: `release:${section.id || "none"}:${row.assigneeName}`,
						rowKind: "assignee" as const,
						title: row.assigneeName,
						roleTitle: row.roleTitle,
						taskCount: row.taskCount,
						totalPd: row.totalPd,
						capacityPd: row.capacityPd,
						loadPercent: row.loadPercent,
					})),
				};
			});
	}, [assigneesQuery.data, planning.releases, planning.tasks]);

	const autoGroupColumnDef = useMemo<ColDef<AssigneeGridRow>>(
		() => ({
			colId: "groupTitle",
			headerName: "Релиз",
			minWidth: 220,
			flex: 1.4,
			sortable: false,
			valueGetter: (params) => params.data?.title ?? "",
			cellRendererParams: {
				suppressCount: true,
				innerRenderer: GroupTitleRenderer,
			},
		}),
		[],
	);

	const columnDefs = useMemo<ColDef<AssigneeGridRow>[]>(
		() => [
			{
				colId: "roleTitle",
				headerName: "Роль",
				width: 140,
				valueGetter: (params) =>
					params.data?.rowKind === "assignee" ? params.data.roleTitle : "",
			},
			{
				colId: "taskCount",
				headerName: "Задач",
				width: 90,
				type: "numericColumn",
				valueGetter: (params) => params.data?.taskCount ?? 0,
			},
			{
				colId: "capacityPd",
				headerName: "Ёмкость, чд",
				width: 120,
				type: "numericColumn",
				valueGetter: (params) =>
					params.data?.rowKind === "assignee" ? params.data.capacityPd : undefined,
				valueFormatter: (params) => formatPd(params.value, true),
			},
			{
				colId: "loadSummary",
				headerName: "ч/д · %",
				width: 132,
				pinned: "right",
				type: "numericColumn",
				valueGetter: (params) => params.data?.totalPd ?? 0,
				valueFormatter: (params) => {
					const row = params.data;
					if (!row) return "";
					const pd = formatPd(row.totalPd);
					if (row.loadPercent == null) return pd;
					return `${pd} · ${formatPercent(row.loadPercent)}`;
				},
			},
		],
		[],
	);

	return (
		<Flex
			flexDirection="column"
			height="100%"
			minHeight="0"
			padding="8px"
			gap={8}
		>
			<Flex flexGrow={1} minHeight="0">
				<TrackerRegistryGrid<AssigneeGridRow>
					gridStateKey="tracker.planning.assignees"
					rowData={rowData}
					columnDefs={columnDefs}
					autoGroupColumnDef={autoGroupColumnDef}
					treeData
					treeDataChildrenField="children"
					pagination={false}
					loading={assigneesQuery.isLoading}
					getRowId={(params) => params.data?.id ?? "planning-assignee"}
				/>
			</Flex>
		</Flex>
	);
}
