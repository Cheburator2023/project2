import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import HourglassBottomOutlinedIcon from "@mui/icons-material/HourglassBottomOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import type { MouseEvent, ReactNode } from "react";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useKanbanBoardTasksRegistry } from "@react-client/common/api/queries/kanban-board";
import { Flex } from "@react-client/common/primitives/Flex";
import { KanbanTaskFieldChip } from "@react-client/features/kanban-board/components/KanbanTaskSelectField";
import type {
	KanbanBoardPersonGroup,
	KanbanBoardPersonTask,
	KanbanBoardPersonTaskMeta,
} from "@react-client/features/kanban-board/kanbanBoardPeopleGroups";
import {
	buildKanbanBoardPeopleLinkEdges,
	buildKanbanBoardPeopleLinkGeometry,
	kanbanBoardPeopleLinkPath,
	type KanbanBoardPeopleLinkGeometry,
} from "@react-client/features/kanban-board/kanbanBoardPeopleLinks";
import {
	KANBAN_BOARD_BLOCKER_COLOR,
	KANBAN_BOARD_HANDOFF_COLOR,
	kanbanBoardRelationTypeColor,
	kanbanBoardRelationTypeTitle,
	type KanbanBoardRelatedTaskLink,
} from "@smart-anketa/api-contract";

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

const LINK_RAIL_BASE = 28;
const LINK_LANE_GAP = 12;
const LINK_RAIL_MAX = 88;

function rowIsVisible(element: HTMLElement): boolean {
	if (element.offsetParent === null) return false;
	const rect = element.getBoundingClientRect();
	return rect.height > 2;
}

const stopRowClick = (event: MouseEvent) => {
	event.stopPropagation();
};

function MetaStat({
	icon,
	value,
	title,
}: {
	icon: ReactNode;
	value: number | string;
	title: string;
}) {
	return (
		<Flex
			alignItems="center"
			gap={4}
			title={title}
			sx={{ color: "text.secondary", flexShrink: 0 }}
		>
			{icon}
			<Typography variant="caption" color="text.secondary" lineHeight={1}>
				{value}
			</Typography>
		</Flex>
	);
}

function PeopleTaskMeta({ meta }: { meta: KanbanBoardPersonTaskMeta }) {
	return (
		<Flex
			alignItems="center"
			gap={10}
			wrap="wrap"
			sx={{
				pl: "96px",
				pr: 1,
				pb: 0.75,
				pt: 0.25,
			}}
			data-test-id="kanban-board-people-task-meta"
		>
			{meta.createdLabel ? (
				<MetaStat
					title="Дата создания"
					value={meta.createdLabel}
					icon={<CalendarTodayOutlinedIcon sx={{ fontSize: 14 }} />}
				/>
			) : null}
			{meta.ageDays !== null ? (
				<MetaStat
					title={`Висит ${meta.ageDays} дн.`}
					value={`${meta.ageDays} д`}
					icon={<ScheduleOutlinedIcon sx={{ fontSize: 14 }} />}
				/>
			) : null}
			{meta.dueLabel ? (
				<MetaStat
					title="Срок"
					value={meta.dueLabel}
					icon={<AccessTimeOutlinedIcon sx={{ fontSize: 14 }} />}
				/>
			) : null}
			{meta.estimatePd !== undefined ? (
				<MetaStat
					title="Оценка, чд"
					value={`${meta.estimatePd} чд`}
					icon={<HourglassBottomOutlinedIcon sx={{ fontSize: 14 }} />}
				/>
			) : null}
			<MetaStat
				title="Комментарии"
				value={meta.commentCount}
				icon={<ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 14 }} />}
			/>
			{meta.attachmentCount > 0 ? (
				<MetaStat
					title="Вложения"
					value={meta.attachmentCount}
					icon={<AttachFileOutlinedIcon sx={{ fontSize: 14 }} />}
				/>
			) : null}
		</Flex>
	);
}

