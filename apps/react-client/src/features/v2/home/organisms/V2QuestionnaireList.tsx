import DownloadIcon from "@mui/icons-material/Download";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
	Button,
	Divider,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Stack,
	TextField,
	Typography,
	styled,
	useColorScheme,
} from "@mui/material";
import {
	useBulkDeleteV2Questionnaires,
	useV2Questionnaires,
	v2QuestionnairesExportXlsx,
} from "@react-client/common/api/queries/v2-questionnaires";
import {
	useV2TemplateVersion,
	useV2Templates,
} from "@react-client/common/api/queries/v2-templates";
import { downloadBlob } from "@react-client/common/api/queries/kanban-board";
import { usePermissions } from "@react-client/hooks/usePermissions";
import { toast } from "@react-client/common/toasts";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { Flex } from "@react-client/common/primitives/Flex";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { AG_GRID_SET_FILTER_PARAMS } from "@react-client/common/tableStuff/agGridSetFilterParams";
import {
	applyAgGridColumnState,
	clearAgGridColumnState,
	saveAgGridColumnState,
} from "@react-client/common/tableStuff/agGridColumnState";
import { v2Routes } from "@react-client/routing/version/v2/routes";
import type { V2QuestionnaireGridRow, V2QuestionnaireVersionRow } from "../types/v2QuestionnaireGrid.types";
import {
	AllCommunityModule,
	ClientSideRowModelModule,
	type GetContextMenuItemsParams,
	type GridApi,
	type GridReadyEvent,
	type MenuItemDef,
	type RowDoubleClickedEvent,
	type SelectionChangedEvent,
	ModuleRegistry,
	type ColumnState,
	type SideBarDef,
	ValidationModule,
} from "ag-grid-community";
import {
	ColumnMenuModule,
	ColumnsToolPanelModule,
	ContextMenuModule,
	FiltersToolPanelModule,
	SetFilterModule,
	SideBarModule,
} from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "@react-client/theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";
import {
	buildV2QuestionnaireColumnDefs,
} from "../utils/v2QuestionnaireGridColumns";
import {
	deriveRegistryColumnOptionsFromRows,
	type V2RegistrySchemaColumnOptions,
} from "@smart-anketa/api-contract";
import {
	FACTORY_PRESET_IDS,
	applyQuestionnaireGridPreset,
	getFactoryGridPreset,
	getFactoryGridPresets,
	isFactoryPresetId,
	type QuestionnaireGridPresetApi,
} from "../utils/v2QuestionnaireGridFactoryPresets";
import { resolveVersionRow } from "../utils/v2QuestionnaireGridValue";

export type {
	V2QuestionnaireGridRow,
	V2QuestionnaireVersionRow,
} from "../types/v2QuestionnaireGrid.types";

ModuleRegistry.registerModules([
	AllCommunityModule,
	ClientSideRowModelModule,
	ContextMenuModule,
	ColumnsToolPanelModule,
	ColumnMenuModule,
	FiltersToolPanelModule,
	SetFilterModule,
	SideBarModule,
	...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),
]);

const GridWrapper = styled(Flex)`
	flex: 1 1 auto;
	min-height: 0;
	width: 100%;
	height: 100%;

	& > div {
		width: 100%;
		height: 100%;
	}
`;

const GRID_PRESETS_STORAGE_KEY = "smart_anketa:v2-questionnaire-grid-presets";
const GRID_COLUMN_STATE_KEY = "v2.questionnaires";

