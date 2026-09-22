import type { ColDef, ICellRendererParams } from "ag-grid-community";
import type { ReactNode } from "react";
import {
	TrackerBoardChips,
	TrackerProjectChips,
	trackerBoardFilterText,
	trackerProjectFilterText,
} from "@react-client/features/tracker/components/TrackerRegistryChipCell";
import { trackerDateFormatter } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import {
	TrackerTaskAssigneeRolesChips,
	TrackerTaskAssigneesChips,
	TrackerTaskBlockerChip,
	TrackerTaskCurrentAssigneeChip,
	TrackerTaskOriginChip,
	TrackerTaskPriorityChip,
	TrackerTaskSprintChip,
	TrackerTaskStandChip,
	TrackerTaskStatusChip,
	TrackerTaskStreamChip,
	TrackerTaskSystemChip,
	TrackerTaskTypeChip,
	TrackerTaskWorkTypeChip,
} from "@react-client/features/tracker/components/TrackerTaskFieldChips";
import {
	KANBAN_BOARD_PRIORITIES,
	KANBAN_BOARD_ROLE_ESTIMATE_FIELDS,
	KANBAN_BOARD_STATUSES,
	KANBAN_BOARD_TASK_DESCRIPTION_MAX_LENGTH,
	KANBAN_BOARD_TASK_TITLE_MAX_LENGTH,
	KANBAN_BOARD_TASK_TYPES,
	KANBAN_BOARD_WORK_TYPES,
	kanbanBoardEffectiveEstimatePd,
	kanbanBoardSubtasksProgress,
	kanbanBoardTaskAssignees,
	kanbanBoardTaskStands,
	kanbanBoardTaskStandsTitle,
	kanbanBoardTaskSystems,
	kanbanBoardTaskSystemsTitle,
	kanbanBoardTaskHasBlocker,
	type KanbanBoardTaskRegistryDto,
} from "@smart-anketa/api-contract";
import {
	applyPlanningTaskFieldToTask,
	planningTaskParentDisplay,
	planningTaskSprintDisplay,
	roleEstimateColId,
	type PlanningTaskFieldLookups,
} from "./planningTaskCellEdit";

function uniqueSelectValues(
	...groups: Array<Iterable<string | undefined>>
): string[] {
	const values = [""];
	for (const group of groups) {
		for (const item of group) {
			const value = item?.trim();
			if (value && !values.includes(value)) values.push(value);
		}
	}
	return values;
}

function catalogTitles(items: ReadonlyArray<{ title: string }>): string[] {
	return items.map((item) => item.title);
}