function PeopleTaskRelations({
	links,
	tasksById,
	onOpenTask,
	onToggle,
}: {
	links: KanbanBoardRelatedTaskLink[];
	tasksById: Map<
		string,
		{ taskKey: string; title: string }
	>;
	onOpenTask: (taskKey: string) => void;
	onToggle: () => void;
}) {
	const [expanded, setExpanded] = useState(false);
	if (!links.length) return null;

	const toggle = (event: MouseEvent) => {
		stopRowClick(event);
		setExpanded((value) => !value);
	};

	return (
		<Flex
			flexDirection="column"
			gap={2}
			sx={{ pl: "96px", pr: 1, pb: expanded ? 1 : 0.25 }}
			onClick={stopRowClick}
			onMouseDown={stopRowClick}
			data-test-id="kanban-board-people-task-relations"
		>
			<Flex
				alignItems="center"
				gap={6}
				onClick={toggle}
				role="button"
				tabIndex={0}
				aria-expanded={expanded}
				title={expanded ? "Скрыть связи" : "Показать связи"}
				onKeyDown={(event) => {
					if (event.key !== "Enter" && event.key !== " ") return;
					event.preventDefault();
					event.stopPropagation();
					setExpanded((value) => !value);
				}}
				sx={{
					cursor: "pointer",
					color: "text.secondary",
					userSelect: "none",
					width: "fit-content",
					minHeight: 20,
				}}
			>
				<KeyboardArrowDownIcon
					sx={{
						fontSize: 16,
						transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
						transition: "transform 0.15s ease",
					}}
				/>
				<Typography variant="caption" fontWeight={600} sx={{ fontSize: "0.7rem" }}>
					Связи · {links.length}
				</Typography>
			</Flex>
			<Collapse
				in={expanded}
				timeout="auto"
				unmountOnExit={false}
				onEntered={onToggle}
				onExited={onToggle}
			>
				<Flex flexDirection="column" gap={2} sx={{ pl: "22px" }}>
					{links.map((link) => {
						const related = tasksById.get(link.taskId);
						const keyLabel = related?.taskKey || "—";
						const typeTitle = kanbanBoardRelationTypeTitle(link.type);
						const typeColor = kanbanBoardRelationTypeColor(link.type);
						const title = related
							? `${typeTitle}: ${related.taskKey} · ${related.title}`
							: typeTitle;
						return (
							<Flex
								key={link.taskId}
								alignItems="center"
								gap={6}
								minWidth={0}
								title={title}
								sx={{
									cursor: related?.taskKey ? "pointer" : "default",
									width: "fit-content",
									maxWidth: "100%",
								}}
								onClick={(event) => {
									stopRowClick(event);
									if (related?.taskKey) onOpenTask(related.taskKey);
								}}
							>
								<Typography
									variant="caption"
									noWrap
									sx={{ fontSize: "0.7rem", fontWeight: 700 }}
								>
									{keyLabel}
								</Typography>
								<Typography
									variant="caption"
									noWrap
									sx={{ fontSize: "0.7rem", fontWeight: 600, color: typeColor }}
								>
									{typeTitle}
								</Typography>
								{related?.title ? (
									<Typography
										variant="caption"
										noWrap
										color="text.secondary"
										sx={{ fontSize: "0.7rem", minWidth: 0 }}
									>
										{related.title}
									</Typography>
								) : null}
							</Flex>
						);
					})}
				</Flex>
			</Collapse>
		</Flex>
	);
}

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
	const registryQuery = useKanbanBoardTasksRegistry();
	const [assigneeMenu, setAssigneeMenu] = useState<{
		anchor: HTMLElement;
		taskId: string;
		current: string;
	} | null>(null);
	const [expandedByAssignee, setExpandedByAssignee] = useState<
		Record<string, boolean>
	>(() =>
		Object.fromEntries(
			groups.map((group) => [
				group.assignee || "unassigned",
				group.tasks.length > 0,
			]),
		),
	);
	const rootRef = useRef<HTMLDivElement>(null);
	const rowRefs = useRef(new Map<string, HTMLElement>());
	const [linkGeom, setLinkGeom] = useState<KanbanBoardPeopleLinkGeometry[]>([]);
	const [railWidth, setRailWidth] = useState(LINK_RAIL_BASE);
	const [svgHeight, setSvgHeight] = useState(0);

	const flatTasks = useMemo(
		() => groups.flatMap((group) => group.tasks),
		[groups],
	);
	const linkEdges = useMemo(
		() => buildKanbanBoardPeopleLinkEdges(flatTasks),
		[flatTasks],
	);
	const tasksById = useMemo(() => {
		const map = new Map<string, { taskKey: string; title: string }>();
		for (const task of flatTasks) {
			map.set(task.id, { taskKey: task.taskKey, title: task.title });
		}
		for (const task of registryQuery.data ?? []) {
			if (map.has(task.id)) continue;
			map.set(task.id, { taskKey: task.taskKey, title: task.title });
		}
		return map;
	}, [flatTasks, registryQuery.data]);

	useEffect(() => {
		setExpandedByAssignee((current) => {
			const next = { ...current };
			let changed = false;
			for (const group of groups) {
				const key = group.assignee || "unassigned";
				if (next[key] === undefined) {
					next[key] = group.tasks.length > 0;
					changed = true;
				}
			}
			return changed ? next : current;
		});
	}, [groups]);

	const setRowRef = useCallback((taskId: string, node: HTMLElement | null) => {
		if (node) rowRefs.current.set(taskId, node);
		else rowRefs.current.delete(taskId);
	}, []);

	const remeasureLinks = useCallback(() => {
		const root = rootRef.current;
		if (!root || !linkEdges.length) {
			setLinkGeom([]);
			setRailWidth(LINK_RAIL_BASE);
			setSvgHeight(root?.scrollHeight ?? 0);
			return;
		}
		const rootRect = root.getBoundingClientRect();
		const centers = new Map<string, number>();
		for (const [taskId, element] of rowRefs.current) {
			if (!rowIsVisible(element)) continue;
			const rect = element.getBoundingClientRect();
			centers.set(
				taskId,
				rect.top - rootRect.top + root.scrollTop + rect.height / 2,
			);
		}
		const next = buildKanbanBoardPeopleLinkGeometry(linkEdges, centers);
		const maxLane = next.reduce((max, edge) => Math.max(max, edge.lane), 0);
		setLinkGeom(next);
		setRailWidth(
			Math.min(LINK_RAIL_MAX, LINK_RAIL_BASE + maxLane * LINK_LANE_GAP),
		);
		setSvgHeight(root.scrollHeight);
	}, [linkEdges]);

	useLayoutEffect(() => {
		remeasureLinks();
	}, [remeasureLinks, expandedByAssignee, groups]);

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const observer = new ResizeObserver(() => remeasureLinks());
		observer.observe(root);
		for (const element of rowRefs.current.values()) observer.observe(element);
		window.addEventListener("resize", remeasureLinks);
		return () => {
			observer.disconnect();
			window.removeEventListener("resize", remeasureLinks);
		};
	}, [remeasureLinks, groups, expandedByAssignee]);

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

	const renderTask = (task: KanbanBoardPersonTask, assignee: string) => {
		const accentColor = task.hasBlocker
			? KANBAN_BOARD_BLOCKER_COLOR
			: task.hasHandoff
				? KANBAN_BOARD_HANDOFF_COLOR
				: null;
		const rowTestId = task.hasBlocker
			? "kanban-board-people-task-blocker"
			: task.hasHandoff
				? "kanban-board-people-task-handoff"
				: "kanban-board-people-task";

		return (
		<Flex
			key={task.id}
			flexDirection="column"
			title={
				task.hasBlocker
					? "Есть блокер"
					: task.hasHandoff
						? task.handoffTitle
						: undefined
			}
			data-test-id={rowTestId}
			sx={{
				borderTop: "1px solid",
				borderColor: accentColor
					? alpha(accentColor, 0.35)
					: "divider",
				bgcolor: accentColor ? alpha(accentColor, 0.1) : undefined,
				boxShadow: accentColor ? `inset 3px 0 0 ${accentColor}` : undefined,
				"&:hover": task.taskKey
					? {
							bgcolor: accentColor
								? alpha(accentColor, 0.16)
								: "action.hover",
						}
					: undefined,
			}}
		>
			{task.hasBlocker || task.hasHandoff ? (
				<Flex
					alignItems="center"
					gap={10}
					wrap="wrap"
					sx={{
						px: 1,
						pt: 0.75,
						pl: "12px",
					}}
				>
					{task.hasBlocker ? (
						<Typography
							variant="caption"
							fontWeight={800}
							sx={{
								color: KANBAN_BOARD_BLOCKER_COLOR,
								letterSpacing: 0.4,
								textTransform: "uppercase",
							}}
						>
							Есть блокер
						</Typography>
					) : null}
					{task.hasHandoff ? (
						<Flex alignItems="center" gap={6} minWidth={0}>
							<Typography
								variant="caption"
								fontWeight={800}
								sx={{
									color: KANBAN_BOARD_HANDOFF_COLOR,
									letterSpacing: 0.4,
									textTransform: "uppercase",
									flexShrink: 0,
								}}
							>
								Передано
							</Typography>
							{task.handoffSummary ? (
								<Typography
									variant="caption"
									noWrap
									sx={{ color: alpha(KANBAN_BOARD_HANDOFF_COLOR, 0.9) }}
								>
									{task.handoffSummary}
								</Typography>
							) : null}
						</Flex>
					) : null}
				</Flex>
			) : null}
			<Flex
				ref={(node) => setRowRef(task.id, node)}
				alignItems="center"
				gap={8}
				padding="6px 4px"
				data-task-id={task.id}
				sx={{ cursor: task.taskKey ? "pointer" : "default" }}
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
				<Flex
					gap={4}
					wrap="wrap"
					alignItems="center"
					sx={{ flexShrink: 0, maxWidth: 360 }}
					data-test-id="kanban-board-people-task-chips"
				>
					{task.chips.map((chip) => (
						<span key={`${chip.label}:${chip.color}`} title={chip.title}>
							<KanbanTaskFieldChip label={chip.label} color={chip.color} />
						</span>
					))}
				</Flex>
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
						onMoveTask(task.id, task.parentId, String(event.target.value))
					}
					onMouseDown={stopRowClick}
					onClick={stopRowClick}
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
					onMouseDown={stopRowClick}
					onClick={(event) => {
						event.stopPropagation();
						setAssigneeMenu({
							anchor: event.currentTarget,
							taskId: task.id,
							current: assignee,
						});
					}}
				>
					<PersonOutlineIcon fontSize="small" />
				</IconButton>
			</Flex>
			<PeopleTaskMeta meta={task.meta} />
			<PeopleTaskRelations
				links={task.relatedLinks}
				tasksById={tasksById}
				onOpenTask={onOpenTask}
				onToggle={remeasureLinks}
			/>
		</Flex>
		);
	};

	return (
		<Flex
			ref={rootRef}
			flexDirection="column"
			gap={8}
			padding="8px"
			width="100%"
			position="relative"
			data-test-id="kanban-board-people-view"
			sx={{ pl: `${railWidth + 8}px` }}
		>
			{linkGeom.length ? (
				<svg
					aria-hidden
					data-test-id="kanban-board-people-links"
					width={railWidth}
					height={Math.max(svgHeight, 1)}
					style={{
						position: "absolute",
						left: 0,
						top: 0,
						overflow: "visible",
						pointerEvents: "none",
					}}
				>
					<defs>
						{linkGeom.map((edge) => (
							<marker
								key={`marker-${edge.id}`}
								id={`people-link-arrow-${edge.id}`}
								markerWidth="7"
								markerHeight="7"
								refX="6"
								refY="3.5"
								orient="auto"
								markerUnits="strokeWidth"
							>
								<path d="M0,0 L7,3.5 L0,7 Z" fill={edge.color} />
							</marker>
						))}
					</defs>
					{linkGeom.map((edge) => (
						<path
							key={edge.id}
							d={kanbanBoardPeopleLinkPath(edge, railWidth - 2, LINK_LANE_GAP)}
							fill="none"
							stroke={edge.color}
							strokeWidth={1.75}
							strokeOpacity={0.85}
							markerEnd={`url(#people-link-arrow-${edge.id})`}
						>
							<title>{edge.title}</title>
						</path>
					))}
				</svg>
			) : null}
			{groups.map((group) => {
				const groupKey = group.assignee || "unassigned";
				const expanded =
					expandedByAssignee[groupKey] ?? group.tasks.length > 0;
				return (
					<Accordion
						key={groupKey}
						expanded={expanded}
						onChange={(_, next) => {
							setExpandedByAssignee((current) => ({
								...current,
								[groupKey]: next,
							}));
						}}
						disableGutters
						elevation={0}
						variant="outlined"
						sx={{ "&::before": { display: "none" } }}
						TransitionProps={{
							onEntered: remeasureLinks,
							onExited: remeasureLinks,
						}}
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
									{group.tasks.map((task) =>
										renderTask(task, group.assignee),
									)}
								</Flex>
							) : (
								<Typography variant="body2" color="text.secondary">
									Нет задач
								</Typography>
							)}
						</AccordionDetails>
					</Accordion>
				);
			})}
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
