import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { styled, useColorScheme } from "@mui/material/styles";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import {
	importV2MasterRegistry,
	type V2MasterRegistryCandidate,
	type V2MasterRegistryImportOverrides,
	type V2MasterRegistryImportResult,
	type V2MasterRegistryIssue,
} from "@react-client/common/api/queries/v2-master-registry-import";
import { Card } from "@react-client/common/muiCustom/Card";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { getAgGridMainMenuItems } from "@react-client/common/tableStuff/agGridMainMenuItems";
import { AG_GRID_SET_FILTER_PARAMS } from "@react-client/common/tableStuff/agGridSetFilterParams";
import { registerAgGridTableModules } from "@react-client/common/tableStuff/agGridTableModules";
import { toast } from "@react-client/common/toasts";
import { useDeleteAllV2Questionnaires } from "@react-client/common/api/queries/v2-questionnaires";
import { V2_QUESTIONNAIRE_DELETE_ALL_CONFIRM } from "@smart-anketa/api-contract";
import { commonRoutes } from "@react-client/routing/common/routes";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "@react-client/theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";
import {
	ModuleRegistry,
	type ColDef,
	type GridApi,
	type ICellRendererParams,
	type SelectionChangedEvent,
} from "ag-grid-community";
import { SetFilterModule } from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import {
	useCallback,
	useMemo,
	useRef,
	useState,
	type ChangeEvent,
} from "react";

registerAgGridTableModules();
ModuleRegistry.registerModules([SetFilterModule]);

const ISSUE_LABELS: Record<string, string> = {
	dept_unmatched: "Департамент не найден в справочнике СА",
	stream_unmatched: "Стрим не сопоставлен с кодом СА",
	prod_invalid: "Недопустимое значение «Необходимость продуктивизации»",
	name_missing: "Пустое «Наименование задачи» — подставлена заглушка",
	create_failed: "Не удалось создать анкету",
};

const ISSUE_PRIORITY = [
	"dept_unmatched",
	"stream_unmatched",
	"prod_invalid",
	"name_missing",
] as const;

type CandidateGridRow = {
	id: string;
	masterRow: number;
	masterNo: string;
	calcName: string;
	issuesLabel: string;
	code: string;
	codeLabel: string;
	value: string;
	suggestions: string;
	suggestionsList: string[];
	selectOptions: string[];
	appliedTo: string;
};

/** Похожие сверху, затем остальной справочник без дублей. */
function mergeSelectOptions(
	suggestions: readonly string[],
	catalog: readonly string[],
): string[] {
	const out: string[] = [];
	const seen = new Set<string>();
	for (const item of [...suggestions, ...catalog]) {
		const text = item.trim();
		if (!text || seen.has(text)) continue;
		seen.add(text);
		out.push(text);
	}
	return out;
}

const GridWrapper = styled(Box)`
	width: 100%;
	flex: 1;
	min-height: 320px;
	& .ag-root-wrapper {
		min-height: 320px;
		height: 100%;
	}
`;

function streamCodeFromSuggestion(suggestion: string): string {
	const parts = suggestion.split(/\s*→\s*/);
	if (parts.length >= 2) return (parts[parts.length - 1] ?? "").trim();
	return suggestion.trim();
}

function canPickSuggestion(code: string): boolean {
	return (
		code === "dept_unmatched" ||
		code === "stream_unmatched" ||
		code === "prod_invalid"
	);
}

function suggestionToOverrideValue(code: string, suggestion: string): string {
	if (code === "stream_unmatched") return streamCodeFromSuggestion(suggestion);
	return suggestion.trim();
}

function emptyOverrides(): V2MasterRegistryImportOverrides {
	return { departments: {}, streams: {}, production: {} };
}

function setOverrideForIssue(
	prev: V2MasterRegistryImportOverrides,
	code: string,
	fromValue: string,
	toValue: string,
): V2MasterRegistryImportOverrides {
	const next: V2MasterRegistryImportOverrides = {
		departments: { ...(prev.departments ?? {}) },
		streams: { ...(prev.streams ?? {}) },
		production: { ...(prev.production ?? {}) },
	};
	if (!fromValue) return prev;
	if (!toValue) {
		if (code === "dept_unmatched") delete next.departments![fromValue];
		if (code === "stream_unmatched") delete next.streams![fromValue];
		if (code === "prod_invalid") delete next.production![fromValue];
		return next;
	}
	if (code === "dept_unmatched") next.departments![fromValue] = toValue;
	else if (code === "stream_unmatched") next.streams![fromValue] = toValue;
	else if (code === "prod_invalid") next.production![fromValue] = toValue;
	return next;
}

