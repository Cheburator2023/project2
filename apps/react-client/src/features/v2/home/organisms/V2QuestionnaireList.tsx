import AddIcon from "@mui/icons-material/Add";
import { Button, Chip, styled, useColorScheme } from "@mui/material";
import { useV2Questionnaires } from "@react-client/common/api/queries/v2-questionnaires";
import { Flex } from "@react-client/common/primitives/Flex";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { v2Routes } from "@react-client/routing/version/v2/routes";
import type {
	V2QuestionnaireDto,
	V2SchemaBindingStatus,
} from "@smart-anketa/api-contract";
import type {
	V2QuestionnaireGridRow,
	V2QuestionnaireSeriesRow,
} from "../types/v2QuestionnaireGrid.types";
import {
	AllCommunityModule,
	ClientSideRowModelModule,
	type GetContextMenuItemsParams,
	type GridReadyEvent,
	type ICellRendererParams,
	type MenuItemDef,
	type RowDoubleClickedEvent,
	ModuleRegistry,
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
	TreeDataModule,
} from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "@react-client/theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";
import { buildV2QuestionnaireColumnDefs } from "../utils/v2QuestionnaireGridColumns";
import { resolveVersionRow } from "../utils/v2QuestionnaireGridValue";

export type {
	V2QuestionnaireGridRow,
	V2QuestionnaireSeriesRow,
	V2QuestionnaireVersionRow,
} from "../types/v2QuestionnaireGrid.types";

ModuleRegistry.registerModules([
	AllCommunityModule,
	ClientSideRowModelModule,
	TreeDataModule,
	ContextMenuModule,
	ColumnsToolPanelModule,
	ColumnMenuModule,
	FiltersToolPanelModule,
	SetFilterModule,
	SideBarModule,
	...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),
]);

const GridWrapper = styled(Flex)`
	width: 100%;
	height: -webkit-fill-available;

	& > div {
		width: 100%;
		min-height: 360px;
		height: -webkit-fill-available;
	}
`;

const BINDING_LABEL: Record<V2SchemaBindingStatus, string> = {
	aligned: "Схема актуальна",
	superseded: "Схема устарела",
	unavailable: "Схема недоступна",
};

const BINDING_COLOR: Record<
	V2SchemaBindingStatus,
	"success" | "warning" | "error"
> = {
	aligned: "success",
	superseded: "warning",
	unavailable: "error",
};

function BindingChip({ status }: { status: V2SchemaBindingStatus }) {
	return (
		<Chip
			size="small"
			label={BINDING_LABEL[status]}
			color={BINDING_COLOR[status]}
			variant="outlined"
		/>
	);
}

export function V2QuestionnaireList() {
	const { mode } = useColorScheme();
	const navigate = useNavigate();
	const gridRef = useRef<AgGridReact<V2QuestionnaireGridRow>>(null);

	const gridTheme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const { data: questionnaires, isLoading } = useV2Questionnaires();

	const treeRowData = useMemo<V2QuestionnaireSeriesRow[]>(() => {
		if (!questionnaires?.length) return [];

		const bySeries = new Map<string, V2QuestionnaireDto[]>();
		for (const q of questionnaires) {
			const list = bySeries.get(q.seriesId) ?? [];
			list.push(q);
			bySeries.set(q.seriesId, list);
		}

		return [...bySeries.entries()].map(([seriesId, versions]) => {
			const sorted = [...versions].sort(
				(a, b) =>
					Number.parseInt(b.version, 10) - Number.parseInt(a.version, 10),
			);
			const head = sorted[0];
			return {
				rowKind: "series" as const,
				seriesId,
				displayLabel: head?.calcName ?? seriesId,
				calcName: head?.calcName ?? seriesId,
				children: sorted.map((v) => ({
					...v,
					rowKind: "version" as const,
					displayLabel: `Версия ${v.version}${v.readableId ? ` · ${v.readableId}` : ""}`,
				})),
			};
		});
	}, [questionnaires]);

	const columnDefs = useMemo(() => buildV2QuestionnaireColumnDefs(), []);

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
			],
			defaultToolPanel: "columns",
			position: "right",
		}),
		[],
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

	const onGridReady = useCallback((e: GridReadyEvent) => {
		e.api.expandAll();
	}, []);

	const getContextMenuItems = useCallback(
		(
			params: GetContextMenuItemsParams<V2QuestionnaireGridRow>,
		): MenuItemDef[] => {
			const row = resolveVersionRow(params.node?.data);
			if (!row) {
				return [];
			}
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
			];
		},
		[navigate],
	);

	return (
		<div>
			<Header>
				<Button
					variant="contained"
					size="small"
					startIcon={<AddIcon />}
					onClick={() => navigate(`/v2/${v2Routes.calculationCreate.rootPath}`)}
				>
					Создать анкету
				</Button>
			</Header>
			<GridWrapper flexGrow={1} minHeight="0" sx={{ p: 0 }}>
				<AgGridReact<V2QuestionnaireGridRow>
					ref={gridRef}
					theme={gridTheme}
					icons={agGridIconSet}
					localeText={AG_GRID_LOCALE_RU}
					rowData={treeRowData}
					columnDefs={columnDefs}
					treeData
					treeDataChildrenField="children"
					getRowId={getRowId}
					autoGroupColumnDef={{
						headerName: "Анкета / версия",
						minWidth: 260,
						pinned: "left",
						cellRendererParams: { suppressCount: true },
						filter: "agTextColumnFilter",
						valueGetter: (p) => p.data?.displayLabel ?? "",
						cellRenderer: (p: ICellRendererParams<V2QuestionnaireGridRow>) => {
							const version = resolveVersionRow(p.data);
							if (version) {
								return (
									<Flex gap={1} alignItems="center" minWidth="0">
										<span
											style={{ overflow: "hidden", textOverflow: "ellipsis" }}
										>
											{p.data?.displayLabel ?? version.calcName}
										</span>
										<BindingChip status={version.schemaBinding.status} />
									</Flex>
								);
							}
							return p.data?.displayLabel ?? "";
						},
					}}
					groupDefaultExpanded={-1}
					defaultColDef={{
						sortable: true,
						resizable: true,
						filter: true,
						minWidth: 90,
					}}
					defaultColGroupDef={{
						marryChildren: true,
					}}
					sideBar={sideBar}
					onRowDoubleClicked={onRowDoubleClicked}
					getContextMenuItems={getContextMenuItems}
					onGridReady={onGridReady}
					loading={isLoading}
					domLayout="normal"
					suppressAggFuncInHeader
				/>
			</GridWrapper>
		</div>
	);
}