const GRID_SETTINGS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
<path d="M10.255 4.18806C9.84269 5.17755 8.68655 5.62456 7.71327 5.17535C6.10289 4.4321 4.4321 6.10289 5.17535 7.71327C5.62456 8.68655 5.17755 9.84269 4.18806 10.255C2.63693 10.9013 2.63693 13.0987 4.18806 13.745C5.17755 14.1573 5.62456 15.3135 5.17535 16.2867C4.4321 17.8971 6.10289 19.5679 7.71327 18.8246C8.68655 18.3754 9.84269 18.8224 10.255 19.8119C10.9013 21.3631 13.0987 21.3631 13.745 19.8119C14.1573 18.8224 15.3135 18.3754 16.2867 18.8246C17.8971 19.5679 19.5679 17.8971 18.8246 16.2867C18.3754 15.3135 18.8224 14.1573 19.8119 13.745C21.3631 13.0987 21.3631 10.9013 19.8119 10.255C18.8224 9.84269 18.3754 8.68655 18.8246 7.71327C19.5679 6.10289 17.8971 4.4321 16.2867 5.17535C15.3135 5.62456 14.1573 5.17755 13.745 4.18806C13.0987 2.63693 10.9013 2.63693 10.255 4.18806Z" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="#000" stroke-width="2"/>
</svg>`;

type GridPreset = {
	id: string;
	name: string;
	columnState: unknown;
	filterModel: unknown;
	savedAt: string;
	builtIn?: boolean;
};

type PresetGridApi = QuestionnaireGridPresetApi & {
	getColumnState: () => unknown;
	getFilterModel: () => unknown;
};

function readGridPresets(): GridPreset[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(GRID_PRESETS_STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(preset): preset is GridPreset =>
				Boolean(preset && typeof preset === "object") &&
				!isFactoryPresetId(String((preset as GridPreset).id)),
		);
	} catch {
		return [];
	}
}

function writeGridPresets(presets: GridPreset[]) {
	window.localStorage.setItem(
		GRID_PRESETS_STORAGE_KEY,
		JSON.stringify(presets),
	);
}

function newPresetId(): string {
	return typeof crypto !== "undefined" && "randomUUID" in crypto
		? crypto.randomUUID()
		: `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function GridPresetToolPanel({
	api,
	jsonSchema,
	uiSchema,
	columnOptions,
}: {
	api: PresetGridApi;
	jsonSchema?: Record<string, unknown>;
	uiSchema?: Record<string, unknown>;
	columnOptions?: V2RegistrySchemaColumnOptions;
}) {
	const [presets, setPresets] = useState<GridPreset[]>(readGridPresets);
	const [name, setName] = useState("");
	const factoryPresets = useMemo(
		() => getFactoryGridPresets(jsonSchema, uiSchema, columnOptions),
		[jsonSchema, uiSchema, columnOptions],
	);

	const updatePresets = (next: GridPreset[]) => {
		setPresets(next);
		writeGridPresets(next);
	};

	const savePreset = () => {
		const trimmedName = name.trim() || `Преднастройка ${presets.length + 1}`;
		const nextPreset: GridPreset = {
			id: newPresetId(),
			name: trimmedName,
			columnState: api.getColumnState(),
			filterModel: api.getFilterModel(),
			savedAt: new Date().toISOString(),
		};
		updatePresets([nextPreset, ...presets]);
		setName("");
	};

	const applyPreset = (preset: {
		columnState: unknown;
		filterModel: unknown;
	}) => {
		applyQuestionnaireGridPreset(api, {
			columnState: preset.columnState as ColumnState[],
			filterModel: (preset.filterModel ?? null) as Record<
				string,
				unknown
			> | null,
		});
	};

	const deletePreset = (presetId: string) => {
		updatePresets(presets.filter((preset) => preset.id !== presetId));
	};

	const resetGridState = () => {
		clearAgGridColumnState(GRID_COLUMN_STATE_KEY);
		const allInformationPreset = getFactoryGridPreset(
			FACTORY_PRESET_IDS.allInformation,
			jsonSchema,
			uiSchema,
			columnOptions,
		);
		if (allInformationPreset) {
			applyQuestionnaireGridPreset(api, allInformationPreset);
		}
	};

	return (
		<Stack spacing={2} sx={{ p: 1.5, minWidth: 240 }}>
			<Typography variant="subtitle1" fontWeight={700}>
				Настройки
			</Typography>

			<Stack spacing={1.5}>
				<Typography variant="subtitle2" fontWeight={600}>
					Преднастройки таблицы
				</Typography>
				<Typography variant="caption" color="text.secondary">
					Сохраняет порядок, видимость колонок и фильтры текущего вида таблицы.
				</Typography>
				<TextField
					size="small"
					label="Название преднастройки"
					value={name}
					onChange={(event) => setName(event.target.value)}
				/>
				<Button variant="contained" size="small" onClick={savePreset}>
					Сохранить текущий вид
				</Button>
				<Button variant="outlined" size="small" onClick={resetGridState}>
					Сбросить колонки и фильтры
				</Button>
				<Divider />
				<Typography variant="body2" fontWeight={600}>
					Готовые преднастройки
				</Typography>
				{factoryPresets.map((preset) => (
					<Stack
						key={preset.id}
						spacing={0.75}
						sx={{
							border: "1px solid",
							borderColor: "primary.light",
							borderRadius: 1,
							p: 1,
							bgcolor: "action.hover",
						}}
					>
						<Stack direction="row" spacing={1} alignItems="center">
							<Typography variant="body2" fontWeight={600}>
								{preset.name}
							</Typography>
							{/* <Chip size="small" label="заводской" variant="outlined" /> */}
						</Stack>
						<Typography variant="caption" color="text.secondary">
							{preset.description}
						</Typography>
						<Button
							variant="outlined"
							size="small"
							onClick={() => applyPreset(preset)}
						>
							Применить
						</Button>
					</Stack>
				))}
				<Divider />
				<Typography variant="body2" fontWeight={600}>
					Мои преднастройки
				</Typography>
				{presets.length === 0 ? (
					<Typography variant="caption" color="text.secondary">
						Сохранённых преднастроек пока нет.
					</Typography>
				) : (
					presets.map((preset) => (
						<Stack
							key={preset.id}
							spacing={0.75}
							sx={{
								border: "1px solid",
								borderColor: "divider",
								borderRadius: 1,
								p: 1,
							}}
						>
							<Typography variant="body2" fontWeight={600}>
								{preset.name}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								{new Date(preset.savedAt).toLocaleString("ru-RU")}
							</Typography>
							<Stack direction="row" spacing={1}>
								<Button
									variant="outlined"
									size="small"
									onClick={() => applyPreset(preset)}
								>
									Применить
								</Button>
								<Button
									variant="text"
									color="error"
									size="small"
									onClick={() => deletePreset(preset.id)}
								>
									Удалить
								</Button>
							</Stack>
						</Stack>
					))
				)}
			</Stack>
		</Stack>
	);
}

