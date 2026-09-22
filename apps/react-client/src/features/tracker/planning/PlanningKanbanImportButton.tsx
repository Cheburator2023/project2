import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { useKanbanBoardImportPlanningKanban } from "@react-client/common/api/queries/kanban-board";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { toast } from "@react-client/common/toasts";
import { useRef, useState } from "react";
import type { KanbanBoardPlanningKanbanImportResultDto } from "@smart-anketa/api-contract";

type Props = {
	planningId: string;
	releaseId: string | null;
};

export function PlanningKanbanImportButton({ planningId, releaseId }: Props) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const importMutation = useKanbanBoardImportPlanningKanban();
	const [open, setOpen] = useState(false);
	const [result, setResult] =
		useState<KanbanBoardPlanningKanbanImportResultDto | null>(null);
	const [error, setError] = useState<string | null>(null);

	const close = () => {
		if (importMutation.isPending) return;
		setOpen(false);
		setResult(null);
		setError(null);
	};

	const handleFileSelected = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		setError(null);
		setResult(null);
		try {
			const imported = await importMutation.mutateAsync({
				planningId,
				file,
				releaseId,
			});
			setResult(imported);
			toast.success(
				`Импортировано: ${imported.createdCount} новых, ${imported.updatedCount} обновлено`,
			);
		} catch (caught) {
			setError(apiErrorMessage(caught));
		}
	};

	return (
		<>
			<Button
				size="small"
				variant="contained"
				sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
				title="Загрузить задачи из Excel (лист канбана с колонкой «доска»)"
				onClick={() => setOpen(true)}
			>
				Импорт из Excel
			</Button>

			<Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
				<DialogTitle>Импорт задач из Excel</DialogTitle>
				<DialogContent>
					<Flex flexDirection="column" gap={12}>
						<span>
							Берётся лист с колонками «Название», «Статус», «Текущий
							исполнитель», «доска» — например «Задачи 4СС.4С_Канбан». Задачи
							создаются или обновляются на указанных досках и добавляются в
							планирование
							{releaseId ? " и в выбранный релиз" : ""}.
						</span>
						<input
							ref={fileInputRef}
							type="file"
							hidden
							accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
							onChange={(event) => void handleFileSelected(event)}
						/>
						<Button
							variant="contained"
							disabled={importMutation.isPending}
							onClick={() => fileInputRef.current?.click()}
						>
							{importMutation.isPending ? "Импорт…" : "Выбрать файл"}
						</Button>
						{error ? <Alert severity="error">{error}</Alert> : null}
						{result ? (
							<Alert severity="success">
								Лист «{result.sheetName}»: создано {result.createdCount},
								обновлено {result.updatedCount}
								{result.releaseName
									? `, в релиз «${result.releaseName}» добавлено ${result.attachedCount}`
									: `, в планирование добавлено ${result.attachedCount}`}
								.
								{result.boards.length ? (
									<>
										{" "}
										Доски:{" "}
										{result.boards
											.map(
												(board) =>
													`${board.boardKey} (${board.taskCount}${
														board.created ? ", создана" : ""
													})`,
											)
											.join(", ")}
										.
									</>
								) : null}
							</Alert>
						) : null}
						{result?.warnings.length ? (
							<Alert severity="warning">
								<ul style={{ margin: 0, paddingLeft: 20 }}>
									{result.warnings.slice(0, 8).map((warning) => (
										<li key={warning}>{warning}</li>
									))}
									{result.warnings.length > 8 ? (
										<li>…и ещё {result.warnings.length - 8}</li>
									) : null}
								</ul>
							</Alert>
						) : null}
					</Flex>
					<Spacer space={8} />
				</DialogContent>
				<DialogActions>
					<Button onClick={close} disabled={importMutation.isPending}>
						Закрыть
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