type AppliedSelectParams = ICellRendererParams<CandidateGridRow> & {
	onPickSuggestion: (row: CandidateGridRow, overrideValue: string) => void;
};

/** Колонка «Будет применено»: заглушка / select / выбранное значение. */
function AppliedValueCell(params: AppliedSelectParams) {
	const row = params.data;
	if (!row) return null;

	if (row.code === "name_missing") {
		const stub = row.appliedTo || row.calcName;
		return <span title={stub}>{stub || "—"}</span>;
	}

	if (!row.code) {
		return <span>—</span>;
	}

	const options = row.selectOptions;
	const pickable = canPickSuggestion(row.code);
	const showSelect =
		pickable &&
		(row.code === "dept_unmatched" ? options.length > 0 : options.length > 1);

	if (showSelect) {
		const current = row.appliedTo || "";
		return (
			<FormControl
				size="small"
				fullWidth
				variant="standard"
				sx={{ minWidth: 0, mt: "2px" }}
				onClick={(e) => e.stopPropagation()}
				onMouseDown={(e) => e.stopPropagation()}
			>
				<Select
					displayEmpty
					value={current}
					title={
						row.code === "dept_unmatched"
							? "Полный справочник департаментов СА"
							: "Выберите значение для загрузки"
					}
					MenuProps={{
						PaperProps: {
							style: { maxHeight: 360 },
						},
					}}
					onChange={(e) => {
						params.onPickSuggestion(row, String(e.target.value ?? ""));
					}}
					sx={{
						fontSize: 13,
						"& .MuiSelect-select": {
							py: 0.25,
							pr: "24px !important",
						},
					}}
				>
					<MenuItem value="">
						<em>— выбрать —</em>
					</MenuItem>
					{options.map((suggestion) => {
						const value = suggestionToOverrideValue(row.code, suggestion);
						return (
							<MenuItem key={`${value}:${suggestion}`} value={value}>
								{suggestion}
							</MenuItem>
						);
					})}
				</Select>
			</FormControl>
		);
	}

	if (row.appliedTo) {
		return <span title={row.appliedTo}>{row.appliedTo}</span>;
	}

	if (pickable && options.length === 1) {
		return (
			<span title={options[0]} style={{ opacity: 0.7 }}>
				{options[0]}
			</span>
		);
	}

	return <span>—</span>;
}

function countOverrides(overrides: V2MasterRegistryImportOverrides): number {
	return (
		Object.keys(overrides.departments ?? {}).length +
		Object.keys(overrides.streams ?? {}).length +
		Object.keys(overrides.production ?? {}).length
	);
}

function appliedForIssue(
	code: string,
	value: string,
	overrides: V2MasterRegistryImportOverrides,
): string {
	if (!value) return "";
	if (code === "dept_unmatched") return overrides.departments?.[value] ?? "";
	if (code === "stream_unmatched") return overrides.streams?.[value] ?? "";
	if (code === "prod_invalid") return overrides.production?.[value] ?? "";
	return "";
}

function pickPrimaryIssue(
	issues: readonly V2MasterRegistryIssue[],
): V2MasterRegistryIssue | null {
	for (const code of ISSUE_PRIORITY) {
		const found = issues.find((issue) => issue.code === code);
		if (found) return found;
	}
	return issues[0] ?? null;
}

function buildCandidateRows(
	result: V2MasterRegistryImportResult,
	overrides: V2MasterRegistryImportOverrides,
): CandidateGridRow[] {
	const departmentCatalog = result.catalog?.departments ?? [];
	const candidates: V2MasterRegistryCandidate[] = result.candidates ?? [];
	return candidates.map((candidate) => {
		const primary = pickPrimaryIssue(candidate.issues ?? []);
		const code = primary?.code ?? "";
		const value = primary?.value ?? "";
		const suggestionsList =
			code === "name_missing" || !primary ? [] : (primary.suggestions ?? []);
		const overrideApplied = appliedForIssue(code, value, overrides);
		const appliedTo =
			code === "name_missing" ? candidate.calcName || "" : overrideApplied;
		const selectOptions =
			code === "dept_unmatched"
				? mergeSelectOptions(suggestionsList, departmentCatalog)
				: suggestionsList;
		const issuesLabel =
			(candidate.issues ?? [])
				.map((issue) => ISSUE_LABELS[issue.code] ?? issue.code)
				.join("; ") || "—";
		return {
			id: String(candidate.masterRow),
			masterRow: candidate.masterRow,
			masterNo: candidate.masterNo,
			calcName: candidate.calcName || "—",
			issuesLabel,
			code,
			codeLabel: code ? (ISSUE_LABELS[code] ?? code) : "—",
			value,
			suggestions: suggestionsList.join(" · "),
			suggestionsList,
			selectOptions,
			appliedTo,
		};
	});
}

