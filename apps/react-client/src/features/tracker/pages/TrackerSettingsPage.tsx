import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Card } from "@react-client/common/muiCustom/Card";
import { FuzzyAutocomplete } from "@react-client/common/muiCustom/FuzzyAutocomplete";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { Flex } from "@react-client/common/primitives/Flex";
import {
	useKanbanBoardAssignees,
	useKanbanBoardSettings,
	useResetKanbanBoardColumnsToDefault,
	useUpdateKanbanBoardSettings,
} from "@react-client/common/api/queries/kanban-board";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { toast } from "@react-client/common/toasts";
import {
	clearAgGridColumnStates,
	TRACKER_AG_GRID_STATE_KEYS,
} from "@react-client/common/tableStuff/agGridColumnState";
import {
	KANBAN_BOARD_DEFAULT_SPRINT_CAPACITY_PD,
	KANBAN_BOARD_STATUSES,
} from "@smart-anketa/api-contract";
import { useEffect, useMemo, useState } from "react";

type AssigneeOption = {
	value: string;
	label: string;
};

const parseCapacity = (value: unknown): number | null => {
	if (value === null || value === undefined || value === "") return null;
	const parsed = Number(value);
	if (Number.isNaN(parsed) || parsed < 0) return null;
	return parsed;
};

