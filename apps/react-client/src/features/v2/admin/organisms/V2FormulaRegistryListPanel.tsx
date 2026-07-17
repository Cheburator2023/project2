import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { styled, useColorScheme } from "@mui/material/styles";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { getAgGridMainMenuItems } from "@react-client/common/tableStuff/agGridMainMenuItems";
import { registerAgGridTableModules } from "@react-client/common/tableStuff/agGridTableModules";
import {
	AG_GRID_SCHEMA_GROUP_AUTO_COLUMN,
} from "@react-client/common/tableStuff/agGridSchemaGrouping";
import { useAgGridColumnPersistence } from "@react-client/common/tableStuff/useAgGridColumnPersistence";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "@react-client/theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";
import { formulaBadgeLabel } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/typicalWorksUi";
import type {
	V2FormulaRegistryItemDto,
	V2FormulaRegistryTemplateOptionDto,
} from "@smart-anketa/api-contract";
import { formatFormulaRegistryParamLabel } from "@smart-anketa/api-contract";
import {
	type ColDef,
	type ICellRendererParams,
	type RowClassParams,
	type RowClickedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

registerAgGridTableModules();

const AgGridHost = styled("div")`
	flex: 1 1 auto;
	min-height: 0;
	width: 100%;
	height: 100%;

	& > div {
		width: 100%;
		height: 100%;
	}
`;

type V2FormulaRegistryListPanelProps = {
	items: V2FormulaRegistryItemDto[];
	totalCount: number;
	selectedId: string | null;
	quickFilter: string;
	onQuickFilterChange: (value: string) => void;
	onSelect: (id: string) => void;
	templateFilter: string;
	onTemplateFilterChange: (templateId: string) => void;
	templateOptions: V2FormulaRegistryTemplateOptionDto[];
};

function refsSummaryCellRenderer(
	p: ICellRendererParams<V2FormulaRegistryItemDto>,
) {
	const item = p.data;
	if (!item) return null;
	const params = item.paramRefs
		.map((ref) => formatFormulaRegistryParamLabel(ref.paramCode, ref.paramName))
		.join(", ");
	const works = item.workRefs
		.map((ref) => ref.workName?.trim() || ref.assignmentId.slice(0, 8))
		.join(", ");
	if (!params && !works) {
		return (
			<Typography variant="caption" color="text.disabled">
				только норма
			</Typography>
		);
	}
	return (
		<Flex flexDirection="column" justifyContent="center" height="100%" gap={2}>
			{params ? (
				<Typography variant="caption" noWrap title={`Параметры: ${params}`}>
					П: {params}
				</Typography>
			) : null}
			{works ? (
				<Typography variant="caption" noWrap title={`Работы: ${works}`}>
					Р: {works}
				</Typography>
			) : null}
		</Flex>
	);
}

function invalidCellRenderer(p: ICellRendererParams<V2FormulaRegistryItemDto>) {
	if (!p.data?.hasInvalidRefs) return null;
	return (
		<Chip
			size="small"
			color="warning"
			label="битые ссылки"
			variant="outlined"
			sx={{ fontSize: 11 }}
		/>
	);
}

export function buildFormulaRegistryQuickFilterText(
	item: V2FormulaRegistryItemDto,
): string {
	return [
		item.workName,
		item.templateName,
		item.streamExecutor,
		item.formulaText,
		String(item.versionNumber),
		item.versionStatus,
		formulaBadgeLabel(item.formulaBadge),
		...item.paramRefs.map((ref) => ref.paramCode),
		...item.paramRefs.map((ref) => ref.paramName ?? ""),
		...item.paramRefs.map((ref) =>
			formatFormulaRegistryParamLabel(ref.paramCode, ref.paramName),
		),
		...item.workRefs.map((ref) => ref.workName ?? ""),
		...item.workRefs.map((ref) => ref.assignmentId),
	]
		.filter(Boolean)
		.join(" ");
}

export function V2FormulaRegistryListPanel({
	items,
	totalCount,
	selectedId,
	quickFilter,
	onQuickFilterChange,
	onSelect,
	templateFilter,
	onTemplateFilterChange,
	templateOptions,
}: V2FormulaRegistryListPanelProps) {
	const { mode } = useColorScheme();
	const gridRef = useRef<AgGridReact<V2FormulaRegistryItemDto>>(null);
	const gridPersistence = useAgGridColumnPersistence("v2.formulas.registry.panel");

	const gridTheme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const columnDefs = useMemo<ColDef<V2FormulaRegistryItemDto>[]>(
		() => [
			{
				field: "templateName",
				rowGroup: true,
				hide: true,
			},
			{
				field: "workName",
				headerName: "Работа",
				flex: 1.3,
				minWidth: 180,
			},
			{
				colId: "version",
				headerName: "Версия",
				flex: 0.7,
				minWidth: 90,
				valueGetter: (p) =>
					p.data ? `v${p.data.versionNumber} (${p.data.versionStatus})` : "",
			},
			{
				field: "streamExecutor",
				headerName: "Стрим",
				flex: 0.8,
				minWidth: 100,
			},
			{
				field: "formulaText",
				headerName: "Формула",
				flex: 1.6,
				minWidth: 220,
				cellRenderer: (p: ICellRendererParams<V2FormulaRegistryItemDto>) => (
					<Typography
						variant="caption"
						component="span"
						sx={{ fontFamily: "monospace", whiteSpace: "nowrap" }}
						title={p.data?.formulaText}
					>
						{p.data?.formulaText || "N"}
					</Typography>
				),
			},
			{
				colId: "refs",
				headerName: "Связи",
				flex: 1.2,
				minWidth: 180,
				sortable: false,
				filter: false,
				cellRenderer: refsSummaryCellRenderer,
			},
			{
				colId: "invalid",
				headerName: "",
				width: 120,
				sortable: false,
				filter: false,
				cellRenderer: invalidCellRenderer,
			},
		],
		[],
	);

	const defaultColDef = useMemo<ColDef>(
		() => ({
			sortable: true,
			resizable: true,
			minWidth: 72,
			mainMenuItems: getAgGridMainMenuItems,
		}),
		[],
	);

	const autoGroupColumnDef = useMemo<ColDef>(
		() => AG_GRID_SCHEMA_GROUP_AUTO_COLUMN,
		[],
	);

	useEffect(() => {
		const api = gridRef.current?.api;
		if (!api || !selectedId) return;
		api.forEachNode((node) => {
			if (node.data?.id === selectedId) {
				api.ensureNodeVisible(node, "middle");
			}
		});
	}, [items, selectedId]);

	const getRowClass = useCallback(
		(params: RowClassParams<V2FormulaRegistryItemDto>) =>
			!params.node.group && params.data?.id === selectedId
				? "v2-formula-registry-row--active"
				: "",
		[selectedId],
	);

	const onRowClicked = useCallback(
		(event: RowClickedEvent<V2FormulaRegistryItemDto>) => {
			if (event.node.group || !event.data?.id) return;
			onSelect(event.data.id);
		},
		[onSelect],
	);

	useEffect(() => {
		gridRef.current?.api?.redrawRows();
	}, [selectedId, items]);

	return (
		<Card
			height="100%"
			width="100%"
			padding="12px"
			sx={{
				"& .v2-formula-registry-row--active": {
					backgroundColor: "action.selected",
				},
			}}
		>
			<Flex flexDirection="column" height="100%" minHeight="0" gap={8}>
				<Flex alignItems="center" gap={8} wrap="wrap">
					<TextField
						size="small"
						fullWidth
						placeholder="Поиск формул…"
						value={quickFilter}
						onChange={(event) => onQuickFilterChange(event.target.value)}
						sx={{ flex: "1 1 220px", minWidth: 220 }}
					/>
					<TextField
						select
						size="small"
						label="Схема"
						value={templateFilter}
						onChange={(event) => onTemplateFilterChange(event.target.value)}
						sx={{ flex: "0 1 220px", minWidth: 180 }}
					>
						<MenuItem value="">Все схемы</MenuItem>
						{templateOptions.map((option) => (
							<MenuItem key={option.id} value={option.id}>
								{option.name}
							</MenuItem>
						))}
					</TextField>
				</Flex>
				<Typography variant="caption" color="text.secondary">
					{items.length === totalCount
						? `Всего формул: ${totalCount}`
						: `Показано ${items.length} из ${totalCount}`}
				</Typography>
				<AgGridHost>
					<AgGridReact<V2FormulaRegistryItemDto>
						ref={gridRef}
						theme={gridTheme}
						icons={agGridIconSet}
						rowData={items}
						columnDefs={columnDefs}
						defaultColDef={defaultColDef}
						autoGroupColumnDef={autoGroupColumnDef}
						groupDefaultExpanded={-1}
						groupDisplayType="singleColumn"
						localeText={AG_GRID_LOCALE_RU}
						getRowId={(params) => params.data.id}
						rowSelection={{ mode: "singleRow", checkboxes: false }}
						suppressCellFocus
						getRowClass={getRowClass}
						onRowClicked={onRowClicked}
						sideBar={gridPersistence.sideBar}
						onGridReady={gridPersistence.onGridReady}
						onColumnMoved={(event) => gridPersistence.onColumnMoved(event.api)}
						onColumnVisible={(event) =>
							gridPersistence.onColumnVisible(event.api)
						}
						onColumnPinned={(event) => gridPersistence.onColumnPinned(event.api)}
						onSortChanged={(event) => gridPersistence.onSortChanged(event.api)}
						onColumnResized={(event) => {
							if (event.finished) gridPersistence.onColumnResized(event.api);
						}}
					/>
				</AgGridHost>
			</Flex>
		</Card>
	);
}
