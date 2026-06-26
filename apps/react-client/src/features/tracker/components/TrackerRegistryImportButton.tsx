import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import { useKanbanBoardImportPlanningTasks } from "@react-client/common/api/queries/kanban-board";
import { V2AdminButton } from "@react-client/features/v2/admin/atoms/V2AdminButton";
import { useRef, useState } from "react";

export function TrackerRegistryImportButton() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const importMutation = useKanbanBoardImportPlanningTasks();
	const [resultOpen, setResultOpen] = useState(false);
	const [importWarnings, setImportWarnings] = useState<string[]>([]);
	const [importedCount, setImportedCount] = useState(0);
	const [importError, setImportError] = useState<string | null>(null);

	const handleFileSelected = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		setImportError(null);
		try {
			const result = await importMutation.mutateAsync(file);
			setImportedCount(result.importedCount);
			setImportWarnings(result.warnings);
			setResultOpen(true);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Не удалось импортировать файл";
			setImportError(message);
			setResultOpen(true);
		}
	};

	return (
		<>
			<V2AdminButton
				variant="outlined"
				disabled={importMutation.isPending}
				onClick={() => fileInputRef.current?.click()}
			>
				{importMutation.isPending ? "Импорт…" : "Импорт XLSX"}
			</V2AdminButton>
			<input
				ref={fileInputRef}
				type="file"
				hidden
				accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
				onChange={(event) => void handleFileSelected(event)}
			/>

			<Dialog
				open={resultOpen}
				onClose={() => {
					setResultOpen(false);
					setImportError(null);
				}}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>
					{importError ? "Ошибка импорта" : "Импорт завершён"}
				</DialogTitle>
				<DialogContent>
					<Stack spacing={1.5}>
						{importError ? (
							<Alert severity="error">{importError}</Alert>
						) : (
							<Alert severity="success">
								Импортировано задач в «Кучу»: {importedCount}
							</Alert>
						)}
						{!importError && importWarnings.length ? (
							<Alert severity="warning">
								<Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
									{importWarnings.slice(0, 8).map((warning) => (
										<li key={warning}>{warning}</li>
									))}
									{importWarnings.length > 8 ? (
										<li>…и ещё {importWarnings.length - 8}</li>
									) : null}
								</Stack>
							</Alert>
						) : null}
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setResultOpen(false)}>Закрыть</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
