import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { styled, useColorScheme } from "@mui/material/styles";
import { Flex } from "@react-client/common/primitives/Flex";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "@react-client/theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";
import {
	AllCommunityModule,
	ClientSideRowModelModule,
	type CellContextMenuEvent,
	type CellValueChangedEvent,
	type ColDef,
	type SelectionChangedEvent,
	ModuleRegistry,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useRef, useState } from "react";

ModuleRegistry.registerModules([AllCommunityModule, ClientSideRowModelModule]);

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

type Props<TRow extends object> = {
	rowData: TRow[];
	columnDefs: ColDef<TRow>[];
	loading?: boolean;
	quickFilter?: string;
	onSelectionChange?: (rows: TRow[]) => void;
	onRowDoubleClick?: (row: TRow) => void;
	onCellValueChanged?: (row: TRow, field: string, value: unknown) => void;
	contextActions?: TrackerRegistryContextAction<TRow>[];
};

export function TrackerRegistryGrid<TRow extends object>({
	rowData,
	columnDefs,
	loading = false,
	quickFilter = "",
	onSelectionChange,
	onRowDoubleClick,
	onCellValueChanged,
	contextActions = [],
}: Props<TRow>) {
	const { mode } = useColorScheme();
	const gridRef = useRef<AgGridReact<TRow>>(null);
	const [menuState, setMenuState] = useState<{
		mouseX: number;
		mouseY: number;
		row: TRow;
	} | null>(null);

	useEffect(() => {
		gridRef.current?.api?.setGridOption("quickFilterText", quickFilter);
	}, [quickFilter]);

	const gridTheme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const closeMenu = useCallback(() => setMenuState(null), []);

	const handleCellContextMenu = useCallback(
		(event: CellContextMenuEvent<TRow>) => {
			if (!contextActions.length) return;
			event.event?.preventDefault();
			const native = event.event as MouseEvent | undefined;
			const data = event.node?.data;
			if (!native || !data || !("clientX" in native)) return;
			setMenuState({
				mouseX: native.clientX + 2,
				mouseY: native.clientY - 6,
				row: data,
			});
		},
		[contextActions.length],
	);

	return (
		<GridWrapper flexDirection="column" gap={1}>
			<AgGridReact<TRow>
				ref={gridRef}
				theme={gridTheme}
				icons={agGridIconSet}
				rowData={rowData}
				columnDefs={columnDefs}
				defaultColDef={{
					sortable: true,
					filter: true,
					resizable: true,
					floatingFilter: true,
					minWidth: 100,
				}}
				loading={loading}
				pagination
				localeText={AG_GRID_LOCALE_RU}
				rowSelection={{
					mode: "multiRow",
					checkboxes: true,
					headerCheckbox: true,
					enableClickSelection: false,
				}}
				onSelectionChanged={(event: SelectionChangedEvent<TRow>) => {
					onSelectionChange?.(event.api.getSelectedRows());
				}}
				onCellContextMenu={handleCellContextMenu}
				onRowDoubleClicked={(event) => {
					if (event.data) onRowDoubleClick?.(event.data);
				}}
				onCellValueChanged={(event: CellValueChangedEvent<TRow>) => {
					if (!event.data || !event.colDef.field) return;
					onCellValueChanged?.(
						event.data,
						event.colDef.field,
						event.newValue,
					);
				}}
				singleClickEdit
				suppressCsvExport
				suppressExcelExport
				preventDefaultOnContextMenu={contextActions.length > 0}
			/>
			{contextActions.length > 0 ? (
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