async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		try {
			const area = document.createElement("textarea");
			area.value = text;
			area.setAttribute("readonly", "");
			area.style.position = "fixed";
			area.style.left = "-9999px";
			document.body.appendChild(area);
			area.select();
			const ok = document.execCommand("copy");
			document.body.removeChild(area);
			return ok;
		} catch {
			return false;
		}
	}
}

export function AdminV2RegistryImportPage() {
	const { mode } = useColorScheme();
	const inputRef = useRef<HTMLInputElement>(null);
	const gridApiRef = useRef<GridApi<CandidateGridRow> | null>(null);
	const [file, setFile] = useState<File | null>(null);
	const [previewMode, setPreviewMode] = useState(true);
	const [pending, setPending] = useState(false);
	const [quickFilter, setQuickFilter] = useState("");
	const [selectedCount, setSelectedCount] = useState(0);
	const [overrides, setOverrides] =
		useState<V2MasterRegistryImportOverrides>(emptyOverrides);
	const [result, setResult] = useState<V2MasterRegistryImportResult | null>(
		null,
	);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deleteConfirmText, setDeleteConfirmText] = useState("");
	const deleteAll = useDeleteAllV2Questionnaires();

	const showGrid = previewMode && Boolean(result?.dryRun);
	const candidateRows = useMemo(
		() => (result ? buildCandidateRows(result, overrides) : []),
		[result, overrides],
	);
	const overrideCount = countOverrides(overrides);
	const issueCount = result?.issues?.length ?? 0;

	const rowSelection = useMemo(
		() => ({
			mode: "multiRow" as const,
			checkboxes: true,
			headerCheckbox: true,
			enableClickSelection: false,
		}),
		[],
	);

	const onPickSuggestion = useCallback(
		(row: CandidateGridRow, overrideValue: string) => {
			if (!canPickSuggestion(row.code) || !row.value) return;
			setOverrides((prev) =>
				setOverrideForIssue(prev, row.code, row.value, overrideValue),
			);
		},
		[],
	);

	const onSelectionChanged = useCallback(
		(event: SelectionChangedEvent<CandidateGridRow>) => {
			setSelectedCount(event.api.getSelectedRows().length);
		},
		[],
	);

	const columnDefs = useMemo<ColDef<CandidateGridRow>[]>(
		() => [
			{
				field: "masterRow",
				headerName: "Строка Excel",
				width: 120,
				filter: "agSetColumnFilter",
				filterParams: AG_GRID_SET_FILTER_PARAMS,
			},
			{
				field: "masterNo",
				headerName: "№ в файле",
				width: 100,
				filter: "agSetColumnFilter",
				filterParams: AG_GRID_SET_FILTER_PARAMS,
			},
			{
				field: "calcName",
				headerName: "Наименование задачи",
				flex: 1.2,
				minWidth: 180,
				filter: "agSetColumnFilter",
				filterParams: AG_GRID_SET_FILTER_PARAMS,
			},
			{
				field: "issuesLabel",
				headerName: "Проблемы",
				flex: 1.2,
				minWidth: 200,
				filter: "agSetColumnFilter",
				filterParams: AG_GRID_SET_FILTER_PARAMS,
			},
			{
				field: "value",
				headerName: "Значение из файла",
				flex: 1,
				minWidth: 160,
				filter: "agSetColumnFilter",
				filterParams: AG_GRID_SET_FILTER_PARAMS,
			},
			{
				field: "suggestions",
				headerName: "Похожие значения в СА",
				flex: 1.2,
				minWidth: 180,
				filter: "agSetColumnFilter",
				filterParams: AG_GRID_SET_FILTER_PARAMS,
				tooltipField: "suggestions",
			},
			{
				field: "appliedTo",
				headerName: "Будет применено при загрузке",
				flex: 1.5,
				minWidth: 240,
				filter: "agSetColumnFilter",
				filterParams: AG_GRID_SET_FILTER_PARAMS,
				cellRenderer: AppliedValueCell,
				cellRendererParams: { onPickSuggestion },
				autoHeight: true,
			},
		],
		[onPickSuggestion],
	);

	const onPick = () => inputRef.current?.click();

	const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const next = event.target.files?.[0] ?? null;
		setFile(next);
		setResult(null);
		setOverrides(emptyOverrides());
		setQuickFilter("");
		setSelectedCount(0);
		event.target.value = "";
	};

	const runImport = async (dryRun: boolean) => {
		if (!file) {
			toast.error("Выберите XLSX-файл");
			return;
		}
		let masterRows: number[] | undefined;
		if (!dryRun && previewMode) {
			const selected =
				gridApiRef.current?.getSelectedRows().map((row) => row.masterRow) ?? [];
			if (selected.length === 0) {
				toast.error("Отметьте строки в таблице для загрузки в базу");
				return;
			}
			masterRows = selected;
		}
		setPending(true);
		try {
			const next = await importV2MasterRegistry(file, {
				dryRun,
				overrides,
				masterRows,
			});
			setResult(next);
			if (dryRun) {
				setSelectedCount(0);
				toast.success(
					`Проверка: готово ${next.stats.rowsReady}, замечаний ${next.issues.length}`,
				);
			} else {
				toast.success(
					`Создано ${next.created.length}, ошибок ${next.failed.length}`,
				);
			}
		} catch (error) {
			toast.error(apiErrorMessage(error) || "Не удалось импортировать реестр");
		} finally {
			setPending(false);
		}
	};

	const onClearOverrides = () => {
		setOverrides(emptyOverrides());
		toast.success("Сопоставления сброшены");
	};

	const overrideChips = useMemo(() => {
		const chips: Array<{ key: string; label: string }> = [];
		for (const [from, to] of Object.entries(overrides.departments ?? {})) {
			chips.push({ key: `d:${from}`, label: `${from} → ${to}` });
		}
		for (const [from, to] of Object.entries(overrides.streams ?? {})) {
			chips.push({ key: `s:${from}`, label: `стрим ${from} → ${to}` });
		}
		for (const [from, to] of Object.entries(overrides.production ?? {})) {
			chips.push({ key: `p:${from}`, label: `прод. ${from} → ${to}` });
		}
		return chips;
	}, [overrides]);

	const onCopyJson = async () => {
		if (!result) return;
		const ok = await copyText(
			JSON.stringify(
				{ ...result, candidates: candidateRows, overrides },
				null,
				2,
			),
		);
		if (ok) toast.success("JSON скопирован");
		else toast.error("Не удалось скопировать");
	};

	const onCopyErrorsJson = async () => {
		if (!result) return;
		const ok = await copyText(
			JSON.stringify(
				{
					sheetName: result.sheetName,
					stats: result.stats,
					overrides,
					issues: result.issues,
					failed: result.failed,
				},
				null,
				2,
			),
		);
		if (ok) toast.success("JSON ошибок скопирован");
		else toast.error("Не удалось скопировать");
	};

	const closeDeleteDialog = () => {
		if (deleteAll.isPending) return;
		setDeleteDialogOpen(false);
		setDeleteConfirmText("");
	};

	const runDeleteAll = () => {
		deleteAll.mutate(
			{ confirm: deleteConfirmText.trim() },
			{
				onSuccess: (next) => {
					setDeleteDialogOpen(false);
					setDeleteConfirmText("");
					toast.success(
						next.deleted === 0
							? "Реестр уже пуст"
							: `Удалено анкет: ${next.deleted}`,
					);
				},
				onError: (error) => {
					toast.error(apiErrorMessage(error) || "Не удалось удалить анкеты");
				},
			},
		);
	};

	const deleteConfirmOk =
		deleteConfirmText.trim() === V2_QUESTIONNAIRE_DELETE_ALL_CONFIRM;

	return (
		<Flex flexDirection="column" flexGrow={1} minHeight="0" height="100%">
			<Header fixed title={commonRoutes.adminV2RegistryImport.name} />
			<Spacer space={8} />
			<Card padding="24px" height="100%" overflow="hidden">
				<Flex flexDirection="column" gap={16} height="100%" minHeight="0">
					<Flex flexDirection="column" gap={12} maxWidth="720px">
						<Typography variant="h6">
							Загрузка готовых анкет из Excel
						</Typography>
						<Typography variant="body2" color="text.secondary">
							{previewMode
								? "Сначала проверка: разбор файла, выбор строк чекбоксами и значений в таблице, затем загрузка в базу. Пустые названия получат заглушку «Анкета без названия — дата — хеш»."
								: "Прямая загрузка всех анкет без таблицы. В справочные поля попадают только точные совпадения; несовпавшие значения оставляются пустыми (аббревиатуры сами не подставляются)."}
						</Typography>

						<input
							ref={inputRef}
							type="file"
							accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
							hidden
							onChange={onFileChange}
						/>

						<Flex alignItems="center" gap={12} wrap="wrap">
							<Button
								variant="outlined"
								startIcon={<UploadFileRoundedIcon />}
								onClick={onPick}
								disabled={pending}
							>
								Выбрать файл
							</Button>
							<Typography variant="body2" color="text.secondary">
								{file ? file.name : "Файл не выбран"}
							</Typography>
						</Flex>

						<FormControlLabel
							control={
								<Switch
									checked={previewMode}
									onChange={(_, checked) => setPreviewMode(checked)}
									disabled={pending}
								/>
							}
							label="Только превью (без создания анкет)"
						/>

						{previewMode ? (
							<Flex gap={8} wrap="wrap" alignItems="center">
								<Button
									variant="contained"
									startIcon={<FactCheckRoundedIcon />}
									onClick={() => runImport(true)}
									disabled={!file || pending}
								>
									{pending ? "Проверка…" : "Проверить файл"}
								</Button>
								{result?.dryRun ? (
									<Button
										variant="contained"
										color="secondary"
										startIcon={<CloudUploadRoundedIcon />}
										onClick={() => runImport(false)}
										disabled={!file || pending || selectedCount === 0}
										title="Создать анкеты только для отмеченных строк"
									>
										Загрузить в базу
										{selectedCount > 0 ? ` (${selectedCount})` : ""}
									</Button>
								) : null}
							</Flex>
						) : (
							<Flex flexDirection="column" gap={8}>
								<Alert severity="warning">
									Строгий режим: создаются все анкеты из файла. Поля
									справочников без точного совпадения останутся пустыми. Таблица
									проверки скрыта. Дубликаты не отфильтровываются.
								</Alert>
								<Button
									variant="contained"
									color="secondary"
									startIcon={<CloudUploadRoundedIcon />}
									onClick={() => runImport(false)}
									disabled={!file || pending}
									sx={{ alignSelf: "flex-start" }}
								>
									{pending ? "Загрузка…" : "Загрузить анкеты в базу"}
								</Button>
							</Flex>
						)}

						<Divider />
						<Typography variant="subtitle2">Очистка реестра</Typography>
						<Typography variant="body2" color="text.secondary">
							Полностью удаляет все анкеты в базе (черновики и утверждённые),
							чтобы загрузить реестр заново. Действие необратимо.
						</Typography>
						<Button
							variant="outlined"
							color="error"
							startIcon={<DeleteSweepRoundedIcon />}
							disabled={pending || deleteAll.isPending}
							onClick={() => setDeleteDialogOpen(true)}
							sx={{ alignSelf: "flex-start" }}
							data-test-id="admin-registry-delete-all"
							title="Удалить все анкеты из базы"
						>
							Удалить все анкеты
						</Button>
					</Flex>

					{result && !result.dryRun ? (
						<Alert severity={result.failed.length ? "warning" : "success"}>
							Загрузка завершена. Лист «{result.sheetName}». Создано:{" "}
							{result.created.length}, ошибок: {result.failed.length}, строк
							данных: {result.stats.rowsTotal}.
							{result.failed.length > 0 ? (
								<>
									{" "}
									<Button size="small" onClick={onCopyErrorsJson}>
										JSON ошибок
									</Button>
								</>
							) : null}
						</Alert>
					) : null}

					{showGrid ? (
						<Flex flexDirection="column" gap={12} flexGrow={1} minHeight="0">
							<Alert severity="info">
								Лист «{result!.sheetName}». Анкет: {candidateRows.length},
								готово: {result!.stats.rowsReady}, замечаний: {issueCount}.
								Отметьте строки чекбоксами — в базу уйдут только выбранные.
							</Alert>

							<Flex alignItems="center" gap={8} wrap="wrap">
								<TextField
									size="small"
									label="Поиск по таблице"
									value={quickFilter}
									onChange={(e) => {
										const value = e.target.value;
										setQuickFilter(value);
										gridApiRef.current?.setGridOption("quickFilterText", value);
									}}
									sx={{ minWidth: 240 }}
								/>
								<Button
									size="small"
									variant="outlined"
									onClick={onClearOverrides}
									disabled={overrideCount === 0 || pending}
								>
									Сбросить сопоставления
									{overrideCount > 0 ? ` (${overrideCount})` : ""}
								</Button>
								<Typography variant="body2" color="text.secondary">
									Выбрано: {selectedCount}
								</Typography>
								<Flex flexGrow={1} />
								<Button
									size="small"
									variant="outlined"
									startIcon={<ContentCopyRoundedIcon />}
									onClick={onCopyErrorsJson}
									disabled={
										issueCount === 0 && (result?.failed.length ?? 0) === 0
									}
								>
									JSON ошибок
								</Button>
								<Button
									size="small"
									variant="outlined"
									startIcon={<ContentCopyRoundedIcon />}
									onClick={onCopyJson}
								>
									Полный JSON
								</Button>
							</Flex>

							{overrideChips.length > 0 ? (
								<Flex gap={6} wrap="wrap" alignItems="center">
									<Typography variant="body2" color="text.secondary">
										Выбрано для загрузки:
									</Typography>
									{overrideChips.map((chip) => (
										<Chip
											key={chip.key}
											size="small"
											label={chip.label}
											onDelete={() => {
												setOverrides((prev) => {
													const next = {
														departments: { ...(prev.departments ?? {}) },
														streams: { ...(prev.streams ?? {}) },
														production: { ...(prev.production ?? {}) },
													};
													if (chip.key.startsWith("d:")) {
														delete next.departments[chip.key.slice(2)];
													} else if (chip.key.startsWith("s:")) {
														delete next.streams[chip.key.slice(2)];
													} else if (chip.key.startsWith("p:")) {
														delete next.production[chip.key.slice(2)];
													}
													return next;
												});
											}}
										/>
									))}
								</Flex>
							) : (
								<Typography variant="body2" color="text.secondary">
									В select «Будет применено» укажите департамент/значение — оно
									уйдёт в базу вместе с точными совпадениями.
								</Typography>
							)}

							{candidateRows.length === 0 ? (
								<Alert severity="warning">
									В файле нет строк-кандидатов для загрузки
								</Alert>
							) : (
								<GridWrapper>
									<AgGridReact<CandidateGridRow>
										theme={
											mode === "dark"
												? agGridCustomMUIThemeDark
												: agGridCustomMUITheme
										}
										icons={agGridIconSet}
										localeText={AG_GRID_LOCALE_RU}
										rowData={candidateRows}
										columnDefs={columnDefs}
										getRowId={(p) => p.data.id}
										getMainMenuItems={getAgGridMainMenuItems}
										rowSelection={rowSelection}
										suppressRowClickSelection
										onSelectionChanged={onSelectionChanged}
										onGridReady={(e) => {
											gridApiRef.current = e.api;
											e.api.setGridOption("quickFilterText", quickFilter);
											setSelectedCount(e.api.getSelectedRows().length);
										}}
										defaultColDef={{
											sortable: true,
											filter: "agSetColumnFilter",
											filterParams: AG_GRID_SET_FILTER_PARAMS,
											resizable: true,
										}}
										suppressCellFocus
									/>
								</GridWrapper>
							)}
						</Flex>
					) : null}
				</Flex>
			</Card>
			<Dialog
				open={deleteDialogOpen}
				onClose={closeDeleteDialog}
				fullWidth
				maxWidth="sm"
			>
				<DialogTitle>Удалить все анкеты?</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Будут удалены все анкеты реестра, включая утверждённые версии,
						комментарии и блокировки. Чтобы подтвердить, введите{" "}
						<strong>{V2_QUESTIONNAIRE_DELETE_ALL_CONFIRM}</strong>.
					</DialogContentText>
					<Spacer space={12} />
					<TextField
						autoFocus
						fullWidth
						size="small"
						label="Подтверждение"
						value={deleteConfirmText}
						onChange={(event) => setDeleteConfirmText(event.target.value)}
						disabled={deleteAll.isPending}
						inputProps={{
							"data-test-id": "admin-registry-delete-all-confirm",
						}}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={closeDeleteDialog} disabled={deleteAll.isPending}>
						Отмена
					</Button>
					<Button
						color="error"
						variant="contained"
						disabled={!deleteConfirmOk || deleteAll.isPending}
						onClick={runDeleteAll}
						data-test-id="admin-registry-delete-all-submit"
					>
						{deleteAll.isPending ? "Удаление…" : "Удалить все"}
					</Button>
				</DialogActions>
			</Dialog>
		</Flex>
	);
}
