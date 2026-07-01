import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useUpdateKanbanBoardTask } from "@react-client/common/api/queries/kanban-board";
import {
	KANBAN_BOARD_SUBTASK_STATUSES,
	kanbanBoardSubtaskDefaultStatus,
	kanbanBoardSubtaskIsDone,
	kanbanBoardSubtaskStatusColor,
	kanbanBoardSubtaskStatusTitle,
	kanbanBoardSubtasksProgress,
	normalizeKanbanBoardTaskContent,
	type KanbanBoardSubtaskItem,
	type KanbanBoardSubtaskStatusId,
	type KanbanBoardTaskContent,
} from "@smart-anketa/api-contract";
import { ulid } from "ulid";
import {
	useEffect,
	useState,
	type KeyboardEvent,
	type MouseEvent,
} from "react";
import { Flex } from "@react-client/common/primitives/Flex";

const SUBTASK_STATUS_OPTIONS = KANBAN_BOARD_SUBTASK_STATUSES.map((option) => ({
	value: option.id,
	label: option.title,
	color: kanbanBoardSubtaskStatusColor(option.id),
}));

const CHECKBOX_SLOT = { compact: 22, default: 26 } as const;
const ROW_MIN_HEIGHT = { compact: 26, default: 32 } as const;

type ChecklistProps = {
	items: KanbanBoardSubtaskItem[];
	onChange: (items: KanbanBoardSubtaskItem[]) => void;
	/** Сохранение на сервер (карточка доски): toggle, add, remove, blur текста */
	onCommit?: (items: KanbanBoardSubtaskItem[]) => void;
	disabled?: boolean;
	compact?: boolean;
	/** Не открывать карточку при клике по чеклисту на доске */
	stopCardClick?: boolean;
};

const stopCardNavigation = (
	event: MouseEvent,
	stopCardClick: boolean | undefined,
) => {
	if (stopCardClick) {
		event.stopPropagation();
	}
};

function KanbanSubtaskStatusPill({
	value,
	onChange,
	disabled,
	compact,
	onMouseDown,
}: {
	value: KanbanBoardSubtaskStatusId;
	onChange: (status: KanbanBoardSubtaskStatusId) => void;
	disabled?: boolean;
	compact?: boolean;
	onMouseDown?: (event: MouseEvent) => void;
}) {
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const color = kanbanBoardSubtaskStatusColor(value);
	const label = kanbanBoardSubtaskStatusTitle(value);
	const open = Boolean(anchorEl);

	return (
		<>
			<Box
				component="button"
				type="button"
				disabled={disabled}
				onMouseDown={onMouseDown}
				onClick={(event) => {
					event.stopPropagation();
					if (!disabled) setAnchorEl(event.currentTarget);
				}}
				title={`Статус: ${label}`}
				aria-label={`Статус подзадачи: ${label}`}
				aria-haspopup="listbox"
				aria-expanded={open}
				sx={{
					flexShrink: 0,
					display: "inline-flex",
					alignItems: "center",
					gap: 0.125,
					px: compact ? 0.625 : 0.75,
					py: compact ? 0.125 : 0.25,
					border: "none",
					borderRadius: "6px",
					bgcolor: alpha(color, 0.12),
					color,
					fontSize: compact ? "0.625rem" : "0.6875rem",
					fontWeight: 600,
					lineHeight: 1.2,
					letterSpacing: compact ? 0 : "0.02em",
					textTransform: compact ? "none" : "uppercase",
					cursor: disabled ? "default" : "pointer",
					opacity: disabled ? 0.6 : 1,
					maxWidth: compact ? 88 : 96,
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
					"&:hover": disabled
						? undefined
						: {
								bgcolor: alpha(color, 0.2),
							},
				}}
			>
				{label}
				<KeyboardArrowDownIcon
					sx={{ fontSize: compact ? 12 : 14, flexShrink: 0 }}
				/>
			</Box>
			<Menu
				anchorEl={anchorEl}
				open={open}
				onClose={() => setAnchorEl(null)}
				onClick={(event) => event.stopPropagation()}
				slotProps={{
					paper: {
						sx: { minWidth: 140 },
					},
				}}
			>
				{SUBTASK_STATUS_OPTIONS.map((option) => (
					<MenuItem
						key={option.value}
						selected={option.value === value}
						dense
						onClick={() => {
							onChange(option.value);
							setAnchorEl(null);
						}}
						sx={{ gap: 1 }}
					>
						<Box
							sx={{
								width: 8,
								height: 8,
								borderRadius: "50%",
								bgcolor: option.color,
								flexShrink: 0,
							}}
						/>
						<Typography variant="body2">{option.label}</Typography>
					</MenuItem>
				))}
			</Menu>
		</>
	);
}

