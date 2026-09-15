import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { Link } from "react-router";
import {
	KANBAN_BOARD_RELATED_TASKS_MAX,
	normalizeKanbanBoardRelatedTaskIds,
	type KanbanBoardTaskRegistryDto,
} from "@smart-anketa/api-contract";
import { FuzzyAutocomplete } from "@react-client/common/muiCustom/FuzzyAutocomplete";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { trackerTaskPath } from "@react-client/features/kanban-board/kanban-task-paths";
import { useMemo } from "react";

type RelatedTaskOption = {
	id: string;
	label: string;
};

const formatRelatedTaskLabel = (task: KanbanBoardTaskRegistryDto): string =>
	`${task.taskKey} · ${task.title}`;

type Props = {
	relatedTaskIds: string[];
	onChange: (ids: string[]) => void;
	tasks: KanbanBoardTaskRegistryDto[];
	currentTaskId?: string;
	disabled?: boolean;
	loading?: boolean;
};

export function KanbanRelatedTasksPanel({
	relatedTaskIds,
	onChange,
	tasks,
	currentTaskId,
	disabled,
	loading,
}: Props) {
	const tasksById = useMemo(() => {
		const map = new Map<string, KanbanBoardTaskRegistryDto>();
		for (const task of tasks) {
			map.set(task.id, task);
		}
		return map;
	}, [tasks]);

	const options = useMemo(
		() =>
			tasks
				.filter((row) => row.id !== currentTaskId)
				.map(
					(row): RelatedTaskOption => ({
						id: row.id,
						label: formatRelatedTaskLabel(row),
					}),
				),
		[currentTaskId, tasks],
	);

	const linkedIds = useMemo(
		() => new Set(normalizeKanbanBoardRelatedTaskIds(relatedTaskIds) ?? []),
		[relatedTaskIds],
	);

	const atLimit = linkedIds.size >= KANBAN_BOARD_RELATED_TASKS_MAX;

	const addRelated = (option: RelatedTaskOption | null) => {
		if (!option || disabled || atLimit) return;
		if (option.id === currentTaskId || linkedIds.has(option.id)) return;
		onChange([
			...(normalizeKanbanBoardRelatedTaskIds(relatedTaskIds) ?? []),
			option.id,
		]);
	};

	const removeRelated = (id: string) => {
		if (disabled) return;
		onChange(
			(normalizeKanbanBoardRelatedTaskIds(relatedTaskIds) ?? []).filter(
				(item) => item !== id,
			),
		);
	};

	return (
		<Flex
			flexDirection="column"
			gap={8}
			data-test-id="kanban-task-related-tasks"
		>
			<Typography
				variant="subtitle2"
				fontWeight={700}
				color="text.primary"
				sx={{ fontSize: "0.875rem" }}
			>
				Связанные задачи
			</Typography>
			{relatedTaskIds.length === 0 ? (
				<Typography variant="body2" color="text.secondary">
					Нет связанных задач
				</Typography>
			) : (
				<Flex flexDirection="column" gap={6}>
					{relatedTaskIds.map((id) => {
						const row = tasksById.get(id);
						const title =
							row?.title?.trim() ||
							(loading ? "Загрузка…" : "Задача недоступна");
						const keyLabel = row?.taskKey ?? (loading ? "…" : "—");
						const href = row ? trackerTaskPath(row.taskKey) : undefined;
						const body = (
							<Flex flexDirection="column" minWidth={0} flexGrow={1}>
								<Typography variant="body2" fontWeight={600} noWrap>
									{keyLabel}
								</Typography>
								<Typography
									variant="caption"
									color="text.secondary"
									noWrap
									title={title}
								>
									{title}
									{row?.statusTitle ? ` · ${row.statusTitle}` : ""}
								</Typography>
							</Flex>
						);
						return (
							<Flex
								key={id}
								alignItems="center"
								gap={8}
								minWidth={0}
								sx={{
									border: "1px solid",
									borderColor: "divider",
									borderRadius: 1,
									px: 1,
									py: 0.5,
								}}
							>
								{href ? (
									<Link
										to={href}
										style={{
											flex: 1,
											minWidth: 0,
											textDecoration: "none",
											color: "inherit",
										}}
										title="Открыть задачу"
									>
										{body}
									</Link>
								) : (
									body
								)}
								<IconButton
									size="small"
									onClick={() => removeRelated(id)}
									disabled={disabled}
									aria-label="Убрать связь"
									title="Убрать связь"
								>
									<CloseIcon fontSize="small" />
								</IconButton>
							</Flex>
						);
					})}
				</Flex>
			)}
			<Spacer space={4} />
			<FuzzyAutocomplete<RelatedTaskOption>
				label="Добавить связь"
				options={options}
				value={null}
				onChange={addRelated}
				getOptionLabel={(option) => option.label}
				getOptionValue={(option) => option.id}
				getOptionDisabled={(option) =>
					linkedIds.has(option.id) || option.id === currentTaskId
				}
				emptyLabel="— выбрать задачу —"
				searchPlaceholder="Поиск по задачам…"
				noMatchesText="Задачи не найдены"
				placeholder="Связать с задачей"
				allowEmpty={false}
				helperText={
					atLimit
						? `Не больше ${KANBAN_BOARD_RELATED_TASKS_MAX} связей`
						: undefined
				}
				disabled={disabled || loading || atLimit}
				size="small"
				data-test-id="kanban-task-related-tasks-add"
			/>
		</Flex>
	);
}
