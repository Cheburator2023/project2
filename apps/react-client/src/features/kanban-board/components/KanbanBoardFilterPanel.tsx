import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
	KANBAN_BOARD_PRIORITIES,
	KANBAN_BOARD_TASK_TYPES,
	type KanbanBoardPriorityId,
	type KanbanBoardTaskTypeId,
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
	matchCount: number;
	totalCount: number;
};

export function KanbanBoardFilterPanel({
	filters,
	onChange,
	assigneeOptions,
	createdByOptions,
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
			</Flex>
		</Flex>
	);
}
