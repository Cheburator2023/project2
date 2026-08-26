import DownloadIcon from "@mui/icons-material/Download";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HideSourceOutlinedIcon from "@mui/icons-material/HideSourceOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import {
	Button,
	Divider,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	IconButton,
	Popover,
	Stack,
	TextField,
	Typography,
	styled,
	useColorScheme,
	useMediaQuery,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
	useBulkDeleteV2Questionnaires,
	useBulkHoldV2Questionnaires,
	useV2QuestionnaireExportLock,
	useV2QuestionnaireRegistryConfig,
	useV2Questionnaires,
	fetchV2QuestionnaireFilterValues,
	fetchV2QuestionnaireRegistryIds,
} from "@react-client/common/api/queries/v2-questionnaires";
import { V2QuestionnaireExportProgressDialog } from "@react-client/features/v2/export/V2QuestionnaireExportProgressDialog";
import { useQuestionnaireEditLocksStore } from "@react-client/features/v2/anketaCRUD/stores/questionnaireEditLocksStore";
import { isOwnV2QuestionnaireEditLock } from "@react-client/features/v2/anketaCRUD/utils/isOwnV2QuestionnaireEditLock";
import { usePermissions } from "@react-client/hooks/usePermissions";
import { toast } from "@react-client/common/toasts";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { SegmentBar } from "@react-client/common/muiCustom/SegmentBar";
import { Flex } from "@react-client/common/primitives/Flex";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { SearchInput } from "@react-client/common/navigation/organisms/SearchInput";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { getAgGridMainMenuItems } from "@react-client/common/tableStuff/agGridMainMenuItems";
import { AG_GRID_SET_FILTER_PARAMS } from "@react-client/common/tableStuff/agGridSetFilterParams";
import {
	applyAgGridColumnState,
	clearAgGridColumnState,
	loadAgGridColumnState,
	saveAgGridColumnState,
} from "@react-client/common/tableStuff/agGridColumnState";
import {
	pathForV2QuestionnaireCreate,
	pathForV2QuestionnaireNewVersion,
	pathForV2QuestionnairePreview,
} from "@react-client/routing/common/pathHelpers";
import type {
	V2QuestionnaireGridRow,
	V2QuestionnaireVersionRow,
} from "../types/v2QuestionnaireGrid.types";
import {
	AllCommunityModule,
	ClientSideRowModelModule,
	type ColDef,
	type GetContextMenuItemsParams,
	type GridReadyEvent,
	type MenuItemDef,
	type RowDoubleClickedEvent,
	type SelectionChangedEvent,
	type FilterChangedEvent,
	ModuleRegistry,
	type ColumnState,
	type GridApi,
	type SideBarDef,
	type ISetFilterParams,
	ValidationModule,
} from "ag-grid-community";
import {
	ColumnMenuModule,
	ColumnsToolPanelModule,
	ContextMenuModule,
	FiltersToolPanelModule,
	SetFilterModule,
	SideBarModule,
	TreeDataModule,
} from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "@react-client/theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";
import { useUserStore } from "@react-client/common/store/userStore";
import {
	useDadmProgramManagerFeature,
	useEditLockHardDisableFeature,
} from "@react-client/common/api/queries/v2-runtime-settings";
import { useDebouncedValue } from "@react-client/features/v2/admin_constructor/hooks/useDebouncedValue";
import {
	canHoldQuestionnaire,
	canUserDeleteV2Questionnaire,
	summarizeV2QuestionnaireDeleteSelection,
	v2QuestionnaireDeleteToolbarCopy,
	v2QuestionnaireDeleteUiCopy,
	V2_ANKETA_HOLD_LABEL,
	V2_QUESTIONNAIRE_REGISTRY_PAGE_SIZE,
	V2_QUESTIONNAIRE_REGISTRY_VERSION_MODE_LABELS,
	isV2AgGridFilterModelEmpty,
	omitV2AgGridFilterColumn,
	parseV2AgGridFilterModel,
	type V2AgGridFilterModel,
	type V2AgGridSortModel,
	type V2QuestionnaireRegistryIdRowDto,
	type V2QuestionnaireRegistryVersionMode,
} from "@smart-anketa/api-contract";
import { buildV2QuestionnaireColumnDefsFromTree } from "../utils/v2QuestionnaireGridColumns";
import type { V2RegistryColumnNode } from "@smart-anketa/api-contract";
import {
	FACTORY_PRESET_IDS,
	applyQuestionnaireGridPreset,
	clearQuestionnaireGridFilters,
	getFactoryGridPresetFromTree,
	getFactoryGridPresetsFromTree,
	isFactoryPresetId,
	type QuestionnaireGridPresetApi,
} from "../utils/v2QuestionnaireGridFactoryPresets";
import { buildV2QuestionnaireRegistryTree } from "../utils/buildV2QuestionnaireRegistryTree";
import {
	resolveVersionRow,
	collectSelectedVersionRows,
} from "../utils/v2QuestionnaireGridValue";
import {
	collectVersionIdsFromGridRows,
	mergeVisibleSelection,
	selectedVisibleIdsFromGridRows,
	shouldSelectGridRow,
} from "../utils/v2RegistrySelection";
import { V2RegistrySelectAllHeader } from "../molecules/V2RegistrySelectAllHeader";
import type { V2QuestionnaireGridContext } from "../molecules/V2QuestionnaireNameCell";
import { V2RegistryPagingPanel } from "./V2RegistryPagingPanel";

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
	TreeDataModule,
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

	/* Панель серверной пагинации внизу root (как native ag-paging-panel). */
	.ag-root-wrapper {
		display: flex;
		flex-direction: column;
	}

	.ag-root-wrapper > .ag-root {
		flex: 1 1 auto;
		min-height: 0;
	}

	.ag-row.v2-questionnaire-row--editing-other,
	.ag-row.v2-questionnaire-row--editing-other .ag-cell,
	.ag-row.v2-questionnaire-row--editing-other.ag-row-hover .ag-cell,
	.ag-row.v2-questionnaire-row--editing-other.ag-row-selected .ag-cell {
		background-color: ${({ theme }) =>
			alpha(
				theme.palette.warning.main,
				theme.palette.mode === "dark" ? 0.28 : 0.18,
			)} !important;
	}

	.ag-row.v2-questionnaire-row--editing-own,
	.ag-row.v2-questionnaire-row--editing-own .ag-cell,
	.ag-row.v2-questionnaire-row--editing-own.ag-row-hover .ag-cell,
	.ag-row.v2-questionnaire-row--editing-own.ag-row-selected .ag-cell {
		background-color: ${({ theme }) =>
			alpha(
				theme.palette.info.main,
				theme.palette.mode === "dark" ? 0.28 : 0.16,
			)} !important;
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

function sortModelFromColumnState(
	state: ColumnState[] | null,
): V2AgGridSortModel[] {
	if (!state?.length) return [];
	return [...state]
		.filter(
			(col): col is ColumnState & { colId: string; sort: "asc" | "desc" } =>
				Boolean(col.colId) && (col.sort === "asc" || col.sort === "desc"),
		)
		.sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
		.map((col) => ({ colId: col.colId, sort: col.sort }));
}

function slimToVersionRow(
	row: V2QuestionnaireRegistryIdRowDto,
): V2QuestionnaireVersionRow {
	return {
		id: row.id,
		rowKind: "version",
		displayLabel: row.id,
		status: row.status ?? "active",
		workflowGlobalStatus: row.workflowGlobalStatus,
		formData: {
			generalInfo: { implementationStream: row.implementationStream ?? "" },
			workflow: { globalStatus: row.workflowGlobalStatus },
		},
	} as unknown as V2QuestionnaireVersionRow;
}

function slimFromVersionRow(
	row: V2QuestionnaireVersionRow,
): V2QuestionnaireRegistryIdRowDto {
	const generalInfo = row.formData?.generalInfo;
	const stream =
		generalInfo && typeof generalInfo === "object"
			? (generalInfo as Record<string, unknown>).implementationStream
			: null;
	return {
		id: row.id,
		workflowGlobalStatus: row.workflowGlobalStatus,
		status: row.status,
		implementationStream: typeof stream === "string" ? stream : null,
	};
}

function GridPresetToolPanel({
	api,
	columnTree,
}: {
	api: PresetGridApi;
	columnTree: readonly V2RegistryColumnNode[];
}) {
	const [presets, setPresets] = useState<GridPreset[]>(readGridPresets);
	const [name, setName] = useState("");
	const factoryPresets = useMemo(
		() => getFactoryGridPresetsFromTree(columnTree),
		[columnTree],
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

	const resetFilters = () => {
		clearQuestionnaireGridFilters(api);
	};

	const resetGridState = () => {
		clearAgGridColumnState(GRID_COLUMN_STATE_KEY);
		const allInformationPreset = getFactoryGridPresetFromTree(
			FACTORY_PRESET_IDS.allInformation,
			columnTree,
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
				<Button variant="outlined" size="small" onClick={resetFilters}>
					Сбросить фильтры
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
	const gridHostRef = useRef<HTMLDivElement | null>(null);
	const {
		canCreateCalculation,
		canDeleteCalculation,
		canExportReports,
		canHoldCalculation,
	} = usePermissions();
	const dadmProgramManagerEnabled = useDadmProgramManagerFeature();
	const editLockHardDisable = useEditLockHardDisableFeature();
	const bulkDelete = useBulkDeleteV2Questionnaires();
	const bulkHold = useBulkHoldV2Questionnaires();
	const canShowHoldActions = dadmProgramManagerEnabled && canHoldCalculation;
	const { data: registryConfig, isLoading: isRegistryConfigLoading } =
		useV2QuestionnaireRegistryConfig();
	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
	const [allMatching, setAllMatching] = useState(false);
	const [selectAllBusy, setSelectAllBusy] = useState(false);
	const slimByIdRef = useRef<Map<string, V2QuestionnaireRegistryIdRowDto>>(
		new Map(),
	);
	const ignoreSelectionEventRef = useRef(false);
	const selectedIdsRef = useRef(selectedIds);
	selectedIdsRef.current = selectedIds;
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [holdDialogOpen, setHoldDialogOpen] = useState(false);
	const [registryVersionMode, setRegistryVersionMode] =
		useState<V2QuestionnaireRegistryVersionMode>("actual");
	const [page, setPage] = useState(1);
	const [searchInput, setSearchInput] = useState("");
	const debouncedSearch = useDebouncedValue(searchInput, 300);
	const [filterModel, setFilterModel] = useState<V2AgGridFilterModel>({});
	const debouncedFilterJson = useDebouncedValue(
		JSON.stringify(filterModel),
		300,
	);
	const debouncedFilterModel = useMemo(
		() => parseV2AgGridFilterModel(debouncedFilterJson),
		[debouncedFilterJson],
	);
	const [sortModel, setSortModel] = useState<V2AgGridSortModel[]>(() =>
		sortModelFromColumnState(loadAgGridColumnState(GRID_COLUMN_STATE_KEY)),
	);
	const filterModelRef = useRef(filterModel);
	filterModelRef.current = filterModel;
	const searchRef = useRef(debouncedSearch);
	searchRef.current = debouncedSearch;
	const versionModeRef = useRef<V2QuestionnaireRegistryVersionMode | undefined>(
		dadmProgramManagerEnabled ? registryVersionMode : undefined,
	);
	versionModeRef.current = dadmProgramManagerEnabled
		? registryVersionMode
		: undefined;
	const [pagingHostEl, setPagingHostEl] = useState<HTMLElement | null>(null);
	const [exportDialog, setExportDialog] = useState<{
		open: boolean;
		ids?: string[];
	}>({ open: false });
	const isExporting = exportDialog.open;
	const { data: exportLock } = useV2QuestionnaireExportLock(canExportReports);
	const exportBusy = Boolean(exportLock?.busy);
	const exportBlocked = isExporting || exportBusy;
	const exportBlockedTitle = exportBusy
		? "Выгрузка уже выполняется. Дождитесь окончания."
		: undefined;
	const [headerMenuAnchor, setHeaderMenuAnchor] = useState<HTMLElement | null>(
		null,
	);
	const compactHeader = useMediaQuery("(max-width:1360px)");
	const headerMenuOpen = Boolean(headerMenuAnchor);

	const gridTheme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const listQuery = useMemo(
		() => ({
			page,
			limit: V2_QUESTIONNAIRE_REGISTRY_PAGE_SIZE,
			search: debouncedSearch,
			versionMode: dadmProgramManagerEnabled ? registryVersionMode : undefined,
			filterModel: debouncedFilterModel,
			sortModel,
		}),
		[
			page,
			debouncedSearch,
			dadmProgramManagerEnabled,
			registryVersionMode,
			debouncedFilterModel,
			sortModel,
		],
	);
	const { data: listResponse, isLoading } = useV2Questionnaires(listQuery);
	const questionnaires = listResponse?.data ?? [];
	const listMeta = listResponse?.meta;
	const locksById = useQuestionnaireEditLocksStore((s) => s.locksById);

	const defaultColDef = useMemo(() => {
		const setFilterParams: ISetFilterParams = {
			...AG_GRID_SET_FILTER_PARAMS,
			refreshValuesOnOpen: true,
			values: (params) => {
				const colId = params.colDef.colId ?? params.column.getColId();
				const withoutCol = omitV2AgGridFilterColumn(
					parseV2AgGridFilterModel(filterModelRef.current),
					colId,
				);
				void fetchV2QuestionnaireFilterValues(colId, {
					search: searchRef.current,
					versionMode: versionModeRef.current,
					filterModel: isV2AgGridFilterModelEmpty(withoutCol)
						? undefined
						: withoutCol,
				})
					.then((result) => params.success(result.values))
					.catch(() => params.success([]));
			},
		};
		return {
			sortable: true,
			/** Данные уже отсортированы на сервере; клиент не должен переставлять страницу. */
			comparator: () => 0,
			resizable: true,
			filter: "agSetColumnFilter" as const,
			filterParams: setFilterParams,
			minWidth: 90,
			mainMenuItems: getAgGridMainMenuItems,
		};
	}, []);

	const defaultColGroupDef = useMemo(
		() => ({
			marryChildren: false,
		}),
		[],
	);

	const rowSelection = useMemo(
		() => ({
			mode: "multiRow" as const,
			checkboxes: true,
			headerCheckbox: false,
			enableClickSelection: false,
			groupSelects: "descendants" as const,
			isRowSelectable: (node: { data?: V2QuestionnaireGridRow }) =>
				node.data?.rowKind === "version" || node.data?.rowKind === "series",
		}),
		[],
	);

	const username = useUserStore((s) => s.username);
	const groups = useUserStore((s) => s.groups);
	/**
	 * Кнопка удаления: уже KK + allow-list (+ god) из `usePermissions`.
	 * Не дублируем `userHasV2QuestionnaireDeleteRole` — в god mode groups=[] и кнопка пропадала.
	 */
	const canDeleteInRegistry = canDeleteCalculation;

	const versionRows = useMemo<V2QuestionnaireVersionRow[]>(() => {
		if (!questionnaires.length) return [];
		return questionnaires.map((q) => {
			const lock = locksById[q.id];
			const lockedByOther =
				Boolean(lock) && !isOwnV2QuestionnaireEditLock(lock, username);
			return {
				...q,
				rowKind: "version" as const,
				displayLabel: q.calcName,
				/** Блокируем только чужой lock; свой — можно открыть повторно. */
				isEditLocked: lockedByOther,
				editLockKind: lock
					? lockedByOther
						? ("other" as const)
						: ("own" as const)
					: undefined,
			};
		});
	}, [questionnaires, locksById, username]);

	/** Дерево версий — только при фиче ДАДМ; иначе плоский реестр. */
	const rowData = useMemo<V2QuestionnaireGridRow[]>(() => {
		if (!dadmProgramManagerEnabled) return versionRows;
		return buildV2QuestionnaireRegistryTree(versionRows, registryVersionMode, {
			includeAllVersions: true,
		});
	}, [versionRows, registryVersionMode, dadmProgramManagerEnabled]);

	const selectedVersions = useMemo(() => {
		const pageById = new Map(versionRows.map((row) => [row.id, row]));
		const rows: V2QuestionnaireVersionRow[] = [];
		for (const id of selectedIds) {
			const fromPage = pageById.get(id);
			if (fromPage) {
				rows.push(fromPage);
				continue;
			}
			const slim = slimByIdRef.current.get(id);
			if (slim) rows.push(slimToVersionRow(slim));
			else {
				rows.push(
					slimToVersionRow({
						id,
						workflowGlobalStatus: null,
						status: "active",
						implementationStream: null,
					}),
				);
			}
		}
		return rows;
	}, [selectedIds, versionRows]);

	const deletableSelectedVersions = useMemo(
		() =>
			selectedVersions.filter(
				(row) => canUserDeleteV2Questionnaire(groups, row.formData).ok,
			),
		[groups, selectedVersions],
	);
	const deleteSelection = useMemo(
		() =>
			summarizeV2QuestionnaireDeleteSelection(
				deletableSelectedVersions,
				dadmProgramManagerEnabled,
			),
		[dadmProgramManagerEnabled, deletableSelectedVersions],
	);
	const deleteCopy = useMemo(
		() =>
			v2QuestionnaireDeleteToolbarCopy(
				deleteSelection,
				deletableSelectedVersions,
				{
					selectedCount: selectedVersions.length,
					streamDenied:
						selectedVersions.length > 0 &&
						deletableSelectedVersions.length === 0,
				},
			),
		[deleteSelection, deletableSelectedVersions, selectedVersions.length],
	);
	const deleteActionDisabled =
		deleteSelection.kind === "none" || bulkDelete.isPending;
	const deleteLooksLikeDeactivate =
		deleteSelection.kind === "deactivate" ||
		(deleteSelection.kind === "none" &&
			deletableSelectedVersions.length > 0 &&
			deletableSelectedVersions.every(
				(row) => row.workflowGlobalStatus === "Утверждена",
			));

	const queryFingerprint = `${debouncedSearch}|${registryVersionMode}|${dadmProgramManagerEnabled}|${debouncedFilterJson}|${JSON.stringify(sortModel)}`;

	useEffect(() => {
		setPage(1);
		setSelectedIds(new Set());
		setAllMatching(false);
		slimByIdRef.current = new Map();
		gridRef.current?.api?.deselectAll();
	}, [queryFingerprint]);

	useEffect(() => {
		if (!dadmProgramManagerEnabled) return;
		gridRef.current?.api?.expandAll();
	}, [rowData, dadmProgramManagerEnabled]);

	useEffect(() => {
		const api = gridRef.current?.api;
		if (!api) return;
		ignoreSelectionEventRef.current = true;
		api.forEachNode((node) => {
			if (!node.data) return;
			const wanted = shouldSelectGridRow(node.data, selectedIdsRef.current);
			if (node.isSelected() !== wanted) {
				node.setSelected(wanted, false);
			}
		});
		const frame = requestAnimationFrame(() => {
			ignoreSelectionEventRef.current = false;
		});
		return () => cancelAnimationFrame(frame);
	}, [rowData, selectedIds]);

	const rowClassRules = useMemo(
		() => ({
			"v2-questionnaire-row--editing-other": (params: {
				data?: V2QuestionnaireGridRow | undefined;
			}) => resolveVersionRow(params.data)?.editLockKind === "other",
			"v2-questionnaire-row--editing-own": (params: {
				data?: V2QuestionnaireGridRow | undefined;
			}) => resolveVersionRow(params.data)?.editLockKind === "own",
		}),
		[],
	);

	const columnTree = useMemo(
		() => registryConfig?.columnTree ?? [],
		[registryConfig?.columnTree],
	);

	const columnDefs = useMemo(
		() =>
			buildV2QuestionnaireColumnDefsFromTree(columnTree, {
				setFilterParams: defaultColDef.filterParams,
			}),
		[columnTree, defaultColDef],
	);

	const GridPresetToolPanelBound = useMemo(
		() =>
			function GridPresetToolPanelBound(props: { api: PresetGridApi }) {
				return <GridPresetToolPanel {...props} columnTree={columnTree} />;
			},
		[columnTree],
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
			if (editLockHardDisable && row.isEditLocked) {
				toast.error("Анкета сейчас редактируется", {
					description: "Откройте позже, когда блокировка снимется",
				});
				return;
			}
			navigate(pathForV2QuestionnairePreview(row.id));
		},
		[editLockHardDisable, navigate],
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
			const basicPreset = getFactoryGridPresetFromTree(
				FACTORY_PRESET_IDS.default,
				columnTree,
			);
			if (basicPreset) {
				applyQuestionnaireGridPreset(e.api, basicPreset);
			}
			applyAgGridColumnState(GRID_COLUMN_STATE_KEY, (state) => {
				e.api.applyColumnState({ state, applyOrder: true });
			});
			if (dadmProgramManagerEnabled) {
				e.api.expandAll();
			}
			const root = gridHostRef.current?.querySelector(
				".ag-root-wrapper",
			) as HTMLElement | null;
			setPagingHostEl(root);
		},
		[columnTree, dadmProgramManagerEnabled],
	);

	const persistColumnState = useCallback((api: GridApi) => {
		saveAgGridColumnState(GRID_COLUMN_STATE_KEY, api.getColumnState());
	}, []);

	const clearSelection = useCallback(() => {
		setSelectedIds(new Set());
		setAllMatching(false);
		slimByIdRef.current = new Map();
		ignoreSelectionEventRef.current = true;
		gridRef.current?.api?.deselectAll();
		requestAnimationFrame(() => {
			ignoreSelectionEventRef.current = false;
		});
	}, []);

	const handleToggleSelectAll = useCallback(() => {
		if (allMatching) {
			clearSelection();
			return;
		}
		setSelectAllBusy(true);
		void fetchV2QuestionnaireRegistryIds({
			search: debouncedSearch,
			versionMode: dadmProgramManagerEnabled ? registryVersionMode : undefined,
			filterModel: debouncedFilterModel,
			sortModel,
		})
			.then((result) => {
				const next = new Set(result.ids);
				const slim = new Map(slimByIdRef.current);
				for (const row of result.rows) slim.set(row.id, row);
				slimByIdRef.current = slim;
				setSelectedIds(next);
				setAllMatching(true);
			})
			.catch((err) => {
				toast.error("Не удалось выбрать все строки", {
					description: apiErrorMessage(err),
				});
			})
			.finally(() => setSelectAllBusy(false));
	}, [
		allMatching,
		clearSelection,
		dadmProgramManagerEnabled,
		debouncedFilterModel,
		debouncedSearch,
		registryVersionMode,
		sortModel,
	]);

	const gridContext = useMemo<V2QuestionnaireGridContext>(
		() => ({
			editLockHardDisable,
			allMatching,
			selectedCount: selectedIds.size,
			selectAllBusy,
			onToggleSelectAll: handleToggleSelectAll,
		}),
		[
			allMatching,
			editLockHardDisable,
			handleToggleSelectAll,
			selectAllBusy,
			selectedIds.size,
		],
	);

	useEffect(() => {
		gridRef.current?.api?.refreshHeader();
	}, [allMatching, selectAllBusy, selectedIds.size]);

	const handleExportXlsx = useCallback(
		(ids?: string[]) => {
			if (ids && ids.length > 0) {
				setExportDialog({ open: true, ids });
				return;
			}
			const hasServerQuery =
				Boolean(debouncedSearch.trim()) ||
				!isV2AgGridFilterModelEmpty(debouncedFilterModel);
			if (!hasServerQuery) {
				setExportDialog({ open: true });
				return;
			}
			void fetchV2QuestionnaireRegistryIds({
				search: debouncedSearch,
				versionMode: dadmProgramManagerEnabled
					? registryVersionMode
					: undefined,
				filterModel: debouncedFilterModel,
				sortModel,
			})
				.then((result) => {
					if (result.ids.length === 0) {
						toast.error("Нет строк для экспорта по текущим фильтрам");
						return;
					}
					setExportDialog({ open: true, ids: result.ids });
				})
				.catch((err) => {
					toast.error("Не удалось подготовить экспорт", {
						description: apiErrorMessage(err),
					});
				});
		},
		[
			dadmProgramManagerEnabled,
			debouncedFilterModel,
			debouncedSearch,
			registryVersionMode,
			sortModel,
		],
	);

	const autoGroupColumnDef = useMemo<ColDef<V2QuestionnaireGridRow>>(
		() => ({
			field: "displayLabel",
			headerName: "Анкета / версия",
			flex: 1,
			minWidth: 220,
			sortable: false,
			comparator: () => 0,
			filter: "agTextColumnFilter",
			/** Группа и метка версии — текст; ссылка только в колонке «Анкета» (calcName). */
			valueFormatter: (p) =>
				(typeof p.value === "string" && p.value) || p.data?.displayLabel || "",
		}),
		[],
	);

	const getContextMenuItems = useCallback(
		(
			params: GetContextMenuItemsParams<V2QuestionnaireGridRow>,
		): MenuItemDef[] => {
			const clicked = params.node?.data;
			const clickedVersions =
				clicked?.rowKind === "series"
					? clicked.children
					: (() => {
							const version = resolveVersionRow(clicked);
							return version ? [version] : [];
						})();
			if (clickedVersions.length === 0) {
				return [];
			}
			const selectedRows = collectSelectedVersionRows(
				params.api.getSelectedRows(),
			);
			const clickedIds = new Set(clickedVersions.map((item) => item.id));
			const targets = selectedRows.some((item) => clickedIds.has(item.id))
				? selectedRows
				: clickedVersions;
			const exportIds = targets.map((item) => item.id);
			const exportLabel =
				exportIds.length > 1
					? `Экспорт в XLSX (${exportIds.length})`
					: "Экспорт в XLSX";
			const row = clickedVersions[0]!;
			const hardLocked = editLockHardDisable && row.isEditLocked;
			const lockedHint = hardLocked
				? "Анкета сейчас редактируется"
				: row.isEditLocked
					? "уже редактируется — можно открыть"
					: undefined;

			const menu: MenuItemDef[] = [
				{
					name: lockedHint ? `Открыть (${lockedHint})` : "Открыть",
					disabled: Boolean(hardLocked),
					action: () => {
						if (hardLocked) return;
						navigate(pathForV2QuestionnairePreview(row.id));
					},
				},
				{
					name: lockedHint
						? `Новая версия анкеты (${lockedHint})`
						: "Новая версия анкеты",
					disabled: Boolean(hardLocked),
					action: () => {
						if (hardLocked) return;
						navigate(pathForV2QuestionnaireNewVersion(row.id));
					},
				},
				{
					name: exportBusy ? `${exportLabel} (уже выполняется)` : exportLabel,
					disabled: exportBlocked,
					action: () => {
						if (exportBlocked) return;
						void handleExportXlsx(exportIds);
					},
				},
			];

			if (canDeleteInRegistry) {
				const deletable = targets.filter(
					(item) => canUserDeleteV2Questionnaire(groups, item.formData).ok,
				);
				const summary = summarizeV2QuestionnaireDeleteSelection(
					deletable,
					dadmProgramManagerEnabled,
				);
				if (summary.kind !== "none") {
					const copy = v2QuestionnaireDeleteUiCopy(summary);
					menu.push({
						name: copy.menu,
						action: () => {
							const next = new Set(deletable.map((row) => row.id));
							const slim = new Map(slimByIdRef.current);
							for (const row of deletable) {
								slim.set(row.id, slimFromVersionRow(row));
							}
							slimByIdRef.current = slim;
							setSelectedIds(next);
							setAllMatching(false);
							setDeleteDialogOpen(true);
						},
					});
				}
			}

			return menu;
		},
		[
			canDeleteInRegistry,
			dadmProgramManagerEnabled,
			editLockHardDisable,
			exportBlocked,
			exportBusy,
			groups,
			handleExportXlsx,
			navigate,
		],
	);

	const holdableSelectedIds = useMemo(
		() =>
			selectedVersions
				.filter((row) =>
					canHoldQuestionnaire({
						globalStatus: row.workflowGlobalStatus ?? "Черновик",
					}),
				)
				.map((row) => row.id),
		[selectedVersions],
	);

	const runBulkHold = useCallback(() => {
		if (!holdableSelectedIds.length) {
			toast.error("Среди выбранных нет анкет, доступных для утверждения");
			return;
		}
		bulkHold.mutate(
			{ ids: holdableSelectedIds },
			{
				onSuccess: (result) => {
					setHoldDialogOpen(false);
					clearSelection();
					const held = result.heldIds.length;
					const failed = result.failed.length;
					if (held > 0) {
						toast.success(
							failed > 0
								? `Утверждено: ${held}, ошибок: ${failed}`
								: `Утверждено оценок: ${held}`,
						);
					} else if (failed > 0) {
						toast.error(
							result.failed[0]?.message ??
								"Не удалось утвердить выбранные анкеты",
						);
					}
				},
				onError: (err) =>
					toast.error("Ошибка утверждения", {
						description: apiErrorMessage(err),
					}),
			},
		);
	}, [bulkHold, clearSelection, holdableSelectedIds]);

	const runBulkDelete = useCallback(() => {
		const ids = deletableSelectedVersions.map((row) => row.id);
		if (!ids.length) {
			toast.error(
				"Нет доступных для удаления анкет среди выбранных (роль/стрим)",
			);
			return;
		}
		bulkDelete.mutate(
			{ ids },
			{
				onSuccess: (result) => {
					setDeleteDialogOpen(false);
					clearSelection();
					const deleted = result.deletedIds.length;
					const deactivated = result.deactivatedIds?.length ?? 0;
					const failed = result.failed.length;
					const ok = deleted + deactivated;
					if (ok > 0) {
						const parts: string[] = [];
						if (deleted > 0) parts.push(`удалено: ${deleted}`);
						if (deactivated > 0) {
							parts.push(`неактивных: ${deactivated}`);
						}
						if (failed > 0) parts.push(`ошибок: ${failed}`);
						toast.success(parts.join(", "));
					} else if (failed > 0) {
						toast.error(
							result.failed[0]?.message ??
								"Не удалось обработать выбранные анкеты",
						);
					}
				},
				onError: (err) =>
					toast.error("Ошибка удаления", {
						description: apiErrorMessage(err),
					}),
			},
		);
	}, [bulkDelete, clearSelection, deletableSelectedVersions]);

	const versionModeToggle = dadmProgramManagerEnabled ? (
		<SegmentBar<V2QuestionnaireRegistryVersionMode>
			value={registryVersionMode}
			onChange={setRegistryVersionMode}
			data-test-id="anketa-registry-version-mode"
			segments={[
				{
					id: "actual",
					label: V2_QUESTIONNAIRE_REGISTRY_VERSION_MODE_LABELS.actual,
					title: "Серии с активной версией; в строке — все версии анкеты",
					"data-test-id": "anketa-registry-version-mode-actual",
				},
				{
					id: "approved",
					label: V2_QUESTIONNAIRE_REGISTRY_VERSION_MODE_LABELS.approved,
					title: "Серии с утверждённой версией; в строке — все версии анкеты",
					"data-test-id": "anketa-registry-version-mode-approved",
				},
			]}
		/>
	) : null;

	return (
		<Flex
			flexDirection="column"
			height="100%"
			minHeight="0"
			minWidth="0"
			width="100%"
		>
			<Header>
				{compactHeader ? (
					<>
						<IconButton
							size="small"
							onClick={(e) => setHeaderMenuAnchor(e.currentTarget)}
							title="Действия реестра"
							aria-label="Действия реестра"
							aria-controls={
								headerMenuOpen ? "v2-registry-header-menu" : undefined
							}
							aria-haspopup="true"
							aria-expanded={headerMenuOpen ? "true" : undefined}
							data-test-id="anketa-registry-header-menu"
						>
							<MoreVertIcon />
						</IconButton>
						<Popover
							id="v2-registry-header-menu"
							open={headerMenuOpen}
							anchorEl={headerMenuAnchor}
							onClose={() => setHeaderMenuAnchor(null)}
							anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
							transformOrigin={{ vertical: "top", horizontal: "right" }}
							slotProps={{
								paper: {
									sx: { p: 1.5, width: 320, maxWidth: "calc(100vw - 24px)" },
								},
							}}
						>
							<Flex flexDirection="column" gap={10} width="100%">
								{versionModeToggle}
								<SearchInput
									placeholder="Поиск по реестру"
									inputId="v2_registry_quick_filter"
									value={searchInput}
									onChange={setSearchInput}
									applyQuickFilter={false}
								/>
								{canExportReports ? (
									<>
										<Button
											variant="outlined"
											size="small"
											fullWidth
											startIcon={<DownloadIcon />}
											disabled={exportBlocked || isLoading}
											title={exportBlockedTitle}
											onClick={() => {
												setHeaderMenuAnchor(null);
												void handleExportXlsx();
											}}
										>
											{exportBlocked ? "Экспорт…" : "Экспорт всех"}
										</Button>
										<Button
											variant="outlined"
											size="small"
											fullWidth
											startIcon={<DownloadIcon />}
											disabled={
												exportBlocked ||
												isLoading ||
												selectedVersions.length === 0
											}
											title={exportBlockedTitle}
											onClick={() => {
												setHeaderMenuAnchor(null);
												void handleExportXlsx(
													selectedVersions.map((row) => row.id),
												);
											}}
										>
											{exportBlocked
												? "Экспорт…"
												: `Экспорт выбранных (${selectedVersions.length})`}
										</Button>
									</>
								) : null}
								{canShowHoldActions ? (
									<Button
										variant="contained"
										size="small"
										fullWidth
										startIcon={<TaskAltIcon />}
										disabled={!holdableSelectedIds.length || bulkHold.isPending}
										title={V2_ANKETA_HOLD_LABEL}
										onClick={() => {
											setHeaderMenuAnchor(null);
											setHoldDialogOpen(true);
										}}
										data-test-id="anketa-registry-bulk-hold"
									>
										{V2_ANKETA_HOLD_LABEL} ({holdableSelectedIds.length})
									</Button>
								) : null}
								{canDeleteInRegistry ? (
									<Button
										variant="outlined"
										size="small"
										fullWidth
										color={deleteLooksLikeDeactivate ? "primary" : "error"}
										startIcon={
											deleteLooksLikeDeactivate ? (
												<HideSourceOutlinedIcon />
											) : (
												<DeleteOutlineIcon />
											)
										}
										disabled={deleteActionDisabled}
										title={deleteCopy.tooltip}
										onClick={() => {
											setHeaderMenuAnchor(null);
											setDeleteDialogOpen(true);
										}}
										data-test-id="anketa-registry-bulk-delete"
									>
										{deleteCopy.button}
									</Button>
								) : null}
								{canCreateCalculation ? (
									<Button
										component={RouterLink}
										to={pathForV2QuestionnaireCreate()}
										variant="contained"
										size="small"
										fullWidth
										startIcon={<AddIcon />}
										data-test-id="anketa-registry-create"
										onClick={() => setHeaderMenuAnchor(null)}
									>
										Создать анкету
									</Button>
								) : null}
							</Flex>
						</Popover>
					</>
				) : (
					<Flex
						gap={8}
						alignItems="center"
						justifyContent="flex-end"
						flexShrink={0}
						minWidth="0"
					>
						{versionModeToggle}
						<Flex width="280px" minWidth="200px" flexShrink={0}>
							<SearchInput
								placeholder="Поиск по реестру"
								inputId="v2_registry_quick_filter"
								value={searchInput}
								onChange={setSearchInput}
								applyQuickFilter={false}
							/>
						</Flex>
						<Stack
							direction="row"
							spacing={1}
							alignItems="center"
							flexShrink={0}
						>
							{canExportReports ? (
								<>
									<Button
										variant="outlined"
										size="small"
										startIcon={<DownloadIcon />}
										disabled={exportBlocked || isLoading}
										title={exportBlockedTitle}
										onClick={() => void handleExportXlsx()}
									>
										{exportBlocked ? "Экспорт…" : "Экспорт всех"}
									</Button>
									<Button
										variant="outlined"
										size="small"
										startIcon={<DownloadIcon />}
										disabled={
											exportBlocked ||
											isLoading ||
											selectedVersions.length === 0
										}
										title={exportBlockedTitle}
										onClick={() =>
											void handleExportXlsx(
												selectedVersions.map((row) => row.id),
											)
										}
									>
										{exportBlocked
											? "Экспорт…"
											: `Экспорт выбранных (${selectedVersions.length})`}
									</Button>
								</>
							) : null}
							{canShowHoldActions ? (
								<Button
									variant="contained"
									size="small"
									startIcon={<TaskAltIcon />}
									disabled={!holdableSelectedIds.length || bulkHold.isPending}
									title={V2_ANKETA_HOLD_LABEL}
									onClick={() => setHoldDialogOpen(true)}
									data-test-id="anketa-registry-bulk-hold"
									sx={{ whiteSpace: "nowrap" }}
								>
									{V2_ANKETA_HOLD_LABEL} ({holdableSelectedIds.length})
								</Button>
							) : null}
							{canDeleteInRegistry ? (
								<Button
									variant="outlined"
									size="small"
									color={deleteLooksLikeDeactivate ? "primary" : "error"}
									startIcon={
										deleteLooksLikeDeactivate ? (
											<HideSourceOutlinedIcon />
										) : (
											<DeleteOutlineIcon />
										)
									}
									disabled={deleteActionDisabled}
									title={deleteCopy.tooltip}
									onClick={() => setDeleteDialogOpen(true)}
									data-test-id="anketa-registry-bulk-delete"
									sx={{ whiteSpace: "nowrap" }}
								>
									{deleteCopy.button}
								</Button>
							) : null}
							{canCreateCalculation ? (
								<Button
									component={RouterLink}
									to={pathForV2QuestionnaireCreate()}
									variant="contained"
									size="small"
									startIcon={<AddIcon />}
									data-test-id="anketa-registry-create"
								>
									Создать анкету
								</Button>
							) : null}
						</Stack>
					</Flex>
				)}
			</Header>
			<Dialog
				open={holdDialogOpen}
				onClose={() =>
					bulkHold.isPending ? undefined : setHoldDialogOpen(false)
				}
			>
				<DialogTitle>{V2_ANKETA_HOLD_LABEL}</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Будет утверждено версий: {holdableSelectedIds.length}. Каждая
						перейдёт в статус «Утверждена» и будет заблокирована для заполнения.
						Чтобы внести изменения позже, создайте новую версию.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => setHoldDialogOpen(false)}
						disabled={bulkHold.isPending}
					>
						Отмена
					</Button>
					<Button
						variant="contained"
						disabled={bulkHold.isPending || !holdableSelectedIds.length}
						onClick={runBulkHold}
					>
						{bulkHold.isPending ? "Утверждение…" : "Подтвердить"}
					</Button>
				</DialogActions>
			</Dialog>
			<V2QuestionnaireExportProgressDialog
				open={exportDialog.open}
				ids={exportDialog.ids}
				onClose={() => setExportDialog({ open: false })}
			/>
			<Dialog
				open={deleteDialogOpen}
				onClose={() => setDeleteDialogOpen(false)}
			>
				<DialogTitle>{deleteCopy.dialogTitle}</DialogTitle>
				<DialogContent>
					<DialogContentText>{deleteCopy.dialogBody}</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
					<Button
						color={deleteSelection.kind === "deactivate" ? "primary" : "error"}
						variant="contained"
						disabled={bulkDelete.isPending || deleteSelection.kind === "none"}
						onClick={runBulkDelete}
					>
						{bulkDelete.isPending ? "Обработка…" : deleteCopy.confirm}
					</Button>
				</DialogActions>
			</Dialog>
			<GridWrapper ref={gridHostRef} flexGrow={1} sx={{ p: 0 }}>
				<AgGridReact<V2QuestionnaireGridRow>
					ref={gridRef}
					theme={gridTheme}
					icons={gridIcons}
					localeText={AG_GRID_LOCALE_RU}
					treeData={dadmProgramManagerEnabled}
					treeDataChildrenField={
						dadmProgramManagerEnabled ? "children" : undefined
					}
					rowData={rowData}
					columnDefs={columnDefs}
					autoGroupColumnDef={
						dadmProgramManagerEnabled ? autoGroupColumnDef : undefined
					}
					getRowId={getRowId}
					rowClassRules={rowClassRules}
					defaultColDef={defaultColDef}
					headerHeight={32}
					groupHeaderHeight={32}
					defaultColGroupDef={defaultColGroupDef}
					sideBar={sideBar}
					onRowDoubleClicked={onRowDoubleClicked}
					getContextMenuItems={getContextMenuItems}
					onGridReady={onGridReady}
					onColumnMoved={(event) => persistColumnState(event.api)}
					onColumnVisible={(event) => persistColumnState(event.api)}
					onColumnPinned={(event) => persistColumnState(event.api)}
					onSortChanged={(event) => {
						persistColumnState(event.api);
						const next = sortModelFromColumnState(event.api.getColumnState());
						setSortModel((prev) =>
							JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
						);
					}}
					onFilterChanged={(
						event: FilterChangedEvent<V2QuestionnaireGridRow>,
					) => {
						const next = (event.api.getFilterModel() ??
							{}) as V2AgGridFilterModel;
						setFilterModel((prev) =>
							JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
						);
					}}
					onColumnResized={(event) => {
						if (event.finished) persistColumnState(event.api);
					}}
					loading={isLoading || isRegistryConfigLoading}
					context={gridContext}
					alwaysPassFilter={() => true}
					rowSelection={rowSelection}
					selectionColumnDef={{
						width: 48,
						maxWidth: 48,
						pinned: "left",
						suppressHeaderMenuButton: true,
						headerComponent: V2RegistrySelectAllHeader,
					}}
					onSelectionChanged={(
						e: SelectionChangedEvent<V2QuestionnaireGridRow>,
					) => {
						if (ignoreSelectionEventRef.current) return;
						const visibleIds = collectVersionIdsFromGridRows(rowData);
						const selectedVisible = selectedVisibleIdsFromGridRows(
							e.api.getSelectedRows(),
						);
						const selectedVisibleSet = new Set(selectedVisible);
						const slim = new Map(slimByIdRef.current);
						for (const row of collectSelectedVersionRows(
							e.api.getSelectedRows(),
						)) {
							slim.set(row.id, slimFromVersionRow(row));
						}
						slimByIdRef.current = slim;
						setSelectedIds((prev) =>
							mergeVisibleSelection(prev, visibleIds, selectedVisible),
						);
						setAllMatching((prevAll) => {
							if (!prevAll) return false;
							return visibleIds.every((id) => selectedVisibleSet.has(id));
						});
					}}
					domLayout="normal"
					suppressAggFuncInHeader
				/>
				<V2RegistryPagingPanel
					page={listMeta?.page ?? page}
					limit={listMeta?.limit ?? V2_QUESTIONNAIRE_REGISTRY_PAGE_SIZE}
					total={listMeta?.total ?? 0}
					lastPage={listMeta?.lastPage ?? 0}
					disabled={isLoading}
					onPageChange={setPage}
					hostEl={pagingHostEl}
				/>
			</GridWrapper>
		</Flex>
	);
}
