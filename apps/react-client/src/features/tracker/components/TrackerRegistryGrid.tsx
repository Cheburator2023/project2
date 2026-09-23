import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { styled, useColorScheme } from "@mui/material/styles";
import { Flex } from "@react-client/common/primitives/Flex";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { getAgGridMainMenuItems } from "@react-client/common/tableStuff/agGridMainMenuItems";
import { registerAgGridTableModules } from "@react-client/common/tableStuff/agGridTableModules";
import { loadAgGridRowTintEnabled } from "@react-client/common/tableStuff/agGridColumnState";
import { useAgGridColumnPersistence } from "@react-client/common/tableStuff/useAgGridColumnPersistence";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "@react-client/theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";
import {
	type CellContextMenuEvent,
	type CellValueChangedEvent,
	type ColDef,
	type GetRowIdParams,
	type GridApi,
	type IRowNode,
	type RowClassParams,
	type RowDragEndEvent,
	type RowStyle,
	type SelectionChangedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useRef, useState } from "react";

registerAgGridTableModules();

const GridWrapper = styled(Flex)`
	width: 100%;
	height: -webkit-fill-available;

	& > div {
		width: 100%;
		min-height: 360px;
		height: -webkit-fill-available;
	}

	.ag-cell-value,
	.ag-cell-wrapper {
		height: 100%;
	}
`;

export type TrackerRegistryContextAction<TRow> = {
	label: string;
	disabled?: (row: TRow) => boolean;
	onClick: (row: TRow) => void;
};

export type TrackerRegistryBulkContextAction<TRow> = {
	label: string;
	disabled?: (rows: TRow[]) => boolean;
	onClick: (rows: TRow[]) => void;
};

type Props<TRow extends object> = {
	gridStateKey: string;
	rowData: TRow[];
	columnDefs: ColDef<TRow>[];
	loading?: boolean;
	quickFilter?: string;
	onSelectionChange?: (rows: TRow[]) => void;
	onRowDoubleClick?: (row: TRow) => void;
	onCellValueChanged?: (
		row: TRow,
		field: string,
		value: unknown,
		oldValue?: unknown,
	) => void;
	contextActions?: TrackerRegistryContextAction<TRow>[];
	bulkContextActions?: TrackerRegistryBulkContextAction<TRow>[];
	treeData?: boolean;
	treeDataChildrenField?: string;
	autoGroupColumnDef?: ColDef<TRow>;
	getRowId?: (params: GetRowIdParams<TRow>) => string;
	isRowSelectable?: (node: IRowNode<TRow>) => boolean;
	onRowDragEnd?: (event: RowDragEndEvent<TRow>) => void;
	getRowStyle?: (params: RowClassParams<TRow>) => RowStyle | undefined;
	showRowTintToggle?: boolean;
	pagination?: boolean;
	selectAllOnReady?: boolean;
	stopEditingWhenCellsLoseFocus?: boolean;
	pinnedBottomRowData?: TRow[];
	defaultFilter?: ColDef["filter"];
	defaultFilterParams?: ColDef["filterParams"];
};

