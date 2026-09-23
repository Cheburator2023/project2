import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
	KANBAN_BOARD_PRIORITIES,
	KANBAN_BOARD_STANDS,
	KANBAN_BOARD_SYSTEMS,
	KANBAN_BOARD_TASK_TYPES,
	KANBAN_BOARD_WORK_TYPES,
	type KanbanBoardPriorityId,
	type KanbanBoardTaskTypeId,
	type KanbanBoardWorkTypeId,
} from "@smart-anketa/api-contract";
import { Flex } from "@react-client/common/primitives/Flex";
import {
	EMPTY_KANBAN_BOARD_TASK_FILTERS,
	type KanbanBoardTaskFilters,
} from "@react-client/features/kanban-board/kanban-board-task-filter";

type PersonOption = { value: string; label: string };

type Props = {
	filters: KanbanBoardTaskFilters;
	onChange: (next: KanbanBoardTaskFilters) => void;
	assigneeOptions: PersonOption[];
	createdByOptions: PersonOption[];
	statusOptions: PersonOption[];
	customerOptions: PersonOption[];
	sprintOptions: PersonOption[];
	streamOptions: PersonOption[];
	releaseOptions: PersonOption[];
	parentOptions: PersonOption[];
	tagOptions: PersonOption[];
	backlogOptions: PersonOption[];
	matchCount: number;
	totalCount: number;
};

function FilterSelect({
	id,
	label,
	value,
	onChange,
	options,
	minWidth = 170,
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: PersonOption[];
	minWidth?: number;
}) {
	return (
		<FormControl size="small" sx={{ minWidth }}>
			<InputLabel id={id}>{label}</InputLabel>
			<Select
				labelId={id}
				label={label}
				value={value}
				onChange={(event) => onChange(event.target.value)}
			>
				<MenuItem value="">Все</MenuItem>
				{options.map((option) => (
					<MenuItem key={option.value} value={option.value}>
						{option.label}
					</MenuItem>
				))}
			</Select>
		</FormControl>
	);
}

