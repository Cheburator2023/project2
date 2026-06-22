import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Typography from "@mui/material/Typography";
import {
	downloadBlob,
	v2DataTransferExport,
	v2DataTransferImport,
	type V2DataImportMode,
	type V2DataImportResult,
} from "@react-client/common/api/queries/v2-data-transfer";
import { toast } from "@react-client/common/toasts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

function formatImportStats(result: V2DataImportResult): string {
	const { inserted, skipped } = result.stats;
	const insertedTotal = Object.values(inserted).reduce((a, b) => a + b, 0);
	const skippedTotal = Object.values(skipped).reduce((a, b) => a + b, 0);
	return `Добавлено записей: ${insertedTotal}, пропущено (конфликты): ${skippedTotal}`;
}

export function useV2DataTransferActions() {
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [importDialogOpen, setImportDialogOpen] = useState(false);
	const [importMode, setImportMode] = useState<V2DataImportMode>("merge");
	const [importError, setImportError] = useState<string | null>(null);

	const exportMutation = useMutation({
		mutationFn: () => v2DataTransferExport(),
		onSuccess: (blob) => {
			const date = new Date().toISOString().slice(0, 10);
			downloadBlob(blob, `smart-anketa-v2-${date}.json`);
			toast.success("Данные v2 выгружены");
		},
		onError: (error: Error) => {
			toast.error("Не удалось выгрузить данные v2", {
				description: error.message,
			});
		},
	});

	const importMutation = useMutation({
		mutationFn: ({ file, mode }: { file: File; mode: V2DataImportMode }) =>
			v2DataTransferImport(file, mode),
		onSuccess: (result) => {
			setImportError(null);
			setImportDialogOpen(false);
			void queryClient.invalidateQueries();
			toast.success("Данные v2 импортированы", {
				description: formatImportStats(result),
			});
		},
		onError: (error: {
			response?: { data?: { message?: string } };
			message?: string;
		}) => {
			const message =
				error?.response?.data?.message ?? error?.message ?? "Ошибка импорта";
			setImportError(String(message));
		},
	});

	const openImportPicker = () => {
		setImportError(null);
		setImportMode("merge");
		setImportDialogOpen(true);
	};

	const confirmImport = () => {
		fileInputRef.current?.click();
	};

	const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		importMutation.mutate({ file, mode: importMode });
	};

	const importDialog = (
		<>
			<input
				ref={fileInputRef}
				type="file"
				accept=".json,application/json"
				hidden
				onChange={onFileSelected}
			/>
			<Dialog
				open={importDialogOpen}
				onClose={() => !importMutation.isPending && setImportDialogOpen(false)}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>Импорт данных v2</DialogTitle>
				<DialogContent>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						JSON-снапшот шаблонов, справочников, типовых работ и анкет. Аудит v2
						не переносится.
					</Typography>
					<RadioGroup
						value={importMode}
						onChange={(e) => setImportMode(e.target.value as V2DataImportMode)}
					>
						<FormControlLabel
							value="merge"
							control={<Radio />}
							label="Добавить новые (пропускать конфликты по code / catalogKey / readableId)"
						/>
						<FormControlLabel
							value="replace"
							control={<Radio />}
							label="Полная замена — удалить все данные v2 на стенде и загрузить из файла"
						/>
					</RadioGroup>
					{importMode === "replace" ? (
						<Alert severity="warning" sx={{ mt: 2 }}>
							Режим замены удалит текущие шаблоны, справочники, работы и анкеты
							v2. Это действие необратимо.
						</Alert>
					) : null}
					{importError ? (
						<Alert severity="error" sx={{ mt: 2 }}>
							{importError}
						</Alert>
					) : null}
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => setImportDialogOpen(false)}
						disabled={importMutation.isPending}
					>
						Отмена
					</Button>
					<Button
						variant="contained"
						onClick={confirmImport}
						disabled={importMutation.isPending}
					>
						{importMutation.isPending ? "Импорт…" : "Выбрать файл"}
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);

	return {
		exportMutation,
		importDialog,
		onExport: () => exportMutation.mutate(),
		onImport: openImportPicker,
	};
}

export function V2DataTransferMenuItems({
	onExport,
	onImport,
	exportPending,
}: {
	onExport: () => void;
	onImport: () => void;
	exportPending: boolean;
}) {
	return (
		<>
			<MenuItem onClick={onExport} disabled={exportPending}>
				<ListItemText
					primary={exportPending ? "Выгрузка v2…" : "Выгрузить данные v2"}
				/>
			</MenuItem>
			<MenuItem onClick={onImport}>
				<ListItemText primary="Загрузить данные v2" />
			</MenuItem>
		</>
	);
}
