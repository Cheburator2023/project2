import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { Link } from "react-router";
import {
	KANBAN_BOARD_DEFAULT_RELATION_TYPE_ID,
	KANBAN_BOARD_RELATED_TASKS_MAX,
	KANBAN_BOARD_RELATION_TYPES,
	kanbanBoardRelationTypeColor,
	kanbanBoardRelationTypeTitle,
	normalizeKanbanBoardRelatedLinks,
	upsertKanbanBoardRelatedLink,
	type KanbanBoardRelatedTaskLink,
	type KanbanBoardRelationTypeId,
	type KanbanBoardTaskRegistryDto,
} from "@smart-anketa/api-contract";
import { FuzzyAutocomplete } from "@react-client/common/muiCustom/FuzzyAutocomplete";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import {
	KanbanTaskSelectField,
	type KanbanTaskChipOption,
} from "@react-client/features/kanban-board/components/KanbanTaskSelectField";
import { trackerTaskPath } from "@react-client/features/kanban-board/kanban-task-paths";
import { useMemo, useState } from "react";

type RelatedTaskOption = {
	id: string;
	label: string;
};

const formatRelatedTaskLabel = (task: KanbanBoardTaskRegistryDto): string =>
	`${task.taskKey} · ${task.title}`;

const RELATION_OPTIONS: KanbanTaskChipOption[] =
	KANBAN_BOARD_RELATION_TYPES.map((item) => ({
		value: item.id,
		label: item.title,
		color: item.color,
	}));

type Props = {
	relatedLinks: KanbanBoardRelatedTaskLink[];
	onChange: (links: KanbanBoardRelatedTaskLink[]) => void;
	tasks: KanbanBoardTaskRegistryDto[];
	currentTaskId?: string;
	disabled?: boolean;
	loading?: boolean;
};

export function KanbanRelatedTasksPanel({
	relatedLinks,
	onChange,
	tasks,
	currentTaskId,
	disabled,
	loading,
}: Props) {
	const [draftType, setDraftType] = useState<KanbanBoardRelationTypeId>(
		KANBAN_BOARD_DEFAULT_RELATION_TYPE_ID,
	);
	const links = useMemo(
		() => normalizeKanbanBoardRelatedLinks(relatedLinks),
		[relatedLinks],
	);
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
		() => new Set(links.map((item) => item.taskId)),
		[links],
	);
	const atLimit = linkedIds.size >= KANBAN_BOARD_RELATED_TASKS_MAX;

	const addRelated = (option: RelatedTaskOption | null) => {
		if (!option || disabled || atLimit) return;
		if (option.id === currentTaskId || linkedIds.has(option.id)) return;
		onChange(
			upsertKanbanBoardRelatedLink(links, {
				taskId: option.id,
				type: draftType,
			}),
		);
	};

	const changeType = (taskId: string, type: string) => {
		if (disabled) return;
		onChange(
			upsertKanbanBoardRelatedLink(links, {
				taskId,
				type: type as KanbanBoardRelationTypeId,
			}),
		);
	};

	const removeRelated = (taskId: string) => {
		if (disabled) return;
		onChange(links.filter((item) => item.taskId !== taskId));
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
			{links.length === 0 ? (
				<Typography variant="body2" color="text.secondary">
					Нет связанных задач
				</Typography>
			) : (
				<Flex flexDirection="column" gap={6}>
					{links.map((link) => {
						const row = tasksById.get(link.taskId);
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
								key={link.taskId}
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
								<Flex sx={{ width: 168, flexShrink: 0 }}>
									<KanbanTaskSelectField
										value={link.type}
										options={RELATION_OPTIONS}
										onChange={(value) => changeType(link.taskId, value)}
										emptyLabel={kanbanBoardRelationTypeTitle(link.type)}
										emptyColor={kanbanBoardRelationTypeColor(link.type)}
										fullWidth
										size="small"
										disabled={disabled}
									/>
								</Flex>
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
									onClick={() => removeRelated(link.taskId)}
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
			<Flex gap={8} alignItems="flex-start" minWidth={0}>
				<Flex sx={{ width: 168, flexShrink: 0 }}>
					<KanbanTaskSelectField
						label="Тип связи"
						value={draftType}
						options={RELATION_OPTIONS}
						onChange={(value) =>
							setDraftType(value as KanbanBoardRelationTypeId)
						}
						fullWidth
						size="small"
						disabled={disabled || atLimit}
					/>
				</Flex>
				<Flex flexGrow={1} minWidth={0}>
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
			</Flex>
		</Flex>
	);
}
