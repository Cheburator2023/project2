import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
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
import { Flex } from "@react-client/common/primitives/Flex";
import { toast } from "@react-client/common/toasts";
import {
	V2_DATA_TRANSFER_DEFAULT_SECTIONS,
	V2_DATA_TRANSFER_SECTION_LABELS,
	V2_DATA_TRANSFER_SECTIONS,
	type V2DataTransferSection,
} from "@smart-anketa/api-contract";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

function formatImportStats(result: V2DataImportResult): string {
	const { inserted, skipped } = result.stats;
	const insertedTotal = Object.values(inserted).reduce((a, b) => a + b, 0);
	const skippedTotal = Object.values(skipped).reduce((a, b) => a + b, 0);
	return `Добавлено записей: ${insertedTotal}, пропущено (конфликты): ${skippedTotal}`;
}

function V2DataTransferSectionCheckboxes({
	sections,
	onToggle,
	disabled,
}: {
	sections: readonly V2DataTransferSection[];
	onToggle: (section: V2DataTransferSection) => void;
	disabled?: boolean;
}) {
	return (
		<Flex flexDirection="column" gap={0}>
			{V2_DATA_TRANSFER_SECTIONS.map((section) => (
				<FormControlLabel
					key={section}
					control={
						<Checkbox
							size="small"
							checked={sections.includes(section)}
							onChange={() => onToggle(section)}
							disabled={disabled}
						/>
					}
					label={V2_DATA_TRANSFER_SECTION_LABELS[section]}
				/>
			))}
		</Flex>
	);
}

export function useV2DataTransferActions() {
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [importDialogOpen, setImportDialogOpen] = useState(false);
	const [importMode, setImportMode] = useState<V2DataImportMode>("merge");
	const [importError, setImportError] = useState<string | null>(null);
	const [sections, setSections] = useState<V2DataTransferSection[]>([
		...V2_DATA_TRANSFER_DEFAULT_SECTIONS,
	]);

	const toggleSection = useCallback((section: V2DataTransferSection) => {
		setSections((prev) => {
			if (prev.includes(section)) {
				const next = prev.filter((item) => item !== section);
				return next.length > 0 ? next : prev;
			}
			return [...prev, section];
		});
	}, []);

	const sectionsSelected = sections.length > 0;

	const exportMutation = useMutation({
		mutationFn: () => v2DataTransferExport(sections),
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
			v2DataTransferImport(file, mode, sections),
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

	const selectedSectionLabels = sections
		.map((section) => V2_DATA_TRANSFER_SECTION_LABELS[section])
		.join(", ");

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
						JSON-снапшот выбранных разделов. Аудит v2 не переносится.
					</Typography>
					<Typography variant="subtitle2" sx={{ mb: 1 }}>
						Разделы для импорта
					</Typography>
					<V2DataTransferSectionCheckboxes
						sections={sections}
						onToggle={toggleSection}
						disabled={importMutation.isPending}
					/>
					<Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
						Режим импорта
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
							label="Замена выбранных разделов — удалить их на стенде и загрузить из файла"
						/>
					</RadioGroup>
					{importMode === "replace" ? (
						<Alert severity="warning" sx={{ mt: 2 }}>
							Будут удалены и заменены только выбранные разделы:{" "}
							{selectedSectionLabels || "—"}. Это действие необратимо.
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
						disabled={importMutation.isPending || !sectionsSelected}
					>
						{importMutation.isPending ? "Импорт…" : "Выбрать файл"}
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);

	const sectionCheckboxes = (
		<V2DataTransferSectionCheckboxes
			sections={sections}
			onToggle={toggleSection}
			disabled={exportMutation.isPending || importMutation.isPending}
		/>
	);

	return {
		exportMutation,
		importDialog,
		sectionCheckboxes,
		sectionsSelected,
		onExport: () => exportMutation.mutate(),
		onImport: openImportPicker,
	};
}