export function KanbanSubtasksChecklist({
	items,
	onChange,
	onCommit,
	disabled = false,
	compact = false,
	stopCardClick = false,
}: ChecklistProps) {
	const [draft, setDraft] = useState("");
	const progress = kanbanBoardSubtasksProgress({ subtasks: items });
	const checkboxSlot = compact ? CHECKBOX_SLOT.compact : CHECKBOX_SLOT.default;
	const rowMinHeight = compact
		? ROW_MIN_HEIGHT.compact
		: ROW_MIN_HEIGHT.default;
	const textSize = compact ? "0.8125rem" : "0.875rem";

	const apply = (next: KanbanBoardSubtaskItem[], commit = false) => {
		onChange(next);
		if (commit) {
			onCommit?.(next);
		}
	};

	const toggleDone = (id: string, checked: boolean) => {
		apply(
			items.map((item) => {
				if (item.id !== id) return item;
				return {
					...item,
					status: checked ? "done" : "next_up",
				};
			}),
			true,
		);
	};

	const setStatus = (id: string, status: KanbanBoardSubtaskStatusId) => {
		apply(
			items.map((item) => (item.id === id ? { ...item, status } : item)),
			true,
		);
	};

	const updateText = (id: string, text: string) => {
		onChange(items.map((item) => (item.id === id ? { ...item, text } : item)));
	};

	const commitText = (id: string, text: string) => {
		const trimmed = text.trim();
		if (!trimmed) {
			apply(
				items.filter((item) => item.id !== id),
				true,
			);
			return;
		}
		apply(
			items.map((item) => (item.id === id ? { ...item, text: trimmed } : item)),
			true,
		);
	};

	const removeItem = (id: string) => {
		apply(
			items.filter((item) => item.id !== id),
			true,
		);
	};

	const addItem = () => {
		const text = draft.trim();
		if (!text) return;
		apply(
			[
				...items,
				{
					id: ulid(),
					text,
					status: kanbanBoardSubtaskDefaultStatus(),
				},
			],
			true,
		);
		setDraft("");
	};

	const handleDraftKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Enter") {
			event.preventDefault();
			addItem();
		}
	};

	const stopIfNeeded = (event: MouseEvent) =>
		stopCardNavigation(event, stopCardClick);

	return (
		<Stack
			spacing={compact ? 0.375 : 0.75}
			onClick={stopIfNeeded}
			onMouseDown={stopIfNeeded}
			sx={{ minWidth: 0 }}
		>
			<Stack
				direction="row"
				alignItems="center"
				justifyContent="space-between"
				sx={{ minHeight: 18, gap: 1 }}
			>
				<Typography
					variant="caption"
					fontWeight={600}
					color="text.secondary"
					sx={{ fontSize: compact ? "0.6875rem" : "0.75rem" }}
				>
					Подзадачи
				</Typography>
				{progress ? (
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{ fontSize: compact ? "0.6875rem" : "0.75rem", flexShrink: 0 }}
					>
						{progress.done}/{progress.total}
					</Typography>
				) : null}
			</Stack>

			{items.length ? (
				<Flex gap={12} flexDirection="column">
					{items.map((item) => {
						const isDone = kanbanBoardSubtaskIsDone(item);
						const isSkipped = item.status === "skipped";

						return (
							<Stack
								key={item.id}
								direction="row"
								alignItems="center"
								spacing={2}
								sx={{
									minHeight: rowMinHeight,
									opacity: isSkipped ? 0.5 : 1,
									"&:hover .kanban-subtask-remove": {
										opacity: disabled ? 0 : 1,
									},
								}}
							>
								<Checkbox
									size="small"
									checked={isDone}
									disabled={disabled || isSkipped}
									onChange={(_, checked) => toggleDone(item.id, checked)}
									sx={{
										p: 0,
										width: checkboxSlot,
										height: checkboxSlot,
										flexShrink: 0,
										"& .MuiSvgIcon-root": {
											fontSize: compact ? 18 : 20,
										},
									}}
									inputProps={{
										"aria-label": isDone
											? "Отметить подзадачу невыполненной"
											: "Отметить подзадачу выполненной",
									}}
								/>
								<InputBase
									value={item.text}
									onChange={(event) => updateText(item.id, event.target.value)}
									onBlur={(event) => commitText(item.id, event.target.value)}
									disabled={disabled}
									multiline={!compact}
									maxRows={compact ? 1 : 3}
									sx={{
										flex: 1,
										minWidth: 0,
										fontSize: textSize,
										lineHeight: 1.35,
										padding: "10px!important",
										textDecoration: isDone ? "line-through" : "none",
										border: "1px solid #e0e0e0",
										borderRadius: "4px",
										color: isDone ? "text.secondary" : "text.primary",
										"& .MuiInputBase-input": {
											p: "0 10px!important",
										},
									}}
								/>
								<KanbanSubtaskStatusPill
									value={item.status ?? kanbanBoardSubtaskDefaultStatus()}
									onChange={(status) => setStatus(item.id, status)}
									disabled={disabled}
									compact={compact}
									onMouseDown={stopIfNeeded}
								/>
								<IconButton
									className="kanban-subtask-remove"
									size="small"
									disabled={disabled}
									onClick={() => removeItem(item.id)}
									title="Удалить подзадачу"
									aria-label="Удалить подзадачу"
									sx={{
										p: 0.25,
										width: 22,
										height: 22,
										flexShrink: 0,
										opacity: compact ? 0.45 : 0,
										transition: "opacity 0.15s",
									}}
								>
									<CloseIcon sx={{ fontSize: 14 }} />
								</IconButton>
							</Stack>
						);
					})}
				</Flex>
			) : null}

			<Stack
				direction="row"
				alignItems="center"
				spacing={0.375}
				sx={{
					minHeight: rowMinHeight,
					...(compact
						? {}
						: {
								px: 1,
								py: 0.5,
								borderRadius: 1,
								border: "1px solid",
								borderColor: "divider",
							}),
				}}
			>
				<InputBase
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={handleDraftKeyDown}
					disabled={disabled}
					placeholder="Новая подзадача…"
					sx={{
						flex: 1,
						minWidth: 0,
						fontSize: textSize,
						color: "text.secondary",
						"& .MuiInputBase-input": {
							p: 0,
							"&::placeholder": {
								opacity: 0.7,
							},
						},
					}}
				/>
				<IconButton
					size="small"
					disabled={disabled || !draft.trim()}
					onClick={addItem}
					title="Добавить подзадачу"
					aria-label="Добавить подзадачу"
					sx={{ p: 0.25, width: 22, height: 22, flexShrink: 0 }}
				>
					<AddIcon sx={{ fontSize: 16 }} />
				</IconButton>
			</Stack>
		</Stack>
	);
}

