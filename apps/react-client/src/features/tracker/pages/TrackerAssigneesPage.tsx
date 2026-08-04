import type { ColDef } from "ag-grid-community";
import {
	useCreateKanbanBoardAssignee,
	useDeleteKanbanBoardAssignee,
	useKanbanBoardAssignees,
	useUpdateKanbanBoardAssignee,
} from "@react-client/common/api/queries/kanban-board";
import { TrackerRegistryPage } from "@react-client/features/tracker/components/TrackerRegistryPage";
import { trackerDateFormatter } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import { TRACKER_EMPTY_FORM_VALUES } from "@react-client/features/tracker/trackerAutoCode";
import {
	KANBAN_BOARD_ASSIGNEE_ROLES,
	isKanbanBoardAssigneeRoleId,
	type KanbanBoardAssigneeDto,
} from "@smart-anketa/api-contract";
import { useMemo } from "react";

const parseAssigneeRole = (
	value: string,
): KanbanBoardAssigneeDto["role"] =>
	isKanbanBoardAssigneeRoleId(value) ? value : null;

const joinAssigneeName = (lastName: string, firstName: string): string =>
	[lastName.trim(), firstName.trim()].filter(Boolean).join(" ");

const splitAssigneeName = (
	name: string,
): { lastName: string; firstName: string } => {
	const trimmed = name.trim();
	if (!trimmed) return { lastName: "", firstName: "" };
	const space = trimmed.indexOf(" ");
	if (space === -1) return { lastName: trimmed, firstName: "" };
	return {
		lastName: trimmed.slice(0, space),
		firstName: trimmed.slice(space + 1).trim(),
	};
};

export function TrackerAssigneesPage() {
	const { data = [], isLoading } = useKanbanBoardAssignees();
	const createAssignee = useCreateKanbanBoardAssignee();
	const updateAssignee = useUpdateKanbanBoardAssignee();
	const deleteAssignee = useDeleteKanbanBoardAssignee();

	const roleOptions = useMemo(
		() =>
			KANBAN_BOARD_ASSIGNEE_ROLES.map((role) => ({
				value: role.id,
				label: role.title,
			})),
		[],
	);

	const columnDefs = useMemo<ColDef<KanbanBoardAssigneeDto>[]>(
		() => [
			{ field: "code", headerName: "Код", flex: 1, minWidth: 120 },
			{ field: "name", headerName: "ФИО", flex: 1.2, minWidth: 160 },
			{ field: "roleTitle", headerName: "Роль", width: 130 },
			{ field: "email", headerName: "Email", flex: 1.2, minWidth: 180 },
			{
				field: "effectiveSprintCapacityPd",
				headerName: "Ёмкость, чд",
				width: 110,
				type: "numericColumn",
			},
			{
				field: "taskCount",
				headerName: "Задач",
				width: 100,
				type: "numericColumn",
			},
			{
				field: "updatedAt",
				headerName: "Обновлено",
				minWidth: 170,
				valueFormatter: (params) => trackerDateFormatter(params.value),
			},
		],
		[],
	);

	return (
		<TrackerRegistryPage
			gridStateKey="tracker.assignees"
			title="исполнитель"
			createLabel="Создать исполнителя"
			searchPlaceholder="Поиск по коду, ФИО, email…"
			rowData={data}
			columnDefs={columnDefs}
			loading={isLoading}
			formFields={[
				{
					name: "code",
					label: "Код",
					required: true,
					autoGenerate: "usr",
					helperText: "Генерируется автоматически, можно изменить",
				},
				{ name: "lastName", label: "Фамилия", required: true },
				{ name: "firstName", label: "Имя", required: true },
				{ name: "email", label: "Email" },
				{
					name: "role",
					label: "Роль",
					type: "select",
					options: [{ value: "", label: "—" }, ...roleOptions],
				},
				{
					name: "sprintCapacityPd",
					label: "Ёмкость спринта, чд",
					type: "number",
					helperText: "Пусто — используется значение из настроек трекера",
				},
			]}
			getInitialFormValues={(row) => {
				if (!row) return TRACKER_EMPTY_FORM_VALUES;
				const { lastName, firstName } = splitAssigneeName(row.name);
				return {
					code: row.code,
					lastName,
					firstName,
					email: row.email ?? "",
					role: row.role ?? "",
					sprintCapacityPd:
						row.sprintCapacityPd === null
							? ""
							: String(row.sprintCapacityPd),
				};
			}}
			canDelete={(row) => row.taskCount === 0}
			deleteDialogTitle="Удаление исполнителей"
			deleteDialogText={(count) =>
				`Удалить ${count} исполнител(я/ей)? Исполнителей с задачами удалить нельзя.`
			}
			onCreate={async (values) => {
				await createAssignee.mutateAsync({
					code: values.code,
					name: joinAssigneeName(values.lastName, values.firstName),
					email: values.email || null,
					role: parseAssigneeRole(values.role),
					sprintCapacityPd: values.sprintCapacityPd.trim()
						? Number(values.sprintCapacityPd)
						: null,
				});
			}}
			onUpdate={async (row, values) => {
				await updateAssignee.mutateAsync({
					id: row.id,
					data: {
						code: values.code,
						name: joinAssigneeName(values.lastName, values.firstName),
						email: values.email || null,
						role: parseAssigneeRole(values.role),
						sprintCapacityPd: values.sprintCapacityPd.trim()
							? Number(values.sprintCapacityPd)
							: null,
					},
				});
			}}
			onDelete={async (rows) => {
				for (const row of rows) {
					await deleteAssignee.mutateAsync(row.id);
				}
			}}
		/>
	);
}
