import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardDoubleArrowUpIcon from "@mui/icons-material/KeyboardDoubleArrowUp";
import PauseIcon from "@mui/icons-material/Pause";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { Flex } from "@react-client/common/primitives/Flex";
import {
	kanbanBoardPriorityColor,
	kanbanBoardPriorityTitle,
	type KanbanBoardPriorityId,
} from "@smart-anketa/api-contract";
import type { ReactNode } from "react";

export function KanbanTaskSectionCard({
	children,
	title,
	action,
}: {
	children: ReactNode;
	title?: string;
	action?: ReactNode;
}) {
	return (
		<Box
			sx={{
				bgcolor: "background.paper",
				border: "1px solid",
				borderColor: "divider",
				borderRadius: 2,
				p: 2,
				boxShadow: (theme) =>
					`0 1px 2px ${alpha(theme.palette.common.black, 0.04)}`,
			}}
		>
			{title || action ? (
				<Flex
					alignItems="center"
					justifyContent="space-between"
					gap={8}
					sx={{ mb: 1.5 }}
				>
					{title ? (
						<Typography variant="subtitle1" fontWeight={700}>
							{title}
						</Typography>
					) : (
						<span />
					)}
					{action}
				</Flex>
			) : null}
			{children}
		</Box>
	);
}

export function KanbanTaskDetailRow({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<Flex
			alignItems="flex-start"
			justifyContent="space-between"
			gap={12}
			sx={{ py: 0.75 }}
		>
			<Typography
				variant="body2"
				color="text.secondary"
				sx={{ flexShrink: 0, pt: 0.25, minWidth: 88 }}
			>
				{label}
			</Typography>
			<Box sx={{ flex: 1, minWidth: 0, textAlign: "right" }}>{children}</Box>
		</Flex>
	);
}

export function KanbanTaskPersonLabel({
	name,
	color = "#2563eb",
}: {
	name: string;
	color?: string;
}) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	const initials =
		parts.length === 0
			? "?"
			: parts.length === 1
				? parts[0].slice(0, 2).toUpperCase()
				: `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();

	return (
		<Flex alignItems="center" gap={8} justifyContent="flex-end" minWidth="0">
			<Avatar
				sx={{
					width: 24,
					height: 24,
					fontSize: "0.65rem",
					fontWeight: 700,
					bgcolor: alpha(color, 0.18),
					color,
				}}
			>
				{initials}
			</Avatar>
			<Typography variant="body2" fontWeight={600} noWrap title={name}>
				{name}
			</Typography>
		</Flex>
	);
}

export function KanbanTaskPriorityBadge({
	priority,
}: {
	priority?: string;
}) {
	if (!priority) return null;
	const color = kanbanBoardPriorityColor(priority);
	const title = kanbanBoardPriorityTitle(priority as KanbanBoardPriorityId);
	const iconSx = { fontSize: 16 };
	let icon: ReactNode = <KeyboardArrowUpIcon sx={iconSx} />;
	if (priority === "high") icon = <KeyboardDoubleArrowUpIcon sx={iconSx} />;
	if (priority === "low") icon = <KeyboardArrowDownIcon sx={iconSx} />;
	if (priority === "hold") icon = <PauseIcon sx={iconSx} />;

	return (
		<Flex
			alignItems="center"
			gap={4}
			sx={{
				display: "inline-flex",
				px: 1,
				py: 0.35,
				borderRadius: 999,
				bgcolor: alpha(color, 0.12),
				color,
				border: `1px solid ${alpha(color, 0.28)}`,
			}}
		>
			{icon}
			<Typography variant="caption" fontWeight={700} sx={{ color: "inherit" }}>
				{title}
			</Typography>
		</Flex>
	);
}

export function KanbanTaskStatusBadge({
	title,
	color,
}: {
	title: string;
	color: string;
}) {
	return (
		<Flex
			alignItems="center"
			gap={6}
			sx={{
				display: "inline-flex",
				px: 1,
				py: 0.35,
				borderRadius: 999,
				bgcolor: alpha(color, 0.12),
				color,
				border: `1px solid ${alpha(color, 0.28)}`,
			}}
		>
			<Box
				sx={{
					width: 7,
					height: 7,
					borderRadius: "50%",
					bgcolor: color,
					flexShrink: 0,
				}}
			/>
			<Typography variant="caption" fontWeight={700} sx={{ color: "inherit" }}>
				{title}
			</Typography>
		</Flex>
	);
}

export function KanbanTaskTimelineRow({
	label,
	value,
}: {
	label: string;
	value: string;
}) {
	return (
		<Flex alignItems="center" gap={8} sx={{ py: 0.5 }}>
			<AccessTimeOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
			<Typography variant="body2" color="text.secondary" sx={{ minWidth: 72 }}>
				{label}
			</Typography>
			<Typography variant="body2" fontWeight={600}>
				{value}
			</Typography>
		</Flex>
	);
}

export function KanbanTaskDueLabel({ value }: { value: string }) {
	return (
		<Flex alignItems="center" gap={6} justifyContent="flex-end">
			<CalendarTodayOutlinedIcon sx={{ fontSize: 14, color: "warning.main" }} />
			<Typography variant="body2" fontWeight={600} color="warning.dark">
				{value}
			</Typography>
		</Flex>
	);
}