type CardProps = {
	taskId: string;
	boardId: string;
	parentId: string;
	content: KanbanBoardTaskContent;
	onContentUpdated: (taskId: string, content: KanbanBoardTaskContent) => void;
	isSaving?: boolean;
};

export function KanbanTaskCardSubtasks({
	taskId,
	boardId,
	parentId,
	content,
	onContentUpdated,
	isSaving = false,
}: CardProps) {
	const updateTask = useUpdateKanbanBoardTask();
	const [items, setItems] = useState(content.subtasks ?? []);
	const busy = isSaving || updateTask.isPending;

	useEffect(() => {
		setItems(content.subtasks ?? []);
	}, [content.subtasks]);

	const persist = async (nextItems: KanbanBoardSubtaskItem[]) => {
		const nextContent = normalizeKanbanBoardTaskContent({
			...content,
			subtasks: nextItems.length ? nextItems : undefined,
		});
		setItems(nextItems);
		onContentUpdated(taskId, nextContent);
		await updateTask.mutateAsync({
			id: taskId,
			data: {
				boardId,
				parentId,
				content: nextContent,
			},
		});
	};

	return (
		<Box
			sx={{
				mt: 0.25,
				pt: 0.625,
				borderTop: "1px solid",
				borderColor: "divider",
			}}
		>
			<KanbanSubtasksChecklist
				items={items}
				onChange={setItems}
				onCommit={(next) => {
					void persist(next);
				}}
				disabled={busy}
				compact
				stopCardClick
			/>
		</Box>
	);
}
