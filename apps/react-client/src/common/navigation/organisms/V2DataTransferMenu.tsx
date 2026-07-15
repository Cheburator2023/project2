import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Typography from "@mui/material/Typography";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import {
	downloadBlob,
	formatV2DataTransferImportError,
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
	buildV2DataTransferExportFilename,
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
	onExportSection,
	onImportSection,
	exportingSection,
	importingSection,
	exportPending,
	importPending,
}: {
	sections: readonly V2DataTransferSection[];
	onToggle: (section: V2DataTransferSection) => void;
	disabled?: boolean;
	onExportSection?: (section: V2DataTransferSection) => void;
	onImportSection?: (section: V2DataTransferSection) => void;
	exportingSection?: V2DataTransferSection | null;
	importingSection?: V2DataTransferSection | null;
	exportPending?: boolean;
	importPending?: boolean;
}) {
	return (
		<Flex flexDirection="column" gap={4}>
			{V2_DATA_TRANSFER_SECTIONS.map((section) => {
				const sectionExportPending =
					exportPending && exportingSection === section;
				const sectionImportPending =
					importPending && importingSection === section;
				const sectionBusy = sectionExportPending || sectionImportPending;
				return (
					<Flex
						key={section}
						alignItems="center"
						justifyContent="space-between"
						gap={12}
					>
						<FormControlLabel
							sx={{ flex: 1, mr: 0 }}
							control={
								<Checkbox
									size="small"
									checked={sections.includes(section)}
									onChange={() => onToggle(section)}
									disabled={disabled || sectionBusy}
								/>
							}
							label={V2_DATA_TRANSFER_SECTION_LABELS[section]}
						/>
						{onExportSection || onImportSection ? (
							<Flex gap={8} flexShrink={0}>
								{onExportSection ? (
									<Button
										size="small"
										variant="outlined"
										startIcon={
											sectionExportPending ? (
												<CircularProgress size={14} color="inherit" />
											) : (
												<DownloadRoundedIcon />
											)
										}
										onClick={() => onExportSection(section)}
										disabled={disabled || exportPending || importPending}
										title={`Скачать только «${V2_DATA_TRANSFER_SECTION_LABELS[section]}»`}
									>
										Скачать
									</Button>
								) : null}
								{onImportSection ? (
									<Button
										size="small"
										variant="outlined"
										startIcon={
											sectionImportPending ? (
												<CircularProgress size={14} color="inherit" />
											) : (
												<UploadRoundedIcon />
											)
										}
										onClick={() => onImportSection(section)}
										disabled={disabled || exportPending || importPending}
										title={`Загрузить только «${V2_DATA_TRANSFER_SECTION_LABELS[section]}»`}
									>
										Загрузить
									</Button>
								) : null}
							</Flex>
						) : null}
					</Flex>
				);
			})}
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
	const [exportTarget, setExportTarget] = useState<
		| { kind: "all" }
		| { kind: "section"; section: V2DataTransferSection }
		| null
	>(null);
	const [importTarget, setImportTarget] = useState<
		| { kind: "selected" }
		| { kind: "section"; section: V2DataTransferSection }
		| null
	>(null);

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
		mutationFn: (exportSections: readonly V2DataTransferSection[]) =>
			v2DataTransferExport(exportSections),
		onSuccess: (blob, exportSections) => {
			downloadBlob(blob, buildV2DataTransferExportFilename(exportSections));
			toast.success("Данные v2 выгружены", {
				description:
					"Контрольная сумма sha256 включена в meta файла и проверяется при импорте.",
			});
		},
		onError: (error: Error) => {
			toast.error("Не удалось выгрузить данные v2", {
				description: error.message,
			});
		},
		onSettled: () => {
			setExportTarget(null);
		},
	});

	const onExport = useCallback(() => {
		setExportTarget({ kind: "all" });
		exportMutation.mutate(sections);
	}, [exportMutation, sections]);

	const onExportSection = useCallback(
		(section: V2DataTransferSection) => {
			setExportTarget({ kind: "section", section });
			exportMutation.mutate([section]);
		},
		[exportMutation],
	);

	const exportingSection =
		exportTarget?.kind === "section" ? exportTarget.section : null;
	const isBulkExportPending =
		exportMutation.isPending && exportTarget?.kind === "all";

	const importSections =
		importTarget?.kind === "section"
			? [importTarget.section]
			: sections;

	const importMutation = useMutation({
		mutationFn: ({
			file,
			mode,
			targetSections,
		}: {
			file: File;
			mode: V2DataImportMode;
			targetSections: readonly V2DataTransferSection[];
		}) => v2DataTransferImport(file, mode, targetSections),
		onSuccess: (result) => {
			setImportError(null);
			setImportDialogOpen(false);
			setImportTarget(null);
			void queryClient.invalidateQueries();
			const shaPrefix = result.meta.sha256.slice(0, 12);
			toast.success("Данные v2 импортированы", {
				description: `${formatImportStats(result)} · sha256 ${shaPrefix}… (проверено)`,
			});
		},
		onError: (error: unknown) => {
			setImportError(formatV2DataTransferImportError(error));
		},
	});

	const openImportPicker = useCallback(
		(target: typeof importTarget = { kind: "selected" }) => {
			setImportError(null);
			setImportMode("merge");
			setImportTarget(target);
			setImportDialogOpen(true);
		},
		[],
	);

	const onImportSection = useCallback(
		(section: V2DataTransferSection) => {
			openImportPicker({ kind: "section", section });
		},
		[openImportPicker],
	);

	const confirmImport = () => {
		fileInputRef.current?.click();
	};

	const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file || importSections.length === 0) return;
		importMutation.mutate({
			file,
			mode: importMode,
			targetSections: importSections,
		});
	};

	const selectedSectionLabels = importSections
		.map((section) => V2_DATA_TRANSFER_SECTION_LABELS[section])
		.join(", ");

	const importingSection =
		importTarget?.kind === "section" ? importTarget.section : null;

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
				onClose={() => {
					if (importMutation.isPending) return;
					setImportDialogOpen(false);
					setImportTarget(null);
				}}
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
					{importTarget?.kind === "section" ? (
						<Typography variant="body2" sx={{ mb: 1 }}>
							{V2_DATA_TRANSFER_SECTION_LABELS[importTarget.section]}
						</Typography>
					) : (
						<V2DataTransferSectionCheckboxes
							sections={sections}
							onToggle={toggleSection}
							disabled={importMutation.isPending}
						/>
					)}
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
						onClick={() => {
							setImportDialogOpen(false);
							setImportTarget(null);
						}}
						disabled={importMutation.isPending}
					>
						Отмена
					</Button>
					<Button
						variant="contained"
						onClick={confirmImport}
						disabled={
							importMutation.isPending || importSections.length === 0
						}
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
			onExportSection={onExportSection}
			onImportSection={onImportSection}
			exportingSection={exportingSection}
			importingSection={importingSection}
			exportPending={exportMutation.isPending}
			importPending={importMutation.isPending}
		/>
	);

	return {
		exportMutation,
		importDialog,
		sectionCheckboxes,
		sectionsSelected,
		isBulkExportPending,
		onExport,
		onExportSection,
		onImport: () => openImportPicker({ kind: "selected" }),
		onImportSection,
	};
}
