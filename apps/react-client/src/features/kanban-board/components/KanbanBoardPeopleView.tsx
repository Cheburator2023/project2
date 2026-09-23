import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import type { MouseEvent } from "react";
import { useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { Flex } from "@react-client/common/primitives/Flex";
import type { KanbanBoardPersonGroup } from "@react-client/features/kanban-board/kanbanBoardPeopleGroups";

export type KanbanBoardPeopleStatusOption = {
	id: string;
	title: string;
	color: string;
};

type Props = {
	groups: KanbanBoardPersonGroup[];
	statuses: KanbanBoardPeopleStatusOption[];
	assigneeNames: string[];
	busy?: boolean;
	onOpenTask: (taskKey: string) => void;
	onMoveTask: (taskId: string, fromColumnId: string, toColumnId: string) => void;
	onAssignTask: (taskId: string, assignee: string) => void;
	onTaskContextMenu: (
		event: MouseEvent,
		taskId: string,
		parentId: string,
	) => void;
};

export function KanbanBoardPeopleView({
	groups,
	statuses,
	assigneeNames,
	busy = false,
	onOpenTask,
	onMoveTask,
	onAssignTask,
	onTaskContextMenu,
}: Props) {
	const [assigneeMenu, setAssigneeMenu] = useState<{
		anchor: HTMLElement;
		taskId: string;
		current: string;
	} | null>(null);

	if (!groups.length) {
		return (
			<Flex padding="24px" data-test-id="kanban-board-people-view">
				<Typography variant="body2" color="text.secondary">
					Нет задач
				</Typography>
			</Flex>
		);
	}

	const menuNames = [...assigneeNames];
	if (
		assigneeMenu?.current &&
		!menuNames.includes(assigneeMenu.current)
	) {
		menuNames.push(assigneeMenu.current);
		menuNames.sort((a, b) => a.localeCompare(b, "ru"));
	}

	return (
		<Flex
			flexDirection="column"
			gap={8}
			padding="8px"
			width="100%"
			data-test-id="kanban-board-people-view"
		>
			{groups.map((group) => (
				<Accordion
					key={group.assignee || "unassigned"}
					defaultExpanded={group.tasks.length > 0}
					disableGutters
					elevation={0}
					variant="outlined"
					sx={{ "&::before": { display: "none" } }}
				>
					<AccordionSummary expandIcon={<ExpandMoreIcon />}>
						<Flex
							alignItems="center"
							justifyContent="space-between"
							width="100%"
							gap={8}
						>
							<Typography variant="subtitle2" fontWeight={700}>
								{group.title}
							</Typography>
							<Typography
								variant="caption"
								color="text.secondary"
								sx={{ pr: 1 }}
							>
								{group.tasks.length}
							</Typography>
						</Flex>
					</AccordionSummary>
					<AccordionDetails sx={{ pt: 0 }}>
						{group.tasks.length ? (
							<Flex flexDirection="column">
								{group.tasks.map((task) => (
									<Flex
										key={task.id}
										alignItems="center"
										gap={8}
										padding="6px 4px"
										sx={{
											cursor: task.taskKey ? "pointer" : "default",
											borderTop: "1px solid",
											borderColor: "divider",
											"&:hover": task.taskKey
												? { bgcolor: "action.hover" }
												: undefined,
										}}
										onClick={() => {
											if (task.taskKey) onOpenTask(task.taskKey);
										}}
										onContextMenu={(event) =>
											onTaskContextMenu(event, task.id, task.parentId)
										}
									>
										{task.taskKey ? (
											<Typography
												variant="body2"
												color="primary"
												sx={{ flexShrink: 0, minWidth: 88 }}
												title={`Открыть ${task.taskKey}`}
											>
												{task.taskKey}
											</Typography>
										) : null}
										<Typography
											variant="body2"
											sx={{ flex: 1, minWidth: 0 }}
											title={task.title}
										>
											{task.title}
										</Typography>
										<Select
											size="small"
											value={task.parentId}
											disabled={busy}
											aria-label={`Статус ${task.taskKey || task.title}`}
											onChange={(event) =>
												onMoveTask(
													task.id,
													task.parentId,
													String(event.target.value),
												)
											}
											onMouseDown={(event) => event.stopPropagation()}
											onClick={(event) => event.stopPropagation()}
											sx={{ minWidth: 200, maxWidth: 280, flexShrink: 0 }}
										>
											{statuses.map((status) => (
												<MenuItem key={status.id} value={status.id}>
													<Flex alignItems="center" gap={8}>
														<span
															style={{
																width: 8,
																height: 8,
																borderRadius: "50%",
																background: status.color,
																flexShrink: 0,
															}}
														/>
														{status.title}
													</Flex>
												</MenuItem>
											))}
										</Select>
										<IconButton
											size="small"
											title="Сменить исполнителя"
											aria-label={`Сменить исполнителя ${task.taskKey || task.title}`}
											disabled={busy}
											onMouseDown={(event) => event.stopPropagation()}
											onClick={(event) => {
												event.stopPropagation();
												setAssigneeMenu({
													anchor: event.currentTarget,
													taskId: task.id,
													current: group.assignee,
												});
											}}
										>
											<PersonOutlineIcon fontSize="small" />
										</IconButton>
									</Flex>
								))}
							</Flex>
						) : (
							<Typography variant="body2" color="text.secondary">
								Нет задач
							</Typography>
						)}
					</AccordionDetails>
				</Accordion>
			))}
			<Menu
				anchorEl={assigneeMenu?.anchor ?? null}
				open={assigneeMenu !== null}
				onClose={() => setAssigneeMenu(null)}
			>
				{menuNames.map((name) => (
					<MenuItem
						key={name}
						disabled={busy || name === assigneeMenu?.current}
						onClick={() => {
							if (!assigneeMenu) return;
							const taskId = assigneeMenu.taskId;
							setAssigneeMenu(null);
							onAssignTask(taskId, name);
						}}
					>
						{name}
					</MenuItem>
				))}
				<MenuItem
					disabled={busy || !assigneeMenu?.current}
					onClick={() => {
						if (!assigneeMenu) return;
						const taskId = assigneeMenu.taskId;
						setAssigneeMenu(null);
						onAssignTask(taskId, "");
					}}
				>
					Без исполнителя
				</MenuItem>
			</Menu>
		</Flex>
	);
}
