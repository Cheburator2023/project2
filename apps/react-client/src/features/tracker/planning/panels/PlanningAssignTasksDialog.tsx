import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import {
	kanbanBoardTaskReleaseLabel,
	type KanbanBoardReleaseDto,
	type KanbanBoardReleaseTaskDto,
	type KanbanBoardReleaseThemeDto,
} from "@smart-anketa/api-contract";
import { useEffect, useState } from "react";

type Props = {
	open: boolean;
	taskIds: string[];
	themes: KanbanBoardReleaseThemeDto[];
	releases: KanbanBoardReleaseDto[];
	existing?: KanbanBoardReleaseTaskDto | null;
	isSubmitting: boolean;
	onClose: () => void;
	onAssign: (input: {
		themeId: string | null;
		releaseIds: string[];
	}) => Promise<void>;
	onRemove?: () => Promise<void>;
};

export function PlanningAssignTasksDialog({
	open,
	taskIds,
	themes,
	releases,
	existing,
	isSubmitting,
	onClose,
	onAssign,
	onRemove,
}: Props) {
	const [themeId, setThemeId] = useState("");
	const [releaseIds, setReleaseIds] = useState<string[]>([]);

	useEffect(() => {
		if (!open) return;
		setThemeId(existing?.themeId ?? "");
		setReleaseIds(
			existing?.releaseIds?.length
				? existing.releaseIds
				: existing?.releaseId
					? [existing.releaseId]
					: [],
		);
	}, [existing, open]);

	const title =
		taskIds.length > 1
			? `Добавить задачи: ${taskIds.length}`
			: existing
				? "Назначение задачи"
				: "Добавить задачу";

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>{title}</DialogTitle>
			<DialogContent>
				<Spacer space={8} />
				<Flex flexDirection="column" gap={12}>
					<TextField
						select
						size="small"
						label="Группа"
						value={themeId}
						disabled={isSubmitting}
						onChange={(event) => setThemeId(event.target.value)}
						helperText="Можно оставить без группы"
					>
						<MenuItem value="">Без группы</MenuItem>
						{themes.map((theme) => (
							<MenuItem key={theme.id} value={theme.id}>
								{theme.name}
							</MenuItem>
						))}
					</TextField>
					<TextField
						select
						size="small"
						label="Релизы"
						value={releaseIds}
						disabled={isSubmitting || !releases.length}
						helperText={
							releases.length
								? "Можно не выбирать релиз"
								: "В планировании пока нет релизов — задача добавится без них"
						}
						SelectProps={{
							multiple: true,
							renderValue: (selected) => {
								const ids = selected as string[];
								if (!ids.length) return "Без релиза";
								return ids
									.map((id) => {
										const release = releases.find((item) => item.id === id);
										return release
											? kanbanBoardTaskReleaseLabel(release)
											: id;
									})
									.join(", ");
							},
						}}
						onChange={(event) => {
							const value = event.target.value;
							setReleaseIds(
								typeof value === "string" ? value.split(",") : value,
							);
						}}
					>
						{releases.map((release) => (
							<MenuItem key={release.id} value={release.id}>
								<Checkbox
									size="small"
									checked={releaseIds.includes(release.id)}
								/>
								<ListItemText primary={kanbanBoardTaskReleaseLabel(release)} />
							</MenuItem>
						))}
					</TextField>
				</Flex>
			</DialogContent>
			<DialogActions>
				{onRemove ? (
					<Button
						color="error"
						disabled={isSubmitting}
						onClick={() => void onRemove()}
						sx={{ marginRight: "auto" }}
					>
						Убрать
					</Button>
				) : null}
				<Button onClick={onClose} disabled={isSubmitting}>
					Отмена
				</Button>
				<Button
					variant="contained"
					disabled={isSubmitting || !taskIds.length}
					onClick={() =>
						void onAssign({
							themeId: themeId || null,
							releaseIds,
						})
					}
				>
					{existing ? "Сохранить" : "Добавить"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