export function TrackerSettingsPage() {
	const { data: settings, isLoading: settingsLoading } =
		useKanbanBoardSettings();
	const { data: assignees = [], isLoading: assigneesLoading } =
		useKanbanBoardAssignees();
	const updateSettings = useUpdateKanbanBoardSettings();
	const resetBoardColumns = useResetKanbanBoardColumnsToDefault();

	const [defaultCapacity, setDefaultCapacity] = useState(
		String(KANBAN_BOARD_DEFAULT_SPRINT_CAPACITY_PD),
	);
	const [defaultCurrentUser, setDefaultCurrentUser] = useState("");
	const [saveError, setSaveError] = useState<string | null>(null);
	const [userSaveError, setUserSaveError] = useState<string | null>(null);
	const [gridResetNotice, setGridResetNotice] = useState<string | null>(null);
	const [confirmColumnsResetOpen, setConfirmColumnsResetOpen] = useState(false);
	const [columnsResetNotice, setColumnsResetNotice] = useState<string | null>(
		null,
	);

	const defaultColumnTitles = useMemo(
		() => KANBAN_BOARD_STATUSES.map((status) => status.title),
		[],
	);

	useEffect(() => {
		if (settings) {
			setDefaultCapacity(String(settings.defaultSprintCapacityPd));
			setDefaultCurrentUser(settings.defaultCurrentUserAssigneeName ?? "");
		}
	}, [settings]);

	const assigneeOptions = useMemo<AssigneeOption[]>(
		() =>
			assignees.map((item) => ({
				value: item.name,
				label: item.roleTitle
					? `${item.name} — ${item.roleTitle}`
					: item.name,
			})),
		[assignees],
	);

	const selectedCurrentUser = useMemo(
		() =>
			assigneeOptions.find((option) => option.value === defaultCurrentUser) ??
			null,
		[assigneeOptions, defaultCurrentUser],
	);

	const handleSaveDefault = async () => {
		setSaveError(null);
		const parsed = parseCapacity(defaultCapacity);
		if (parsed === null) {
			setSaveError("Укажите неотрицательное число человеко-дней");
			return;
		}
		try {
			await updateSettings.mutateAsync({ defaultSprintCapacityPd: parsed });
		} catch {
			setSaveError("Не удалось сохранить настройки");
		}
	};

	const handleSaveCurrentUser = async () => {
		setUserSaveError(null);
		try {
			await updateSettings.mutateAsync({
				defaultCurrentUserAssigneeName: defaultCurrentUser.trim() || null,
			});
			toast.success("Исполнитель по умолчанию сохранён");
		} catch {
			setUserSaveError("Не удалось сохранить исполнителя");
		}
	};

	const handleResetGridColumns = () => {
		clearAgGridColumnStates(TRACKER_AG_GRID_STATE_KEYS);
		setGridResetNotice(
			"Настройки колонок сброшены. Обновите открытые страницы реестров или откройте их заново.",
		);
	};

	return (
		<Flex flexDirection="column" flexGrow={1} minHeight="0">
			<Header title="Настройки трекера" />
			<Flex flexDirection="column" gap={2} flexGrow={1} minHeight="0">
				<Card padding="20px">
					<Stack spacing={2} maxWidth={480}>
						<Typography variant="h6">Планирование спринта</Typography>
						<Typography variant="body2" color="text.secondary">
							Ёмкость по умолчанию для новых исполнителей и для тех, у кого не
							задано индивидуальное значение (как колонка «9» в Excel).
						</Typography>
						<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
							<TextField
								label="Ёмкость спринта по умолчанию, чд"
								type="number"
								value={defaultCapacity}
								onChange={(event) => setDefaultCapacity(event.target.value)}
								inputProps={{ min: 0, step: 0.5 }}
								disabled={settingsLoading}
								fullWidth
							/>
							<Button
								variant="contained"
								onClick={() => void handleSaveDefault()}
								disabled={updateSettings.isPending || settingsLoading}
								sx={{ alignSelf: { sm: "flex-end" }, minWidth: 140 }}
							>
								Сохранить
							</Button>
						</Stack>
						{saveError ? <Alert severity="error">{saveError}</Alert> : null}
					</Stack>
				</Card>

				<Card padding="20px">
					<Stack spacing={2} maxWidth={480}>
						<Typography variant="h6">Текущий пользователь</Typography>
						<Typography variant="body2" color="text.secondary">
							Кто вы в трекере — используется как исполнитель по умолчанию при
							написании комментариев к задачам. Пока нет привязки к учётной
							записи, выбор делается вручную.
						</Typography>
						<FuzzyAutocomplete<AssigneeOption>
							label="Я — исполнитель"
							options={assigneeOptions}
							value={selectedCurrentUser}
							onChange={(option) =>
								setDefaultCurrentUser(option?.value ?? "")
							}
							getOptionLabel={(option) => option.label}
							getOptionValue={(option) => option.value}
							disabled={assigneesLoading || settingsLoading}
							fullWidth
						/>
						<Button
							variant="contained"
							onClick={() => void handleSaveCurrentUser()}
							disabled={updateSettings.isPending || settingsLoading}
							sx={{ alignSelf: "flex-start", minWidth: 140 }}
						>
							Сохранить
						</Button>
						{userSaveError ? (
							<Alert severity="error">{userSaveError}</Alert>
						) : null}
					</Stack>
				</Card>

				<Card padding="20px">
					<Stack spacing={2} maxWidth={640}>
						<Typography variant="h6">Колонки досок</Typography>
						<Typography variant="body2" color="text.secondary">
							Заводской набор колонок для новых досок и сброса существующих.
							Задачи из удалённых колонок переносятся по соответствию старых
							статусов; неизвестные — во «Входной буфер».
						</Typography>
						<Typography variant="body2" component="div">
							{defaultColumnTitles.map((title) => (
								<span key={title}>
									{title}
									<br />
								</span>
							))}
						</Typography>
						<Button
							variant="outlined"
							color="warning"
							onClick={() => setConfirmColumnsResetOpen(true)}
							disabled={resetBoardColumns.isPending}
							sx={{ alignSelf: "flex-start" }}
						>
							Применить ко всем доскам
						</Button>
						{columnsResetNotice ? (
							<Alert severity="info">{columnsResetNotice}</Alert>
						) : null}
					</Stack>
				</Card>

				<Card padding="20px">
					<Stack spacing={2} maxWidth={560}>
						<Typography variant="h6">Таблицы реестров</Typography>
						<Typography variant="body2" color="text.secondary">
							Порядок и набор колонок сохраняются в браузере автоматически.
							Сброс вернёт таблицы к исходному виду на всех страницах трекера.
						</Typography>
						<Button
							variant="outlined"
							onClick={handleResetGridColumns}
							sx={{ alignSelf: "flex-start" }}
						>
							Сбросить колонки всех таблиц
						</Button>
						{gridResetNotice ? (
							<Alert severity="info">{gridResetNotice}</Alert>
						) : null}
					</Stack>
				</Card>
			</Flex>

			<Dialog
				open={confirmColumnsResetOpen}
				onClose={() => setConfirmColumnsResetOpen(false)}
			>
				<DialogTitle>Применить заводские колонки?</DialogTitle>
				<DialogContent>
					<DialogContentText>
						На всех досках будут пересозданы колонки по заводскому списку.
						Задачи из старых колонок будут перенесены; кастомные колонки
						исчезнут.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmColumnsResetOpen(false)}>
						Отмена
					</Button>
					<Button
						variant="contained"
						color="warning"
						disabled={resetBoardColumns.isPending}
						onClick={() => {
							resetBoardColumns.mutate(undefined, {
								onSuccess: (result) => {
									setConfirmColumnsResetOpen(false);
									setColumnsResetNotice(
										`Обновлено досок: ${result.boardCount}. Перенесено задач: ${result.movedTaskCount}.`,
									);
									toast.success("Заводские колонки применены");
								},
								onError: (error) => {
									toast.error("Не удалось обновить колонки", {
										description: apiErrorMessage(error),
									});
								},
							});
						}}
					>
						Применить
					</Button>
				</DialogActions>
			</Dialog>
		</Flex>
	);
}
