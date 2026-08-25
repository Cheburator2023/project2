import Button from "@mui/material/Button";
import type { ColDef } from "ag-grid-community";
import { Flex } from "@react-client/common/primitives/Flex";
import { useKanbanBoardAssignees } from "@react-client/common/api/queries/kanban-board";
import { TrackerRegistryGrid } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import { usePlanningWorkspace } from "@react-client/features/tracker/planning/PlanningWorkspaceContext";
import {
	buildPlanningAssigneeLoadFooter,
	buildPlanningAssigneeLoadRows,
	type PlanningAssigneeLoadRow,
} from "@react-client/features/tracker/planning/planningAssigneeLoad";
import {
	KANBAN_BOARD_PLANNING_UNTHEMED_ID,
	kanbanBoardTaskReleaseLabel,
} from "@smart-anketa/api-contract";
import { useMemo, useState } from "react";

type LoadView = "total" | "releases" | "themes";

const VIEW_OPTIONS: Array<{ id: LoadView; label: string; title: string }> = [
	{ id: "total", label: "Общий", title: "Сумма человеко-дней по исполнителям" },
	{
		id: "releases",
		label: "Релизы",
		title: "Разрез по релизам планирования",
	},
	{
		id: "themes",
		label: "Группы",
		title: "Разрез по группам плана",
	},
];

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

const GRID_STATE_KEY: Record<LoadView, string> = {
	total: "tracker.planning.assignees",
	releases: "tracker.planning.assignees.releases",
	themes: "tracker.planning.assignees.themes",
};

export function PlanningAssigneesPanel() {
	const { planning } = usePlanningWorkspace();
	const assigneesQuery = useKanbanBoardAssignees();
	const [view, setView] = useState<LoadView>("total");

	const rows = useMemo(
		() =>
			buildPlanningAssigneeLoadRows({
				tasks: planning.tasks,
				directory: assigneesQuery.data ?? [],
			}),
		[assigneesQuery.data, planning.tasks],
	);

	const footer = useMemo(
		() => [buildPlanningAssigneeLoadFooter(rows, planning.tasks.length)],
		[planning.tasks.length, rows],
	);

	const columnDefs = useMemo<ColDef<PlanningAssigneeLoadRow>[]>(() => {
		const base: ColDef<PlanningAssigneeLoadRow>[] = [
			{
				colId: "assigneeName",
				headerName: "Исполнитель",
				flex: 1.2,
				minWidth: 160,
				valueGetter: (params) => params.data?.assigneeName ?? "",
			},
			{
				colId: "roleTitle",
				headerName: "Роль",
				width: 140,
				valueGetter: (params) => params.data?.roleTitle ?? "",
			},
			{
				colId: "taskCount",
				headerName: "Задач",
				width: 90,
				type: "numericColumn",
				valueGetter: (params) => params.data?.taskCount ?? 0,
			},
			{
				colId: "totalPd",
				headerName: "Итого, чд",
				width: 110,
				type: "numericColumn",
				valueGetter: (params) => params.data?.totalPd ?? 0,
				valueFormatter: (params) => formatPd(params.value),
			},
			{
				colId: "capacityPd",
				headerName: "Ёмкость, чд",
				width: 120,
				type: "numericColumn",
				valueGetter: (params) => params.data?.capacityPd,
				valueFormatter: (params) => formatPd(params.value, true),
			},
			{
				colId: "loadPercent",
				headerName: "Загрузка",
				width: 110,
				type: "numericColumn",
				valueGetter: (params) => params.data?.loadPercent,
				valueFormatter: (params) => formatPercent(params.value),
			},
		];

		if (view === "releases") {
			return [
				...base,
				...planning.releases.map((release) => ({
					colId: `release:${release.id}`,
					headerName: kanbanBoardTaskReleaseLabel(release),
					minWidth: 120,
					flex: 1,
					type: "numericColumn" as const,
					valueGetter: (params: { data?: PlanningAssigneeLoadRow }) =>
						params.data?.byRelease[release.id] ?? 0,
					valueFormatter: (params: { value: unknown }) =>
						formatPd(params.value, true),
				})),
			];
		}

		if (view === "themes") {
			const themeColumns = planning.themes.map((theme) => ({
				colId: `theme:${theme.id}`,
				headerName: theme.name,
				minWidth: 120,
				flex: 1,
				type: "numericColumn" as const,
				valueGetter: (params: { data?: PlanningAssigneeLoadRow }) =>
					params.data?.byTheme[theme.id] ?? 0,
				valueFormatter: (params: { value: unknown }) =>
					formatPd(params.value, true),
			}));
			themeColumns.push({
				colId: `theme:${KANBAN_BOARD_PLANNING_UNTHEMED_ID}`,
				headerName: "Без группы",
				minWidth: 120,
				flex: 1,
				type: "numericColumn" as const,
				valueGetter: (params: { data?: PlanningAssigneeLoadRow }) =>
					params.data?.byTheme[KANBAN_BOARD_PLANNING_UNTHEMED_ID] ?? 0,
				valueFormatter: (params: { value: unknown }) =>
					formatPd(params.value, true),
			});
			return [...base, ...themeColumns];
		}

		return base;
	}, [planning.releases, planning.themes, view]);

	return (
		<Flex
			flexDirection="column"
			height="100%"
			minHeight="0"
			padding="8px"
			gap={8}
		>
			<Flex gap={8} alignItems="center">
				{VIEW_OPTIONS.map((option) => (
					<Button
						key={option.id}
						size="small"
						variant={view === option.id ? "contained" : "outlined"}
						onClick={() => setView(option.id)}
						title={option.title}
					>
						{option.label}
					</Button>
				))}
			</Flex>
			<Flex flexGrow={1} minHeight="0">
				<TrackerRegistryGrid<PlanningAssigneeLoadRow>
					gridStateKey={GRID_STATE_KEY[view]}
					rowData={rows}
					columnDefs={columnDefs}
					pagination={false}
					loading={assigneesQuery.isLoading}
					pinnedBottomRowData={rows.length ? footer : undefined}
					getRowId={(params) =>
						params.data?.assigneeName ?? "planning-assignee"
					}
				/>
			</Flex>
		</Flex>
	);
}
