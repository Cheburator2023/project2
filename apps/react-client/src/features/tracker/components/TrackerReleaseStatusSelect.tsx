import {
	KANBAN_BOARD_RELEASE_STATUSES,
	isKanbanBoardReleaseStatusId,
	kanbanBoardReleaseStatusColor,
	kanbanBoardReleaseStatusTitle,
	type KanbanBoardReleaseStatusId,
} from "@smart-anketa/api-contract";
import {
	KanbanTaskSelectField,
	type KanbanTaskChipOption,
} from "@react-client/features/kanban-board/components/KanbanTaskSelectField";

const STATUS_OPTIONS: KanbanTaskChipOption[] =
	KANBAN_BOARD_RELEASE_STATUSES.map((item) => ({
		value: item.id,
		label: item.title,
		color: item.color,
	}));

type Props = {
	value: string;
	onChange: (value: KanbanBoardReleaseStatusId) => void;
	disabled?: boolean;
	label?: string;
};

export function TrackerReleaseStatusSelect({
	value,
	onChange,
	disabled,
	label,
}: Props) {
	return (
		<KanbanTaskSelectField
			label={label}
			value={isKanbanBoardReleaseStatusId(value) ? value : ""}
			options={STATUS_OPTIONS}
			onChange={(next) => {
				if (isKanbanBoardReleaseStatusId(next)) onChange(next);
			}}
			emptyLabel={kanbanBoardReleaseStatusTitle(value) || "Статус"}
			emptyColor={kanbanBoardReleaseStatusColor(value)}
			fullWidth
			size="small"
			disabled={disabled}
		/>
	);
}