export function createPlanningTaskFieldColDefs<T>(input: {
	getTask: (row: T | undefined) => KanbanBoardTaskRegistryDto | undefined;
	lookups: PlanningTaskFieldLookups;
}): ColDef<T>[] {
	const { getTask, lookups } = input;
	const isTask = (row: T | undefined) => Boolean(getTask(row));

	const editableCol = (
		colId: string,
		def: Omit<ColDef<T>, "colId">,
	): ColDef<T> => ({
		colId,
		editable: (params) => isTask(params.data),
		valueSetter: (params) => {
			const task = getTask(params.data);
			if (!task) return false;
			return applyPlanningTaskFieldToTask(
				task,
				colId,
				params.newValue,
				lookups,
			);
		},
		...def,
	});

	const taskRenderer = (
		params: ICellRendererParams<T>,
		render: (task: KanbanBoardTaskRegistryDto) => ReactNode,
	) => {
		const task = getTask(params.data);
		return task ? render(task) : null;
	};

	return [
		{
			colId: "taskKey",
			headerName: "Ключ",
			width: 120,
			valueGetter: (params) => getTask(params.data)?.taskKey ?? "",
		},
		editableCol("title", {
			headerName: "Название",
			flex: 1.4,
			minWidth: 180,
			valueGetter: (params) => getTask(params.data)?.title ?? "",
			cellEditorParams: { maxLength: KANBAN_BOARD_TASK_TITLE_MAX_LENGTH },
		}),
		editableCol("blocker", {
			headerName: "Блокер",
			width: 110,
			cellEditor: "agSelectCellEditor",
			cellEditorParams: {
				values: uniqueSelectValues(["есть"]),
			},
			valueGetter: (params) => {
				const task = getTask(params.data);
				if (!task) return "";
				return kanbanBoardTaskHasBlocker(task.content) || task.hasBlocker
					? "есть"
					: "";
			},
			cellRenderer: (params: ICellRendererParams<T>) =>
				taskRenderer(params, (task) => (
					<TrackerTaskBlockerChip
						hasBlocker={
							kanbanBoardTaskHasBlocker(task.content) || task.hasBlocker
						}
					/>
				)),
		}),
		editableCol("priority", {
			headerName: "Приоритет",
			width: 120,
			cellEditor: "agSelectCellEditor",
			cellEditorParams: (params: ICellRendererParams<T>) => ({
				values: uniqueSelectValues(catalogTitles(KANBAN_BOARD_PRIORITIES), [
					getTask(params.data)?.priorityTitle,
				]),
			}),
			valueGetter: (params) => getTask(params.data)?.priorityTitle ?? "",
			cellRenderer: (params: ICellRendererParams<T>) =>
				taskRenderer(params, (task) => (
					<TrackerTaskPriorityChip
						priority={task.content.priority}
						priorityTitle={task.priorityTitle}
					/>
				)),
		}),
		{
			colId: "project",
			headerName: "Проект",
			flex: 0.8,
			minWidth: 120,
			valueGetter: (params) =>
				trackerProjectFilterText({
					projectCode: getTask(params.data)?.projectCode,
					projectName: getTask(params.data)?.projectName,
				}),
			cellRenderer: (params: ICellRendererParams<T>) =>
				taskRenderer(params, (task) => (
					<TrackerProjectChips
						projectCode={task.projectCode}
						projectName={task.projectName}
					/>
				)),
		},
		{
			colId: "board",
			headerName: "Доска",
			flex: 0.8,
			minWidth: 120,
			valueGetter: (params) =>
				trackerBoardFilterText({
					boardKey: getTask(params.data)?.boardKey,
					boardName: getTask(params.data)?.boardName,
				}),
			cellRenderer: (params: ICellRendererParams<T>) =>
				taskRenderer(params, (task) => (
					<TrackerBoardChips
						boardKey={task.boardKey}
						boardName={task.boardName}
					/>
				)),
		},
		editableCol("status", {
			headerName: "Статус",
			width: 180,
			cellEditor: "agSelectCellEditor",
			cellEditorParams: (params: ICellRendererParams<T>) => ({
				values: uniqueSelectValues(catalogTitles(KANBAN_BOARD_STATUSES), [
					getTask(params.data)?.statusTitle,
				]),
			}),
			valueGetter: (params) => getTask(params.data)?.statusTitle ?? "",
			cellRenderer: (params: ICellRendererParams<T>) =>
				taskRenderer(params, (task) => (
					<TrackerTaskStatusChip
						statusId={task.parentId}
						statusTitle={task.statusTitle}
					/>
				)),
		}),
		editableCol("taskType", {
			headerName: "Тип",
			width: 120,
			cellEditor: "agSelectCellEditor",
			cellEditorParams: (params: ICellRendererParams<T>) => ({
				values: uniqueSelectValues(catalogTitles(KANBAN_BOARD_TASK_TYPES), [
					getTask(params.data)?.taskTypeTitle,
				]),
			}),
			valueGetter: (params) => getTask(params.data)?.taskTypeTitle ?? "",
			cellRenderer: (params: ICellRendererParams<T>) =>
				taskRenderer(params, (task) => (
					<TrackerTaskTypeChip
						taskType={task.content.taskType}
						taskTypeTitle={task.taskTypeTitle}
					/>
				)),
		}),
		editableCol("workType", {
			headerName: "Тип работ",
			minWidth: 180,
			flex: 1,
			cellEditor: "agSelectCellEditor",
			cellEditorParams: (params: ICellRendererParams<T>) => ({
				values: uniqueSelectValues(catalogTitles(KANBAN_BOARD_WORK_TYPES), [
					getTask(params.data)?.workTypeTitle,
				]),
			}),
			valueGetter: (params) => getTask(params.data)?.workTypeTitle ?? "",
			cellRenderer: (params: ICellRendererParams<T>) =>
				taskRenderer(params, (task) => (
					<TrackerTaskWorkTypeChip
						workType={task.content.workType}
						workTypeTitle={task.workTypeTitle}
					/>
				)),
		}),
		editableCol("assignees", {
			headerName: "Исполнители",
			minWidth: 160,
			flex: 0.9,
			cellEditor: "agTextCellEditor",
			valueGetter: (params) => {
				const task = getTask(params.data);
				if (!task) return "";
				return (
					task.assigneeTitle ||
					kanbanBoardTaskAssignees(task.content).join(", ")
				);
			},
			cellRenderer: (params: ICellRendererParams<T>) =>
				taskRenderer(params, (task) => (
					<TrackerTaskAssigneesChips
						assignees={
							task.assignees.length
								? task.assignees
								: kanbanBoardTaskAssignees(task.content)
						}
					/>
				)),
		}),
		editableCol("currentAssignee", {
			headerName: "Текущий исполнитель",
			minWidth: 150,
			flex: 0.8,
			cellEditor: "agSelectCellEditor",
			cellEditorParams: (params: ICellRendererParams<T>) => {
				const task = getTask(params.data);
				return {
					values: uniqueSelectValues(
						lookups.assigneeNames,
						task ? kanbanBoardTaskAssignees(task.content) : [],
						[task?.currentAssigneeTitle],
					),
				};
			},
			valueGetter: (params) =>
				getTask(params.data)?.currentAssigneeTitle ??
				getTask(params.data)?.content.currentAssignee ??
				"",
			cellRenderer: (params: ICellRendererParams<T>) =>
				taskRenderer(params, (task) => (
					<TrackerTaskCurrentAssigneeChip
						currentAssigneeTitle={
							task.currentAssigneeTitle || task.content.currentAssignee
						}
					/>
				)),
		}),
		{
			colId: "assigneeRole",
			headerName: "Роли",
			minWidth: 140,
			flex: 0.7,
			valueGetter: (params) =>
				getTask(params.data)?.assigneeRoleTitles?.join(", ") ?? "",
			cellRenderer: (params: ICellRendererParams<T>) =>
				taskRenderer(params, (task) => (
					<TrackerTaskAssigneeRolesChips
						assigneeRoles={task.assigneeRoles}
						assigneeRoleTitles={task.assigneeRoleTitles}
					/>
				)),
		},
		editableCol("createdBy", {
			headerName: "Назначил",
			minWidth: 140,
			width: 160,
			cellEditor: "agSelectCellEditor",
			cellEditorParams: (params: ICellRendererParams<T>) => ({
				values: uniqueSelectValues(lookups.assigneeNames, [
					getTask(params.data)?.createdBy ?? undefined,
				]),
			}),
			valueGetter: (params) => getTask(params.data)?.createdBy ?? "",
		}),
		editableCol("customer", {
			headerName: "Заказчик",
			minWidth: 120,
			width: 140,
			cellEditor: "agSelectCellEditor",
			cellEditorParams: (params: ICellRendererParams<T>) => ({
				values: uniqueSelectValues(lookups.customerNames, [
					getTask(params.data)?.customer,
					getTask(params.data)?.content.customer,
				]),
			}),
			valueGetter: (params) =>
				getTask(params.data)?.customer ??
				getTask(params.data)?.content.customer ??
				"",
		}),
		editableCol("estimatePd", {
			headerName: "Итого, чд",
			width: 100,
			type: "numericColumn",
			valueGetter: (params) => {
				const task = getTask(params.data);
				if (!task) return "";
				return (
					task.effectiveEstimatePd ??
					kanbanBoardEffectiveEstimatePd(task.content) ??
					task.estimatePd ??
					""
				);
			},
		}),
		...KANBAN_BOARD_ROLE_ESTIMATE_FIELDS.map((field) =>
			editableCol(roleEstimateColId(field.key), {
				headerName: `${field.title}, чд`,
				width: 120,
				type: "numericColumn",
				valueGetter: (params) => {
					const task = getTask(params.data);
					if (!task) return "";
					return (
						task.content.roleEstimates?.[field.key] ??
						task.roleEstimates?.[field.key] ??
						""
					);
				},
			}),
		),
		editableCol("dueDate", {
			headerName: "Срок",
			width: 120,
			valueGetter: (params) =>
				getTask(params.data)?.dueDate ??
				getTask(params.data)?.content.dueDate ??
				"",
		}),
		editableCol("parentTask", {
			headerName: "Родитель",
			minWidth: 160,
			flex: 0.8,
			cellEditor: "agSelectCellEditor",
			cellEditorParams: (params: ICellRendererParams<T>) => {
				const task = getTask(params.data);
				return {
					values: uniqueSelectValues(
						lookups.parentTaskOptions.map((item) => item.label),
						[task ? planningTaskParentDisplay(task, lookups) : ""],
					),
				};
			},
			valueGetter: (params) => {
				const task = getTask(params.data);
				return task ? planningTaskParentDisplay(task, lookups) : "";
			},
		}),
		editableCol("sprintId", {
			headerName: "Спринт",
			minWidth: 160,
			flex: 0.8,
			cellEditor: "agSelectCellEditor",
			cellEditorParams: (params: ICellRendererParams<T>) => {
				const task = getTask(params.data);
				return {
					values: uniqueSelectValues(
						lookups.sprintOptions.map((item) => item.label),
						[task ? planningTaskSprintDisplay(task, lookups) : ""],
					),
				};
			},
			valueGetter: (params) => {
				const task = getTask(params.data);
				return task ? planningTaskSprintDisplay(task, lookups) : "";
			},
			cellRenderer: (params: ICellRendererParams<T>) =>
				taskRenderer(params, (task) => (
					<TrackerTaskSprintChip
						sprintTitle={planningTaskSprintDisplay(task, lookups)}
					/>
				)),
		}),
		editableCol("streamCustomer", {
			headerName: "Стрим",
			minWidth: 140,
			flex: 0.8,
			cellEditor: "agSelectCellEditor",
			cellEditorParams: (params: ICellRendererParams<T>) => ({
				values: uniqueSelectValues(lookups.streamNames, [
					getTask(params.data)?.streamCustomer,
					getTask(params.data)?.content.streamCustomer,
				]),
			}),
			valueGetter: (params) =>
				getTask(params.data)?.streamCustomer ??
				getTask(params.data)?.content.streamCustomer ??
				"",
			cellRenderer: (params: ICellRendererParams<T>) =>
				taskRenderer(params, (task) => (
					<TrackerTaskStreamChip
						streamCustomer={task.streamCustomer || task.content.streamCustomer}
					/>
				)),
		}),
		editableCol("stand", {
			headerName: "Стенд",
			width: 180,
			cellEditor: "agTextCellEditor",
			valueGetter: (params) => {
				const task = getTask(params.data);
				if (!task) return "";
				return task.standTitle || kanbanBoardTaskStandsTitle(task.content);
			},
			cellRenderer: (params: ICellRendererParams<T>) =>
				taskRenderer(params, (task) => (
					<TrackerTaskStandChip
						stands={
							task.stands?.length
								? task.stands
								: kanbanBoardTaskStands(task.content)
						}
						stand={task.stand ?? task.content.stand}
						standTitle={task.standTitle}
					/>
				)),
		}),
		editableCol("system", {
			headerName: "Система",
			width: 180,
			cellEditor: "agTextCellEditor",
			valueGetter: (params) => {
				const task = getTask(params.data);
				if (!task) return "";
				return (
					task.systemTitle ||
					kanbanBoardTaskSystemsTitle(task.content)
				);
			},
			cellRenderer: (params: ICellRendererParams<T>) =>
				taskRenderer(params, (task) => (
					<TrackerTaskSystemChip
						systems={
							task.systems?.length
								? task.systems
								: kanbanBoardTaskSystems(task.content)
						}
						system={task.system ?? task.content.system}
						systemTitle={task.systemTitle}
					/>
				)),
		}),
		{
			colId: "origin",
			headerName: "Стенд данных",
			width: 130,
			valueGetter: (params) => getTask(params.data)?.origin ?? "",
			cellRenderer: (params: ICellRendererParams<T>) =>
				taskRenderer(params, (task) => (
					<TrackerTaskOriginChip origin={task.origin} />
				)),
		},
		editableCol("description", {
			headerName: "Описание",
			minWidth: 200,
			flex: 1.2,
			cellEditor: "agLargeTextCellEditor",
			cellEditorParams: {
				maxLength: KANBAN_BOARD_TASK_DESCRIPTION_MAX_LENGTH,
				rows: 12,
				cols: 60,
			},
			valueGetter: (params) => getTask(params.data)?.content.description ?? "",
		}),
		{
			colId: "progress",
			headerName: "Прогресс",
			width: 110,
			valueGetter: (params) => {
				const task = getTask(params.data);
				if (!task) return "";
				const progress = kanbanBoardSubtasksProgress(task.content);
				if (!progress) return "";
				return `${progress.done}/${progress.total}`;
			},
		},
		editableCol("backlogNumber", {
			headerName: "№ бэклога",
			width: 110,
			type: "numericColumn",
			valueGetter: (params) => {
				const task = getTask(params.data);
				if (!task) return "";
				return task.backlogNumber ?? task.content.backlogNumber ?? "";
			},
		}),
		{
			colId: "createdAt",
			headerName: "Создано",
			minWidth: 170,
			valueGetter: (params) => getTask(params.data)?.createdAt ?? "",
			valueFormatter: (params) => trackerDateFormatter(params.value),
		},
		{
			colId: "updatedAt",
			headerName: "Обновлено",
			minWidth: 170,
			valueGetter: (params) => getTask(params.data)?.updatedAt ?? "",
			valueFormatter: (params) => trackerDateFormatter(params.value),
		},
	];
}