export function V2QuestionnaireList() {
	const { mode } = useColorScheme();
	const navigate = useNavigate();
	const gridRef = useRef<AgGridReact<V2QuestionnaireGridRow>>(null);
	const { canAccessAdminPanel, canCreateCalculation, canExportReports } = usePermissions();
	const bulkDelete = useBulkDeleteV2Questionnaires();
	const { data: templates } = useV2Templates();
	const activeTemplate = useMemo(
		() => templates?.find((t) => t.currentVersionId) ?? templates?.[0],
		[templates],
	);
	const { data: templateVersion } = useV2TemplateVersion(
		activeTemplate?.id ?? "",
		activeTemplate?.currentVersionId ?? null,
	);
	const registryJsonSchema = templateVersion?.jsonSchema as
		| Record<string, unknown>
		| undefined;
	const registryUiSchema = templateVersion?.uiSchema as
		| Record<string, unknown>
		| undefined;
	const [selectedVersions, setSelectedVersions] = useState<
		V2QuestionnaireVersionRow[]
	>([]);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [isExporting, setIsExporting] = useState(false);

	const gridTheme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const { data: questionnaires, isLoading } = useV2Questionnaires();

	const rowData = useMemo<V2QuestionnaireVersionRow[]>(() => {
		if (!questionnaires?.length) return [];
		return questionnaires.map((q) => ({
			...q,
			rowKind: "version" as const,
			displayLabel: q.calcName,
		}));
	}, [questionnaires]);

	const registryColumnOptions = useMemo(
		() =>
			rowData.length > 0
				? deriveRegistryColumnOptionsFromRows(rowData)
				: undefined,
		[rowData],
	);

	const columnDefs = useMemo(
		() =>
			buildV2QuestionnaireColumnDefs(
				registryJsonSchema,
				registryUiSchema,
				registryColumnOptions,
			),
		[registryJsonSchema, registryUiSchema, registryColumnOptions],
	);

	const GridPresetToolPanelBound = useMemo(
		() =>
			function GridPresetToolPanelBound(props: { api: PresetGridApi }) {
				return (
					<GridPresetToolPanel
						{...props}
						jsonSchema={registryJsonSchema}
						uiSchema={registryUiSchema}
						columnOptions={registryColumnOptions}
					/>
				);
			},
		[registryJsonSchema, registryUiSchema, registryColumnOptions],
	);

	const gridIcons = useMemo(
		() => ({
			...agGridIconSet,
			settings: GRID_SETTINGS_ICON,
		}),
		[],
	);

	const sideBar = useMemo<SideBarDef>(
		() => ({
			toolPanels: [
				{
					id: "columns",
					labelDefault: "Столбцы",
					labelKey: "columns",
					iconKey: "columns",
					toolPanel: "agColumnsToolPanel",
					toolPanelParams: {
						suppressPivotMode: true,
						suppressRowGroups: true,
						suppressValues: true,
					},
				},
				{
					id: "filters",
					labelDefault: "Фильтры",
					labelKey: "filters",
					iconKey: "filter",
					toolPanel: "agFiltersToolPanel",
				},
				{
					id: "settings",
					labelDefault: "Настройки",
					labelKey: "settings",
					iconKey: "settings",
					toolPanel: GridPresetToolPanelBound,
				},
			],
			position: "right",
		}),
		[GridPresetToolPanelBound],
	);

	const onRowDoubleClicked = useCallback(
		(e: RowDoubleClickedEvent<V2QuestionnaireGridRow>) => {
			const row = resolveVersionRow(e.data);
			if (!row) return;
			navigate(
				`/v2/${v2Routes.calculationPreview.rootPath.replace(":id", row.id)}`,
			);
		},
		[navigate],
	);

	const getRowId = useCallback(
		(p: { data: V2QuestionnaireGridRow }) =>
			p.data.rowKind === "series"
				? `series:${p.data.seriesId}`
				: `version:${p.data.id}`,
		[],
	);

	const onGridReady = useCallback(
		(e: GridReadyEvent) => {
			const basicPreset = getFactoryGridPreset(
				FACTORY_PRESET_IDS.default,
				registryJsonSchema,
				registryUiSchema,
				registryColumnOptions,
			);
			if (basicPreset) {
				applyQuestionnaireGridPreset(e.api, basicPreset);
			}
			applyAgGridColumnState(GRID_COLUMN_STATE_KEY, (state) => {
				e.api.applyColumnState({ state, applyOrder: true });
			});
		},
		[registryJsonSchema, registryUiSchema, registryColumnOptions],
	);

	const persistColumnState = useCallback((api: GridApi) => {
		saveAgGridColumnState(GRID_COLUMN_STATE_KEY, api.getColumnState());
	}, []);

	const handleExportXlsx = useCallback(async (ids?: string[]) => {
		setIsExporting(true);
		try {
			const blob = await v2QuestionnairesExportXlsx({ ids });
			const date = new Date().toISOString().slice(0, 10);
			const suffix =
				ids && ids.length > 0 ? `selected-${ids.length}` : "all";
			downloadBlob(blob, `v2-questionnaires-${suffix}-${date}.xlsx`);
			if (ids && ids.length > 0) {
				toast.success(
					ids.length === 1
						? "Анкета экспортирована"
						: `Экспортировано анкет: ${ids.length}`,
				);
			}
		} catch (err) {
			toast.error("Ошибка экспорта", {
				description: apiErrorMessage(err),
			});
		} finally {
			setIsExporting(false);
		}
	}, []);

	const getContextMenuItems = useCallback(
		(
			params: GetContextMenuItemsParams<V2QuestionnaireGridRow>,
		): MenuItemDef[] => {
			const row = resolveVersionRow(params.node?.data);
			if (!row) {
				return [];
			}
			const selectedRows = params.api
				.getSelectedRows()
				.map((item) => resolveVersionRow(item))
				.filter((item): item is V2QuestionnaireVersionRow => item != null);
			const exportIds =
				selectedRows.length > 0
					? selectedRows.map((item) => item.id)
					: [row.id];
			const exportLabel =
				exportIds.length > 1
					? `Экспорт в XLSX (${exportIds.length})`
					: "Экспорт в XLSX";

			return [
				{
					name: "Открыть",
					action: () =>
						navigate(
							`/v2/${v2Routes.calculationPreview.rootPath.replace(":id", row.id)}`,
						),
				},
				{
					name: "Новая версия анкеты",
					action: () =>
						navigate(
							`/v2/${v2Routes.calculationNewVersion.rootPath.replace(":id", row.id)}`,
						),
				},
				{
					name: exportLabel,
					disabled: isExporting,
					action: () => void handleExportXlsx(exportIds),
				},
			];
		},
		[navigate, isExporting, handleExportXlsx],
	);

	const runBulkDelete = useCallback(() => {
		const ids = selectedVersions.map((row) => row.id);
		if (!ids.length) return;
		bulkDelete.mutate(
			{ ids },
			{
				onSuccess: (result) => {
					setDeleteDialogOpen(false);
					setSelectedVersions([]);
					gridRef.current?.api?.deselectAll();
					const deleted = result.deletedIds.length;
					const failed = result.failed.length;
					if (deleted > 0) {
						toast.success(
							failed > 0
								? `Удалено анкет: ${deleted}, ошибок: ${failed}`
								: `Удалено анкет: ${deleted}`,
						);
					} else if (failed > 0) {
						toast.error("Не удалось удалить выбранные анкеты");
					}
				},
				onError: (err) =>
					toast.error("Ошибка удаления", {
						description: apiErrorMessage(err),
					}),
			},
		);
	}, [bulkDelete, selectedVersions]);

	return (
		<Flex
			flexDirection="column"
			height="100%"
			minHeight="0"
			minWidth="0"
			width="100%"
		>
			<Header>
				<Stack direction="row" spacing={1} alignItems="center">
					{canExportReports ? (
						<>
							<Button
								variant="outlined"
								size="small"
								startIcon={<DownloadIcon />}
								disabled={isExporting || isLoading}
								onClick={() => void handleExportXlsx()}
							>
								{isExporting ? "Экспорт…" : "Экспорт всех"}
							</Button>
							<Button
								variant="outlined"
								size="small"
								startIcon={<DownloadIcon />}
								disabled={
									isExporting || isLoading || selectedVersions.length === 0
								}
								onClick={() =>
									void handleExportXlsx(
										selectedVersions.map((row) => row.id),
									)
								}
							>
								{isExporting
									? "Экспорт…"
									: `Экспорт выбранных (${selectedVersions.length})`}
							</Button>
						</>
					) : null}
					{canAccessAdminPanel ? (
						<Button
							variant="outlined"
							size="small"
							color="error"
							startIcon={<DeleteOutlineIcon />}
							disabled={!selectedVersions.length || bulkDelete.isPending}
							onClick={() => setDeleteDialogOpen(true)}
						>
							Удалить выбранные ({selectedVersions.length})
						</Button>
					) : null}
					{canCreateCalculation && (
						<Button
							variant="contained"
							size="small"
							startIcon={<AddIcon />}
							onClick={() =>
								navigate(`/v2/${v2Routes.calculationCreate.rootPath}`)
							}
						>
							Создать анкету
						</Button>
					)}
				</Stack>
			</Header>
			<Dialog
				open={deleteDialogOpen}
				onClose={() => setDeleteDialogOpen(false)}
			>
				<DialogTitle>Удалить анкеты?</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Будет удалено записей: {selectedVersions.length}. Действие
						необратимо.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
					<Button
						color="error"
						variant="contained"
						disabled={bulkDelete.isPending}
						onClick={runBulkDelete}
					>
						Удалить
					</Button>
				</DialogActions>
			</Dialog>
			<GridWrapper flexGrow={1} sx={{ p: 0 }}>
				<AgGridReact<V2QuestionnaireGridRow>
					ref={gridRef}
					theme={gridTheme}
					icons={gridIcons}
					localeText={AG_GRID_LOCALE_RU}
					rowData={rowData}
					columnDefs={columnDefs}
					getRowId={getRowId}
					defaultColDef={{
						sortable: true,
						resizable: true,
						filter: "agSetColumnFilter",
						filterParams: AG_GRID_SET_FILTER_PARAMS,
						minWidth: 90,
					}}
					headerHeight={32}
					groupHeaderHeight={32}
					defaultColGroupDef={{
						marryChildren: false,
					}}
					sideBar={sideBar}
					onRowDoubleClicked={onRowDoubleClicked}
					getContextMenuItems={getContextMenuItems}
					onGridReady={onGridReady}
					onColumnMoved={(event) => persistColumnState(event.api)}
					onColumnVisible={(event) => persistColumnState(event.api)}
					onColumnPinned={(event) => persistColumnState(event.api)}
					onSortChanged={(event) => persistColumnState(event.api)}
					onColumnResized={(event) => {
						if (event.finished) persistColumnState(event.api);
					}}
					loading={isLoading}
					rowSelection={{
						mode: "multiRow",
						checkboxes: true,
						headerCheckbox: true,
						enableClickSelection: false,
					}}
					onSelectionChanged={(
						e: SelectionChangedEvent<V2QuestionnaireGridRow>,
					) => {
						setSelectedVersions(
							e.api.getSelectedRows() as V2QuestionnaireVersionRow[],
						);
					}}
					domLayout="normal"
					suppressAggFuncInHeader
				/>
			</GridWrapper>
		</Flex>
	);
}
