import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import HourglassBottomOutlinedIcon from "@mui/icons-material/HourglassBottomOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardDoubleArrowUpIcon from "@mui/icons-material/KeyboardDoubleArrowUp";
import PauseIcon from "@mui/icons-material/Pause";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { Flex } from "@react-client/common/primitives/Flex";
import { KanbanHighlightedText } from "@react-client/features/kanban-board/components/KanbanHighlightedText";
import { KanbanTaskCardSubtasks } from "@react-client/features/kanban-board/components/KanbanSubtasksChecklist";
import { KanbanTaskImagesSection } from "@react-client/features/kanban-board/components/KanbanTaskImagesSection";
import {
	kanbanBoardEffectiveEstimatePd,
	kanbanBoardPriorityColor,
	kanbanBoardPriorityTitle,
	kanbanBoardStandColor,
	kanbanBoardStandTitle,
	kanbanBoardSubtasksProgress,
	kanbanBoardTaskAssignees,
	kanbanBoardTaskTypeColor,
	kanbanBoardTaskTypeTitle,
	kanbanBoardWorkTypeColor,
	kanbanBoardWorkTypeTitle,
	type KanbanBoardPriorityId,
	type KanbanBoardTaskContent,
} from "@smart-anketa/api-contract";
import { format, isValid, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import type { ReactNode } from "react";

function formatCardDate(value?: string): string | null {
	if (!value?.trim()) return null;
	const parsed = parseISO(value.trim());
	if (!isValid(parsed)) return null;
	return format(parsed, "d MMM yyyy", { locale: ru });
}

function PriorityIcon({
	priority,
}: {
	priority?: KanbanBoardPriorityId | string;
}) {
	if (!priority) return null;
	const color = kanbanBoardPriorityColor(priority);
	const title = kanbanBoardPriorityTitle(priority);
	const sx = { fontSize: 18, color };
	let icon: ReactNode;
	switch (priority) {
		case "high":
			icon = <KeyboardDoubleArrowUpIcon sx={sx} />;
			break;
		case "medium":
			icon = <KeyboardArrowUpIcon sx={sx} />;
			break;
		case "low":
			icon = <KeyboardArrowDownIcon sx={sx} />;
			break;
		case "hold":
			icon = <PauseIcon sx={sx} />;
			break;
		default:
			icon = <KeyboardArrowUpIcon sx={sx} />;
	}
	return (
		<Box
			component="span"
			title={title}
			aria-label={`Приоритет: ${title}`}
			sx={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
		>
			{icon}
		</Box>
	);
}

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
		<Flex alignItems="center" gap={4} title={title} sx={{ color: "text.secondary" }}>
			{icon}
			<Typography variant="caption" color="text.secondary" lineHeight={1}>
				{value}
			</Typography>
		</Flex>
	);
}

function TagChip({ label, color }: { label: string; color: string }) {
	return (
		<Box
			component="span"
			sx={{
				display: "inline-flex",
				alignItems: "center",
				px: 0.75,
				py: 0.15,
				borderRadius: 0.75,
				fontSize: "0.7rem",
				fontWeight: 600,
				lineHeight: 1.4,
				color,
				bgcolor: alpha(color, 0.12),
				border: `1px solid ${alpha(color, 0.28)}`,
				maxWidth: "100%",
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap",
			}}
		>
			{label}
		</Box>
	);
}

