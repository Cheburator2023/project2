import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { ColDef, ValueParserParams } from "ag-grid-community";
import { Card } from "@react-client/common/muiCustom/Card";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import {
	useKanbanBoardAssignees,
	useKanbanBoardSettings,
	useUpdateKanbanBoardAssignee,
	useUpdateKanbanBoardSettings,
} from "@react-client/common/api/queries/kanban-board";
import { TrackerRegistryGrid } from "@react-client/features/tracker/components/TrackerRegistryGrid";
import {
	clearAgGridColumnStates,
	TRACKER_AG_GRID_STATE_KEYS,
} from "@react-client/common/tableStuff/agGridColumnState";
import {
	KANBAN_BOARD_DEFAULT_SPRINT_CAPACITY_PD,
	type KanbanBoardAssigneeDto,
} from "@smart-anketa/api-contract";
import { useEffect, useMemo, useState } from "react";

const parseCapacity = (value: unknown): number | null => {
	if (value === null || value === undefined || value === "") return null;
	const parsed = Number(value);
	if (Number.isNaN(parsed) || parsed < 0) return null;
	return parsed;
};

export function TrackerSettingsPage() {
	const { data: settings, isLoading: settingsLoading } = useKanbanBoardSettings();
	const { data: assignees = [], isLoading: assigneesLoading } =
		useKanbanBoardAssignees();
	const updateSettings = useUpdateKanbanBoardSettings();
	const updateAssignee = useUpdateKanbanBoardAssignee();

	const [defaultCapacity, setDefaultCapacity] = useState(
		String(KANBAN_BOARD_DEFAULT_SPRINT_CAPACITY_PD),
	);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [gridResetNotice, setGridResetNotice] = useState<string | null>(null);

	useEffect(() => {
		if (settings) {
			setDefaultCapacity(String(settings.defaultSprintCapacityPd));
		}
	}, [settings]);

	const columnDefs = useMemo<ColDef<KanbanBoardAssigneeDto>[]>(
		() => [
			{ field: "name", headerName: "Исполнитель", flex: 1, minWidth: 160 },
			{ field: "roleTitle", headerName: "Роль", width: 120 },
			{ field: "email", headerName: "Email", flex: 1, minWidth: 180 },
			{
				field: "taskCount",
				headerName: "Задач",
				width: 90,
				type: "numericColumn",
				editable: false,
			},
			{
				field: "sprintCapacityPd",
				headerName: "Ёмкость, чд",
				width: 130,
				type: "numericColumn",
				editable: true,
				valueParser: (params: ValueParserParams<KanbanBoardAssigneeDto>) =>
					parseCapacity(params.newValue),
				valueFormatter: (params) =>
					params.value === null || params.value === undefined
						? "—"
						: String(params.value),
			},
			{
				field: "effectiveSprintCapacityPd",
				headerName: "Итого ёмкость",
				width: 130,
				type: "numericColumn",
				editable: false,
			},
		],
		[],
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

	const handleCapacityChange = async (
		row: KanbanBoardAssigneeDto,
		value: unknown,
	) => {
		const parsed = parseCapacity(value);
		if (parsed === null && value !== null && value !== "" && value !== "—") {
			return;
		}
		await updateAssignee.mutateAsync({
			id: row.id,
			data: { sprintCapacityPd: parsed },
		});
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
			<Spacer space={8} />
			<Flex flexDirection="column" gap={2} flexGrow={1} minHeight="0" sx={{ px: 1 }}>
				<Card padding="20px">
					<Stack spacing={2} maxWidth={480}>
						<Typography variant="h6">Планирование спринта</Typography>
						<Typography variant="body2" color="text.secondary">
							Ёмкость по умолчанию для новых исполнителей и для тех, у кого
							не задано индивидуальное значение (как колонка «9» в Excel).
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

				<Card padding="20px" sx={{ flex: 1, minHeight: 0, display: "flex" }}>
					<Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
						<Flex alignItems="baseline" gap={2} wrap="wrap">
							<Typography variant="h6">Ёмкость исполнителей</Typography>
							<Typography variant="body2" color="text.secondary">
								Кликните по ячейке «Ёмкость, чд» для редактирования. Пустое
								значение — используется ёмкость по умолчанию.
							</Typography>
						</Flex>
						<Flex flexGrow={1} minHeight="360px">
							<TrackerRegistryGrid
								gridStateKey="tracker.settings-assignees"
								rowData={assignees}
								columnDefs={columnDefs}
								loading={assigneesLoading}
								onCellValueChanged={(row, field, value) => {
									if (field === "sprintCapacityPd") {
										void handleCapacityChange(row, value);
									}
								}}
							/>
						</Flex>
					</Stack>
				</Card>
			</Flex>
		</Flex>
	);
}
