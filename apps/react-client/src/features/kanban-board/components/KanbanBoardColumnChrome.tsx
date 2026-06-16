import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import type { BoardItem } from "react-kanban-kit";
import { useEffect, useState } from "react";

export function getKanbanColumnColor(column: BoardItem): string {
	const color = column.content?.color;
	return typeof color === "string" && color ? color : "#94a3b8";
}

export function KanbanColumnHeader({
	column,
	disabled,
	onRename,
	onDelete,
}: {
	column: BoardItem;
	disabled: boolean;
	onRename: (columnId: string, title: string) => void;
	onDelete: (columnId: string) => void;
}) {
	const color = getKanbanColumnColor(column);
	const [editing, setEditing] = useState(false);
	const [title, setTitle] = useState(column.title);
	const hasTasks = column.totalChildrenCount > 0;

	useEffect(() => {
		if (!editing) setTitle(column.title);
	}, [column.title, editing]);

	const commitRename = () => {
		const nextTitle = title.trim();
		setEditing(false);
		if (!nextTitle || nextTitle === column.title) {
			setTitle(column.title);
			return;
		}
		onRename(column.id, nextTitle);
	};

	return (
		<Box
			sx={{
				px: 1,
				py: 0.75,
				borderBottom: 2,
				borderColor: color,
				bgcolor: alpha(color, 0.08),
			}}
		>
			<Stack direction="row" alignItems="center" spacing={0.5} minWidth={0}>
				{editing ? (
					<InputBase
						value={title}
						autoFocus
						disabled={disabled}
						onChange={(event) => setTitle(event.target.value)}
						onBlur={commitRename}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								commitRename();
							}
							if (event.key === "Escape") {
								setTitle(column.title);
								setEditing(false);
							}
						}}
						sx={{
							flex: 1,
							minWidth: 0,
							fontSize: "0.875rem",
							fontWeight: 700,
							color,
							px: 0.5,
							borderRadius: 0.5,
							bgcolor: "background.paper",
						}}
					/>
				) : (
					<Typography
						variant="subtitle2"
						fontWeight={700}
						noWrap
						title={column.title}
						onClick={() => {
							if (!disabled) setEditing(true);
						}}
						sx={{
							flex: 1,
							minWidth: 0,
							color,
							cursor: disabled ? "default" : "text",
						}}
					>
						{column.title}
					</Typography>
				)}
				<IconButton
					size="small"
					disabled={disabled || hasTasks}
					onClick={() => onDelete(column.id)}
					title={
						hasTasks
							? "Нельзя удалить колонку с задачами"
							: "Удалить колонку"
					}
					aria-label="Удалить колонку"
					sx={{ color: hasTasks ? "text.disabled" : "text.secondary" }}
				>
					<DeleteOutlineIcon fontSize="small" />
				</IconButton>
				<Chip
					size="small"
					label={column.totalChildrenCount}
					sx={{
						height: 22,
						bgcolor: alpha(color, 0.14),
						color,
						border: `1px solid ${alpha(color, 0.3)}`,
					}}
				/>
			</Stack>
		</Box>
	);
}

export function KanbanColumnAdder({
	disabled,
	isPending,
	onAdd,
}: {
	disabled: boolean;
	isPending: boolean;
	onAdd: (title: string) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [title, setTitle] = useState("");

	const commitAdd = () => {
		const nextTitle = title.trim();
		if (!nextTitle) {
			setEditing(false);
			setTitle("");
			return;
		}
		onAdd(nextTitle);
		setEditing(false);
		setTitle("");
	};

	return (
		<Box
			sx={{
				minWidth: 264,
				maxWidth: 264,
				height: "100%",
				display: "flex",
				flexDirection: "column",
				borderRadius: 2.5,
				border: "1px dashed",
				borderColor: "divider",
				bgcolor: alpha("#94a3b8", 0.04),
			}}
		>
			<Box sx={{ flex: 1, minHeight: 0 }} />
			{editing ? (
				<Box sx={{ px: 1, pb: 1 }}>
					<InputBase
						value={title}
						autoFocus
						placeholder="Название колонки"
						disabled={disabled || isPending}
						onChange={(event) => setTitle(event.target.value)}
						onBlur={commitAdd}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								commitAdd();
							}
							if (event.key === "Escape") {
								setTitle("");
								setEditing(false);
							}
						}}
						sx={{
							width: "100%",
							px: 1,
							py: 0.75,
							borderRadius: 1,
							bgcolor: "background.paper",
							border: 1,
							borderColor: "divider",
							fontSize: "0.875rem",
						}}
					/>
				</Box>
			) : (
				<Button
					fullWidth
					size="small"
					startIcon={<AddIcon fontSize="small" />}
					disabled={disabled || isPending}
					onClick={() => setEditing(true)}
					sx={{
						justifyContent: "flex-start",
						color: "text.secondary",
						px: 1,
						py: 0.75,
						mt: 0.5,
						mb: 1,
					}}
				>
					Колонка
				</Button>
			)}
		</Box>
	);
}

export function KanbanColumnAddTaskFooter({
	column,
	disabled,
	onAdd,
}: {
	column: BoardItem;
	disabled: boolean;
	onAdd: (columnId: string) => void;
}) {
	const color = getKanbanColumnColor(column);

	return (
		<Button
			fullWidth
			size="small"
			startIcon={<AddIcon fontSize="small" />}
			disabled={disabled}
			onClick={() => onAdd(column.id)}
			sx={{
				justifyContent: "flex-start",
				color,
				mt: 0.5,
				px: 1,
				py: 0.75,
			}}
		>
			Добавить задачу
		</Button>
	);
}