export function KanbanTaskBoardCard({
	taskId,
	boardId,
	parentId,
	taskKey,
	title,
	content,
	createdAt,
	createdBy,
	commentCount = 0,
	taskUpdatedAt,
	editLabel,
	columnColor,
	isBoardBusy,
	highlightQuery,
	onContentUpdated,
	onEditBlocked,
}: {
	taskId: string;
	boardId: string;
	parentId: string;
	taskKey?: string;
	title?: string;
	content?: KanbanBoardTaskContent;
	createdAt?: string;
	createdBy?: string | null;
	commentCount?: number;
	taskUpdatedAt?: string;
	editLabel?: string;
	columnColor: string;
	isBoardBusy?: boolean;
	highlightQuery?: string;
	onContentUpdated: (taskId: string, content: KanbanBoardTaskContent) => void;
	onEditBlocked?: (error: unknown) => void;
}) {
	const displayTitle = title ?? content?.title ?? "";
	const description = content?.description?.trim();
	const assignee =
		content?.currentAssignee?.trim() ||
		kanbanBoardTaskAssignees(content ?? { title: "" })[0] ||
		"";
	const createdLabel = formatCardDate(createdAt);
	const dueLabel = formatCardDate(content?.dueDate);
	const progress = kanbanBoardSubtasksProgress(content);
	const imageCount = content?.images?.length ?? 0;
	const fileCount = content?.files?.length ?? 0;
	const attachmentCount = imageCount + fileCount;
	const estimatePd = content
		? kanbanBoardEffectiveEstimatePd(content)
		: undefined;
	const tags: Array<{ label: string; color: string }> = [];
	if (content?.taskType) {
		tags.push({
			label: kanbanBoardTaskTypeTitle(content.taskType),
			color: kanbanBoardTaskTypeColor(content.taskType),
		});
	}
	if (content?.workType) {
		tags.push({
			label: kanbanBoardWorkTypeTitle(content.workType),
			color: kanbanBoardWorkTypeColor(content.workType),
		});
	}
	if (content?.stand) {
		tags.push({
			label: kanbanBoardStandTitle(content.stand),
			color: kanbanBoardStandColor(content.stand),
		});
	}

	return (
		<Box
			sx={{
				position: "relative",
				minWidth: 0,
				borderRadius: 1.5,
				bgcolor: "background.paper",
				boxShadow: (theme) =>
					`0 1px 2px ${alpha(theme.palette.common.black, 0.06)}, 0 1px 3px ${alpha(theme.palette.common.black, 0.04)}`,
				border: "1px solid",
				borderColor: "divider",
				overflow: "hidden",
				cursor: "pointer",
				transition: "box-shadow 120ms ease, border-color 120ms ease",
				"&:hover": {
					borderColor: alpha(columnColor, 0.45),
					boxShadow: (theme) =>
						`0 2px 8px ${alpha(theme.palette.common.black, 0.08)}`,
				},
			}}
		>
			<Box
				sx={{
					position: "absolute",
					left: 0,
					top: 0,
					bottom: 0,
					width: 3,
					bgcolor: columnColor,
				}}
			/>
			<Flex flexDirection="column" gap={8} sx={{ p: 1.25, pl: 1.5 }}>
				<Flex alignItems="center" justifyContent="space-between" gap={8}>
					<Typography
						variant="caption"
						color="text.secondary"
						fontWeight={600}
						sx={{ letterSpacing: 0.2 }}
						title={taskKey}
					>
						{taskKey ? (
							<KanbanHighlightedText text={taskKey} query={highlightQuery} />
						) : (
							"—"
						)}
					</Typography>
					<PriorityIcon priority={content?.priority} />
				</Flex>

				{displayTitle ? (
					<Typography
						variant="subtitle2"
						fontWeight={700}
						sx={{
							wordBreak: "break-word",
							lineHeight: 1.35,
							mt: -0.25,
						}}
					>
						<KanbanHighlightedText
							text={displayTitle}
							query={highlightQuery}
						/>
					</Typography>
				) : null}

				{description ? (
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{
							display: "-webkit-box",
							WebkitLineClamp: 2,
							WebkitBoxOrient: "vertical",
							overflow: "hidden",
							lineHeight: 1.4,
							mt: -0.25,
						}}
					>
						<KanbanHighlightedText
							text={description.replace(/\s+/g, " ")}
							query={highlightQuery}
						/>
					</Typography>
				) : null}

				{tags.length ? (
					<Flex gap={4} wrap="wrap" alignItems="center">
						{tags.map((tag) => (
							<TagChip key={tag.label} label={tag.label} color={tag.color} />
						))}
					</Flex>
				) : null}

				{progress ? (
					<Flex flexDirection="column" gap={4}>
						<Typography variant="caption" color="text.secondary">
							{progress.done}/{progress.total} подзадач
						</Typography>
						<LinearProgress
							variant="determinate"
							value={
								progress.total
									? Math.round((progress.done / progress.total) * 100)
									: 0
							}
							sx={{
								height: 6,
								borderRadius: 3,
								bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08),
								"& .MuiLinearProgress-bar": {
									borderRadius: 3,
									bgcolor:
										progress.done >= progress.total
											? "success.main"
											: columnColor,
								},
							}}
						/>
					</Flex>
				) : null}

				{content ? (
					<KanbanTaskCardSubtasks
						taskId={taskId}
						boardId={boardId}
						parentId={parentId}
						content={content}
						taskUpdatedAt={taskUpdatedAt}
						editLabel={editLabel}
						onContentUpdated={onContentUpdated}
						isSaving={isBoardBusy}
						onEditBlocked={onEditBlocked}
					/>
				) : null}

				{content?.images?.length ? (
					<KanbanTaskImagesSection
						taskId={taskId}
						images={content.images}
						compact
					/>
				) : null}

				<Box
					sx={{
						pt: 0.75,
						mt: 0.25,
						borderTop: "1px dashed",
						borderColor: "divider",
					}}
				>
					<Flex
						alignItems="center"
						justifyContent="space-between"
						gap={8}
						wrap="wrap"
					>
						<Flex alignItems="center" gap={10} wrap="wrap" minWidth={0}>
							{createdLabel ? (
								<MetaStat
									title="Дата создания"
									value={createdLabel}
									icon={<CalendarTodayOutlinedIcon sx={{ fontSize: 14 }} />}
								/>
							) : null}
							{dueLabel ? (
								<MetaStat
									title="Срок"
									value={dueLabel}
									icon={<AccessTimeOutlinedIcon sx={{ fontSize: 14 }} />}
								/>
							) : null}
							{estimatePd !== undefined ? (
								<MetaStat
									title="Оценка, чд"
									value={`${estimatePd} чд`}
									icon={<HourglassBottomOutlinedIcon sx={{ fontSize: 14 }} />}
								/>
							) : null}
							<MetaStat
								title="Комментарии"
								value={commentCount}
								icon={<ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 14 }} />}
							/>
							{attachmentCount > 0 ? (
								<MetaStat
									title="Вложения"
									value={attachmentCount}
									icon={<AttachFileOutlinedIcon sx={{ fontSize: 14 }} />}
								/>
							) : null}
						</Flex>
					</Flex>

					{(assignee || createdBy) && (
						<Flex
							flexDirection="column"
							gap={2}
							sx={{ mt: 0.75 }}
							minWidth={0}
						>
							{assignee ? (
								<Flex alignItems="center" gap={4} minWidth={0}>
									<PersonOutlineIcon
										sx={{ fontSize: 14, color: "text.secondary", flexShrink: 0 }}
									/>
									<Typography
										variant="caption"
										color="text.primary"
										noWrap
										title={`Ответственный: ${assignee}`}
										sx={{ minWidth: 0 }}
									>
										{assignee}
									</Typography>
								</Flex>
							) : null}
							{createdBy ? (
								<Typography
									variant="caption"
									color="text.secondary"
									noWrap
									title={`Назначил: ${createdBy}`}
									sx={{ pl: "18px" }}
								>
									Назначил: {createdBy}
								</Typography>
							) : null}
						</Flex>
					)}
				</Box>
			</Flex>
		</Box>
	);
}