export function KanbanBoardFilterPanel({
	filters,
	onChange,
	assigneeOptions,
	createdByOptions,
	statusOptions,
	customerOptions,
	sprintOptions,
	streamOptions,
	releaseOptions,
	parentOptions,
	tagOptions,
	backlogOptions,
	matchCount,
	totalCount,
}: Props) {
	const patch = (partial: Partial<KanbanBoardTaskFilters>) => {
		onChange({ ...filters, ...partial });
	};

	return (
		<Flex
			flexDirection="column"
			gap={10}
			sx={{
				px: 1.5,
				py: 1.25,
				borderBottom: "1px solid",
				borderColor: "divider",
				bgcolor: (theme) =>
					theme.palette.mode === "dark"
						? "rgba(255,255,255,0.03)"
						: "grey.50",
			}}
			data-test-id="kanban-board-filter-panel"
		>
			<Flex alignItems="center" justifyContent="space-between" gap={8} wrap="wrap">
				<Typography variant="subtitle2" fontWeight={700}>
					Фильтры
				</Typography>
				<Flex alignItems="center" gap={8}>
					<Typography variant="caption" color="text.secondary">
						Показано {matchCount} из {totalCount}
					</Typography>
					<Button
						size="small"
						onClick={() => onChange(EMPTY_KANBAN_BOARD_TASK_FILTERS)}
					>
						Сбросить
					</Button>
				</Flex>
			</Flex>

			<Flex gap={10} wrap="wrap" alignItems="flex-start">
				<FilterSelect
					id="kanban-filter-status"
					label="Статус"
					value={filters.status}
					options={statusOptions}
					onChange={(status) => patch({ status })}
				/>
				<FormControl size="small" sx={{ minWidth: 180 }}>
					<InputLabel id="kanban-filter-assignee">Исполнитель</InputLabel>
					<Select
						labelId="kanban-filter-assignee"
						label="Исполнитель"
						value={filters.assignee}
						onChange={(event) => patch({ assignee: event.target.value })}
					>
						<MenuItem value="">Все</MenuItem>
						{assigneeOptions.map((option) => (
							<MenuItem key={option.value} value={option.value}>
								{option.label}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				<FormControl size="small" sx={{ minWidth: 180 }}>
					<InputLabel id="kanban-filter-created-by">Назначил</InputLabel>
					<Select
						labelId="kanban-filter-created-by"
						label="Назначил"
						value={filters.createdBy}
						onChange={(event) => patch({ createdBy: event.target.value })}
					>
						<MenuItem value="">Все</MenuItem>
						{createdByOptions.map((option) => (
							<MenuItem key={option.value} value={option.value}>
								{option.label}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				<FormControl size="small" sx={{ minWidth: 160 }}>
					<InputLabel id="kanban-filter-priority">Важность</InputLabel>
					<Select
						labelId="kanban-filter-priority"
						label="Важность"
						value={filters.priority}
						onChange={(event) =>
							patch({
								priority: event.target.value as KanbanBoardPriorityId | "",
							})
						}
					>
						<MenuItem value="">Все</MenuItem>
						{KANBAN_BOARD_PRIORITIES.map((option) => (
							<MenuItem key={option.id} value={option.id}>
								{option.title}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				<FormControl size="small" sx={{ minWidth: 160 }}>
					<InputLabel id="kanban-filter-task-type">Тип задачи</InputLabel>
					<Select
						labelId="kanban-filter-task-type"
						label="Тип задачи"
						value={filters.taskType}
						onChange={(event) =>
							patch({
								taskType: event.target.value as KanbanBoardTaskTypeId | "",
							})
						}
					>
						<MenuItem value="">Все</MenuItem>
						{KANBAN_BOARD_TASK_TYPES.map((option) => (
							<MenuItem key={option.id} value={option.id}>
								{option.title}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				<FormControl size="small" sx={{ minWidth: 200 }}>
					<InputLabel id="kanban-filter-work-type">Тип работ</InputLabel>
					<Select
						labelId="kanban-filter-work-type"
						label="Тип работ"
						value={filters.workType}
						onChange={(event) =>
							patch({
								workType: event.target.value as KanbanBoardWorkTypeId | "",
							})
						}
					>
						<MenuItem value="">Все</MenuItem>
						{KANBAN_BOARD_WORK_TYPES.map((option) => (
							<MenuItem key={option.id} value={option.id}>
								{option.title}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				<FormControl size="small" sx={{ minWidth: 160 }}>
					<InputLabel id="kanban-filter-stand">Стенд</InputLabel>
					<Select
						labelId="kanban-filter-stand"
						label="Стенд"
						value={filters.stand}
						onChange={(event) => patch({ stand: event.target.value })}
					>
						<MenuItem value="">Все</MenuItem>
						<MenuItem value="dev">Dev</MenuItem>
						{KANBAN_BOARD_STANDS.map((option) => (
							<MenuItem key={option.id} value={option.id}>
								{option.title}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				<FormControl size="small" sx={{ minWidth: 180 }}>
					<InputLabel id="kanban-filter-system">Система / приложение</InputLabel>
					<Select
						labelId="kanban-filter-system"
						label="Система / приложение"
						value={filters.system}
						onChange={(event) => patch({ system: event.target.value })}
					>
						<MenuItem value="">Все</MenuItem>
						{KANBAN_BOARD_SYSTEMS.map((option) => (
							<MenuItem key={option.id} value={option.id}>
								{option.title}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				<FilterSelect
					id="kanban-filter-customer"
					label="Заказчик"
					value={filters.customer}
					options={customerOptions}
					onChange={(customer) => patch({ customer })}
				/>
				<FilterSelect
					id="kanban-filter-sprint"
					label="Спринт"
					value={filters.sprintId}
					options={sprintOptions}
					onChange={(sprintId) => patch({ sprintId })}
					minWidth={220}
				/>
				<FilterSelect
					id="kanban-filter-stream"
					label="Стрим-заказчик"
					value={filters.stream}
					options={streamOptions}
					onChange={(stream) => patch({ stream })}
				/>
				<FilterSelect
					id="kanban-filter-release"
					label="Релиз"
					value={filters.releaseId}
					options={releaseOptions}
					onChange={(releaseId) => patch({ releaseId })}
				/>
				<FormControl size="small" sx={{ minWidth: 140 }}>
					<InputLabel id="kanban-filter-blocker">Блокер</InputLabel>
					<Select
						labelId="kanban-filter-blocker"
						label="Блокер"
						value={filters.blocker}
						onChange={(event) =>
							patch({
								blocker: event.target.value as KanbanBoardTaskFilters["blocker"],
							})
						}
					>
						<MenuItem value="">Все</MenuItem>
						<MenuItem value="yes">Есть</MenuItem>
						<MenuItem value="no">Нет</MenuItem>
					</Select>
				</FormControl>
				<FilterSelect
					id="kanban-filter-parent"
					label="Родительская задача"
					value={filters.parent}
					options={parentOptions}
					onChange={(parent) => patch({ parent })}
					minWidth={220}
				/>
				<FilterSelect
					id="kanban-filter-tag"
					label="Метка"
					value={filters.tag}
					options={tagOptions}
					onChange={(tag) => patch({ tag })}
				/>
				<FilterSelect
					id="kanban-filter-backlog"
					label="№ в бэклоге"
					value={filters.backlog}
					options={backlogOptions}
					onChange={(backlog) => patch({ backlog })}
					minWidth={140}
				/>

				<TextField
					size="small"
					type="date"
					label="Срок с"
					value={filters.dueFrom}
					onChange={(event) => patch({ dueFrom: event.target.value })}
					InputLabelProps={{ shrink: true }}
					sx={{ width: 150 }}
				/>
				<TextField
					size="small"
					type="date"
					label="Срок по"
					value={filters.dueTo}
					onChange={(event) => patch({ dueTo: event.target.value })}
					InputLabelProps={{ shrink: true }}
					sx={{ width: 150 }}
				/>
				<TextField
					size="small"
					type="date"
					label="Создано с"
					value={filters.createdFrom}
					onChange={(event) => patch({ createdFrom: event.target.value })}
					InputLabelProps={{ shrink: true }}
					sx={{ width: 150 }}
				/>
				<TextField
					size="small"
					type="date"
					label="Создано по"
					value={filters.createdTo}
					onChange={(event) => patch({ createdTo: event.target.value })}
					InputLabelProps={{ shrink: true }}
					sx={{ width: 150 }}
				/>
				<TextField
					size="small"
					type="date"
					label="Обновлено с"
					value={filters.updatedFrom}
					onChange={(event) => patch({ updatedFrom: event.target.value })}
					InputLabelProps={{ shrink: true }}
					sx={{ width: 160 }}
				/>
				<TextField
					size="small"
					type="date"
					label="Обновлено по"
					value={filters.updatedTo}
					onChange={(event) => patch({ updatedTo: event.target.value })}
					InputLabelProps={{ shrink: true }}
					sx={{ width: 160 }}
				/>
			</Flex>
		</Flex>
	);
}
