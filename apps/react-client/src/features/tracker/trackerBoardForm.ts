import type { KanbanBoardBoardDto, KanbanBoardProjectDto } from "@smart-anketa/api-contract";
import type { TrackerFormField } from "./components/TrackerFormDialog";

export function trackerBoardProjectOptions(
	projects: KanbanBoardProjectDto[],
): { value: string; label: string }[] {
	return projects.map((project) => ({
		value: project.id,
		label: `${project.code} — ${project.name}`,
	}));
}

export function trackerBoardFormFields(
	projectOptions: { value: string; label: string }[],
): TrackerFormField[] {
	return [
		{
			name: "projectId",
			label: "Проект",
			type: "select",
			required: true,
			options: projectOptions,
		},
		{ name: "name", label: "Название", required: true },
		{
			name: "boardKey",
			label: "Ключ",
			required: true,
			autoGenerate: "brd",
			helperText:
				"Ключ доски и задач в URL — как указано, без префикса проекта.",
		},
		{ name: "description", label: "Описание", type: "multiline" },
		{ name: "sortOrder", label: "Порядок", type: "number" },
	];
}

export function trackerBoardFormValues(
	row: KanbanBoardBoardDto,
): Record<string, string> {
	return {
		projectId: row.projectId,
		name: row.name,
		boardKey: row.boardKey,
		description: row.description ?? "",
		sortOrder: String(row.sortOrder),
	};
}

export function trackerBoardWritePayload(values: Record<string, string>) {
	return {
		projectId: values.projectId,
		name: values.name,
		boardKey: values.boardKey.trim(),
		description: values.description || null,
		sortOrder: Number(values.sortOrder || 0),
	};
}
