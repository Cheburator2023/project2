import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { generateTrackerAutoCode } from "@react-client/features/tracker/trackerAutoCode";
import {
	KANBAN_BOARD_RELEASE_IMAGE_TARGETS,
	KANBAN_BOARD_RELEASE_STATUSES,
	kanbanBoardReleaseStatusTitle,
	kanbanBoardTaskReleaseLabel,
	normalizeKanbanBoardReleaseImageVersions,
	type KanbanBoardReleaseDto,
	type KanbanBoardReleaseImageVersions,
	type KanbanBoardReleaseStatusId,
	type KanbanBoardSprintDto,
	type KanbanBoardSupersprintDto,
} from "@smart-anketa/api-contract";
import { useEffect, useState } from "react";

export function PlanningReleaseCreateDialog({
	open,
	isSubmitting,
	onClose,
	onCreate,
}: {
	open: boolean;
	isSubmitting: boolean;
	onClose: () => void;
	onCreate: (input: { code: string; name: string }) => Promise<void>;
}) {
	const [code, setCode] = useState(() => generateTrackerAutoCode("rel"));
	const [name, setName] = useState("");

	useEffect(() => {
		if (!open) return;
		setCode(generateTrackerAutoCode("rel"));
		setName("");
	}, [open]);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Создать релиз</DialogTitle>
			<DialogContent>
				<Spacer space={8} />
				<Flex flexDirection="column" gap={8}>
					<TextField
						size="small"
						label="Код"
						value={code}
						onChange={(event) => setCode(event.target.value)}
						disabled={isSubmitting}
					/>
					<TextField
						size="small"
						label="Название"
						value={name}
						onChange={(event) => setName(event.target.value)}
						disabled={isSubmitting}
					/>
				</Flex>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={isSubmitting}>
					Отмена
				</Button>
				<Button
					variant="contained"
					disabled={!code.trim() || !name.trim() || isSubmitting}
					onClick={() =>
						void onCreate({ code: code.trim(), name: name.trim() })
					}
				>
					Создать
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export function PlanningReleaseAttachDialog({
	open,
	options,
	isSubmitting,
	onClose,
	onAttach,
}: {
	open: boolean;
	options: Array<{
		id: string;
		code: string;
		name: string;
		status?: string;
	}>;
	isSubmitting: boolean;
	onClose: () => void;
	onAttach: (releaseId: string) => Promise<void>;
}) {
	const [releaseId, setReleaseId] = useState("");

	useEffect(() => {
		if (!open) return;
		setReleaseId("");
	}, [open]);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Прикрепить релиз</DialogTitle>
			<DialogContent>
				<Spacer space={8} />
				{options.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						Нет незакрытых релизов для прикрепления
					</Typography>
				) : (
					<TextField
						size="small"
						select
						fullWidth
						label="Существующий релиз"
						value={releaseId}
						onChange={(event) => setReleaseId(event.target.value)}
						disabled={isSubmitting}
					>
						<MenuItem value="">—</MenuItem>
						{options.map((item) => (
							<MenuItem key={item.id} value={item.id}>
								{kanbanBoardTaskReleaseLabel(item)}
								{item.status
									? ` · ${kanbanBoardReleaseStatusTitle(item.status)}`
									: ""}
							</MenuItem>
						))}
					</TextField>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={isSubmitting}>
					Отмена
				</Button>
				<Button
					variant="contained"
					disabled={!releaseId || isSubmitting}
					onClick={() => void onAttach(releaseId)}
				>
					Прикрепить
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export function PlanningReleaseSettingsDialog({
	open,
	release,
	sprints,
	supersprints,
	isSaving,
	isUnlinking,
	onClose,
	onSave,
	onUnlink,
}: {
	open: boolean;
	release: KanbanBoardReleaseDto | null;
	sprints: KanbanBoardSprintDto[];
	supersprints: KanbanBoardSupersprintDto[];
	isSaving: boolean;
	isUnlinking: boolean;
	onClose: () => void;
	onSave: (input: {
		name: string;
		status: KanbanBoardReleaseStatusId;
		startDate: string;
		endDate: string;
		supersprintId: string;
		sprintId: string;
		imageVersions: KanbanBoardReleaseImageVersions;
	}) => Promise<void>;
	onUnlink: () => Promise<void>;
}) {
	const [name, setName] = useState("");
	const [status, setStatus] = useState<KanbanBoardReleaseStatusId>("draft");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [supersprintId, setSupersprintId] = useState("");
	const [sprintId, setSprintId] = useState("");
	const [imageVersions, setImageVersions] =
		useState<KanbanBoardReleaseImageVersions>({});

	useEffect(() => {
		if (!open || !release) return;
		setName(release.name);
		setStatus(release.status);
		setStartDate(release.startDate ?? "");
		setEndDate(release.endDate ?? "");
		setSupersprintId(release.supersprintId ?? "");
		setSprintId(release.sprintId ?? "");
		setImageVersions(release.imageVersions ?? {});
	}, [open, release]);

	const busy = isSaving || isUnlinking;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>
				{release ? kanbanBoardTaskReleaseLabel(release) : "Настройки релиза"}
			</DialogTitle>
			<DialogContent>
				<Spacer space={8} />
				<Flex flexDirection="column" gap={8}>
					<TextField
						size="small"
						label="Название"
						value={name}
						onChange={(event) => setName(event.target.value)}
						disabled={busy}
					/>
					<TextField
						size="small"
						select
						label="Статус"
						value={status}
						onChange={(event) =>
							setStatus(event.target.value as KanbanBoardReleaseStatusId)
						}
						disabled={busy}
					>
						{KANBAN_BOARD_RELEASE_STATUSES.map((item) => (
							<MenuItem key={item.id} value={item.id}>
								{item.title}
							</MenuItem>
						))}
					</TextField>
					<Flex gap={8}>
						<TextField
							size="small"
							type="date"
							label="Начало"
							InputLabelProps={{ shrink: true }}
							value={startDate}
							onChange={(event) => setStartDate(event.target.value)}
							disabled={busy}
							fullWidth
						/>
						<TextField
							size="small"
							type="date"
							label="Окончание"
							InputLabelProps={{ shrink: true }}
							value={endDate}
							onChange={(event) => setEndDate(event.target.value)}
							disabled={busy}
							fullWidth
						/>
					</Flex>
					<TextField
						size="small"
						select
						label="Суперспринт"
						value={supersprintId}
						onChange={(event) => setSupersprintId(event.target.value)}
						disabled={busy}
					>
						<MenuItem value="">—</MenuItem>
						{supersprints.map((item) => (
							<MenuItem key={item.id} value={item.id}>
								{item.code} — {item.name}
							</MenuItem>
						))}
					</TextField>
					<TextField
						size="small"
						select
						label="Спринт"
						value={sprintId}
						onChange={(event) => setSprintId(event.target.value)}
						disabled={busy}
					>
						<MenuItem value="">—</MenuItem>
						{sprints.map((item) => (
							<MenuItem key={item.id} value={item.id}>
								{item.code} — {item.name}
							</MenuItem>
						))}
					</TextField>
					<Typography variant="subtitle2">Версии образов</Typography>
					{KANBAN_BOARD_RELEASE_IMAGE_TARGETS.map((target) => (
						<TextField
							key={target.id}
							size="small"
							label={target.label}
							value={imageVersions[target.id] ?? ""}
							onChange={(event) =>
								setImageVersions((prev) => ({
									...prev,
									[target.id]: event.target.value,
								}))
							}
							disabled={busy}
						/>
					))}
				</Flex>
			</DialogContent>
			<DialogActions>
				<Button
					color="warning"
					disabled={!release || busy}
					onClick={() => void onUnlink()}
					title="Релиз останется в реестре, но выйдет из этого планирования"
					sx={{ mr: "auto" }}
				>
					Открепить
				</Button>
				<Button onClick={onClose} disabled={busy}>
					Отмена
				</Button>
				<Button
					variant="contained"
					disabled={!release || !name.trim() || busy}
					onClick={() =>
						void onSave({
							name: name.trim(),
							status,
							startDate,
							endDate,
							supersprintId,
							sprintId,
							imageVersions:
								normalizeKanbanBoardReleaseImageVersions(imageVersions),
						})
					}
				>
					Сохранить
				</Button>
			</DialogActions>
		</Dialog>
	);
}