export function TrackerRegistryGrid<TRow extends object>({
	gridStateKey,
	rowData,
	columnDefs,
	loading = false,
	quickFilter = "",
	onSelectionChange,
	onRowDoubleClick,
	onCellValueChanged,
	contextActions = [],
	bulkContextActions = [],
	treeData = false,
	treeDataChildrenField,
	autoGroupColumnDef,
	getRowId,
	isRowSelectable,
	onRowDragEnd,
	getRowStyle,
	showRowTintToggle = false,
	pagination = true,
	selectAllOnReady = false,
	stopEditingWhenCellsLoseFocus = false,
	pinnedBottomRowData,
	defaultFilter,
	defaultFilterParams,
}: Props<TRow>) {
	const { mode } = useColorScheme();
	const gridRef = useRef<AgGridReact<TRow>>(null);
	const {
		sideBar,
		onGridReady,
		onColumnMoved,
		onFilterChanged,
		onColumnsReset,
	} = useAgGridColumnPersistence(gridStateKey, { showRowTintToggle });
	const [menuState, setMenuState] = useState<{
		mouseX: number;
		mouseY: number;
		row: TRow;
		rows: TRow[];
	} | null>(null);

	useEffect(() => {
		gridRef.current?.api?.setGridOption("quickFilterText", quickFilter);
	}, [quickFilter]);

	const gridTheme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const closeMenu = useCallback(() => setMenuState(null), []);

	const handleColumnStateChange = useCallback(
		(api: GridApi, source?: string) => {
			if (source === "gridOptionsChanged") {
				onColumnsReset(api);
				return;
			}
			onColumnMoved(api, source);
		},
		[onColumnMoved, onColumnsReset],
	);

	const resolveRowStyle = useCallback(
		(params: RowClassParams<TRow>) => {
			if (showRowTintToggle && !loadAgGridRowTintEnabled(gridStateKey)) {
				return undefined;
			}
			return getRowStyle?.(params);
		},
		[getRowStyle, gridStateKey, showRowTintToggle],
	);

	const handleCellContextMenu = useCallback(
		(event: CellContextMenuEvent<TRow>) => {
			if (!contextActions.length && !bulkContextActions.length) return;
			event.event?.preventDefault();
			const native = event.event as MouseEvent | undefined;
			const data = event.node?.data;
			if (!native || !data || !("clientX" in native)) return;
			const selectedRows = gridRef.current?.api?.getSelectedRows() ?? [];
			const targetRows =
				selectedRows.includes(data) && selectedRows.length > 1
					? selectedRows
					: [data];
			setMenuState({
				mouseX: native.clientX + 2,
				mouseY: native.clientY - 6,
				row: data,
				rows: targetRows,
			});
		},
		[bulkContextActions.length, contextActions.length],
	);

	return (
		<GridWrapper flexDirection="column" gap={1}>
			<AgGridReact<TRow>
				ref={gridRef}
				theme={gridTheme}
				icons={agGridIconSet}
				rowData={rowData}
				columnDefs={columnDefs}
				maintainColumnOrder
				autoGroupColumnDef={autoGroupColumnDef}
				treeData={treeData}
				treeDataChildrenField={treeData ? treeDataChildrenField : undefined}
				getRowId={getRowId}
				isRowSelectable={isRowSelectable}
				getRowStyle={getRowStyle ? resolveRowStyle : undefined}
				pinnedBottomRowData={pinnedBottomRowData}
				groupDefaultExpanded={treeData ? -1 : undefined}
				onRowDragEnd={onRowDragEnd}
				defaultColDef={{
					sortable: true,
					filter: defaultFilter ?? true,
					...(defaultFilterParams
						? { filterParams: defaultFilterParams }
						: {}),
					resizable: true,
					floatingFilter: true,
					minWidth: 100,
					mainMenuItems: getAgGridMainMenuItems,
				}}
				loading={loading}
				pagination={pagination}
				localeText={AG_GRID_LOCALE_RU}
				rowSelection={{
					mode: "multiRow",
					checkboxes: true,
					headerCheckbox: true,
					enableClickSelection: false,
				}}
				sideBar={sideBar}
				onGridReady={(event) => {
					onGridReady(event);
					if (selectAllOnReady) event.api.selectAll();
				}}
				stopEditingWhenCellsLoseFocus={stopEditingWhenCellsLoseFocus}
				onNewColumnsLoaded={(event) => onColumnsReset(event.api)}
				onColumnMoved={(event) =>
					handleColumnStateChange(event.api, event.source)
				}
				onColumnVisible={(event) =>
					handleColumnStateChange(event.api, event.source)
				}
				onColumnPinned={(event) =>
					handleColumnStateChange(event.api, event.source)
				}
				onSortChanged={(event) =>
					handleColumnStateChange(event.api, event.source)
				}
				onColumnResized={(event) => {
					if (!event.finished) return;
					handleColumnStateChange(event.api, event.source);
				}}
				onFilterChanged={(event) => {
					onFilterChanged(event.api, event.source);
				}}
				onSelectionChanged={(event: SelectionChangedEvent<TRow>) => {
					onSelectionChange?.(event.api.getSelectedRows());
				}}
				onCellContextMenu={handleCellContextMenu}
				onRowDoubleClicked={(event) => {
					if (event.data) onRowDoubleClick?.(event.data);
				}}
				onCellValueChanged={(event: CellValueChangedEvent<TRow>) => {
					if (!event.data) return;
					const field = event.colDef.field ?? event.colDef.colId;
					if (!field) return;
					onCellValueChanged?.(
						event.data,
						field,
						event.newValue,
						event.oldValue,
					);
				}}
				singleClickEdit
				suppressCsvExport
				suppressExcelExport
				preventDefaultOnContextMenu={
					contextActions.length > 0 || bulkContextActions.length > 0
				}
			/>
			{contextActions.length > 0 || bulkContextActions.length > 0 ? (
				<Menu
					open={menuState !== null}
					onClose={closeMenu}
					anchorReference="anchorPosition"
					anchorPosition={
						menuState !== null
							? { top: menuState.mouseY, left: menuState.mouseX }
							: undefined
					}
				>
					{bulkContextActions.map((action) => (
						<MenuItem
							key={`bulk:${action.label}`}
							disabled={
								menuState ? Boolean(action.disabled?.(menuState.rows)) : true
							}
							onClick={() => {
								if (menuState && !action.disabled?.(menuState.rows)) {
									action.onClick(menuState.rows);
									closeMenu();
								}
							}}
						>
							{action.label}
							{menuState && menuState.rows.length > 1
								? ` (${menuState.rows.length})`
								: ""}
						</MenuItem>
					))}
					{contextActions.map((action) => (
						<MenuItem
							key={action.label}
							disabled={
								menuState ? Boolean(action.disabled?.(menuState.row)) : true
							}
							onClick={() => {
								if (menuState && !action.disabled?.(menuState.row)) {
									action.onClick(menuState.row);
									closeMenu();
								}
							}}
						>
							{action.label}
						</MenuItem>
					))}
				</Menu>
			) : null}
		</GridWrapper>
	);
}

export const trackerDateFormatter = (value: unknown) =>
	value ? new Date(String(value)).toLocaleString("ru-RU") : "";
