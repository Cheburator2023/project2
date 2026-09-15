import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import { useKanbanBoardTasksRegistry } from "@react-client/common/api/queries/kanban-board";
import { Flex } from "@react-client/common/primitives/Flex";
import { trackerTaskPath } from "@react-client/features/kanban-board/kanban-task-paths";
import {
	kanbanBoardRelatedLinksFromContent,
	kanbanBoardRelationTypeColor,
	kanbanBoardRelationTypeTitle,
	type KanbanBoardTaskContent,
} from "@smart-anketa/api-contract";
import type { MouseEvent } from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

type Props = {
	content: KanbanBoardTaskContent;
};

const stopCardClick = (event: MouseEvent) => {
	event.stopPropagation();
};

export function KanbanTaskCardRelations({ content }: Props) {
	const [expanded, setExpanded] = useState(false);
	const registryQuery = useKanbanBoardTasksRegistry();
	const links = useMemo(
		() => kanbanBoardRelatedLinksFromContent(content),
		[content],
	);
	const tasksById = useMemo(() => {
		const map = new Map(
			(registryQuery.data ?? []).map((task) => [task.id, task]),
		);
		return map;
	}, [registryQuery.data]);

	if (!links.length) return null;

	const toggleExpanded = (event: MouseEvent) => {
		stopCardClick(event);
		setExpanded((value) => !value);
	};

	return (
		<Flex
			flexDirection="column"
			gap={4}
			sx={{
				mt: 0.25,
				pt: 0.5,
				borderTop: "1px solid",
				borderColor: "divider",
			}}
			onClick={stopCardClick}
			onMouseDown={stopCardClick}
			data-test-id="kanban-task-card-relations"
		>
			<Flex
				alignItems="center"
				gap={6}
				width="100%"
				onClick={toggleExpanded}
				onMouseDown={stopCardClick}
				title={expanded ? "Скрыть связи" : "Показать связи"}
				role="button"
				tabIndex={0}
				aria-expanded={expanded}
				onKeyDown={(event) => {
					if (event.key !== "Enter" && event.key !== " ") return;
					event.preventDefault();
					event.stopPropagation();
					setExpanded((value) => !value);
				}}
				sx={{
					cursor: "pointer",
					color: "text.secondary",
					minHeight: 20,
					userSelect: "none",
				}}
			>
				<KeyboardArrowDownIcon
					sx={{
						fontSize: 16,
						flexShrink: 0,
						transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
						transition: "transform 0.15s ease",
					}}
				/>
				<Typography
					variant="caption"
					fontWeight={600}
					color="inherit"
					sx={{ fontSize: "0.6875rem", flex: 1 }}
				>
					Связи
				</Typography>
				<Typography
					variant="caption"
					color="inherit"
					sx={{ fontSize: "0.6875rem", flexShrink: 0, opacity: 0.85 }}
				>
					{links.length}
				</Typography>
			</Flex>
			<Collapse in={expanded} timeout="auto" unmountOnExit={false}>
				<Flex flexDirection="column" gap={2} minWidth={0}>
					{links.map((link) => {
						const row = tasksById.get(link.taskId);
						const keyLabel =
							row?.taskKey ?? (registryQuery.isLoading ? "…" : "—");
						const typeTitle = kanbanBoardRelationTypeTitle(link.type);
						const typeColor = kanbanBoardRelationTypeColor(link.type);
						const href = row ? trackerTaskPath(row.taskKey) : undefined;
						const title = row
							? `${typeTitle}: ${row.taskKey} · ${row.title}`
							: typeTitle;
						const label = (
							<Typography
								component="span"
								variant="caption"
								noWrap
								title={title}
								sx={{
									fontSize: "0.6875rem",
									lineHeight: 1.35,
									minWidth: 0,
								}}
							>
								<Typography
									component="span"
									fontWeight={700}
									sx={{ color: "text.primary", fontSize: "inherit" }}
								>
									{keyLabel}
								</Typography>
								{" · "}
								<Typography
									component="span"
									fontWeight={600}
									sx={{ color: typeColor, fontSize: "inherit" }}
								>
									{typeTitle}
								</Typography>
							</Typography>
						);
						return (
							<Flex
								key={link.taskId}
								alignItems="center"
								minWidth={0}
								sx={{ pl: "22px" }}
							>
								{href ? (
									<Link
										to={href}
										title={title}
										onClick={stopCardClick}
										onMouseDown={stopCardClick}
										style={{
											minWidth: 0,
											textDecoration: "none",
											color: "inherit",
										}}
									>
										{label}
									</Link>
								) : (
									label
								)}
							</Flex>
						);
					})}
				</Flex>
			</Collapse>
		</Flex>
	);
}
