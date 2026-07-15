import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { styled, useColorScheme } from "@mui/material/styles";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { registerAgGridTableModules } from "@react-client/common/tableStuff/agGridTableModules";
import { useAgGridColumnPersistence } from "@react-client/common/tableStuff/useAgGridColumnPersistence";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "@react-client/theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";
import type { V2DictionaryDto } from "@smart-anketa/api-contract";
import { type ColDef, type ICellRendererParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

registerAgGridTableModules();

/** ag-grid требует явную высоту контейнера — flex:1 + min-height:0 в колонке */
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

type V2DictionaryListPanelProps = {
	items: V2DictionaryDto[];
	selectedId: string | null;
	quickFilter: string;
	onQuickFilterChange: (value: string) => void;
	onSelect: (id: string) => void;
	onCreate?: () => void;
	showCreateButton?: boolean;
};

function flagsCellRenderer(p: ICellRendererParams<V2DictionaryDto>) {
	const row = p.data;
	if (!row) return null;
	return (
		<Flex gap={6} wrap="wrap" alignItems="center" height="100%">
			{row.isDefault ? (
				<Chip size="small" label="Заводской" variant="outlined" color="info" />
			) : null}
			{row.isInUse ? (
				<Chip
					size="small"
					label="В схемах"
					variant="outlined"
					color="warning"
				/>
			) : null}
			{!row.isDefault && !row.isInUse ? (
				<Chip size="small" label="Свободный" variant="outlined" />
			) : null}
		</Flex>
	);
}

export function V2DictionaryListPanel({
	items,
	selectedId,
	quickFilter,
	onQuickFilterChange,
	onSelect,
	onCreate,
	showCreateButton = true,
}: V2DictionaryListPanelProps) {
	const { mode } = useColorScheme();
	const gridRef = useRef<AgGridReact<V2DictionaryDto>>(null);
	const gridPersistence = useAgGridColumnPersistence("v2.dictionaries.panel");

	const gridTheme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const columnDefs = useMemo<ColDef<V2DictionaryDto>[]>(
		() => [
			{ field: "code", headerName: "Код", flex: 1, minWidth: 110 },
			{ field: "name", headerName: "Название", flex: 1.4, minWidth: 120 },
			{
				colId: "flags",
				headerName: "Статус",
				width: 230,
				minWidth: 230,
				sortable: false,
				filter: false,
				cellRenderer: flagsCellRenderer,
			},
		],
		[],
	);

	const defaultColDef = useMemo<ColDef>(
		() => ({
			sortable: true,
			resizable: true,
			minWidth: 72,
		}),
		[],
	);

	useEffect(() => {
		gridRef.current?.api?.setGridOption("quickFilterText", quickFilter);
	}, [quickFilter]);

	useEffect(() => {
		const api = gridRef.current?.api;
		if (!api) return;

		api.deselectAll();
		if (!selectedId) return;

		api.forEachNode((node) => {
			if (node.data?.id === selectedId) {
				node.setSelected(true);
				api.ensureNodeVisible(node, "middle");
			}
		});
	}, [selectedId, items]);

	const handleSelectionChanged = useCallback(() => {
		const row = gridRef.current?.api?.getSelectedRows()[0];
		if (row?.id) onSelect(row.id);
	}, [onSelect]);

	return (
		<Card
			padding="0"
			overflow="hidden"
			height="100%"
			width="100%"
			sx={{
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
				"& > div": {
					display: "flex",
					flexDirection: "column",
					flex: 1,
					minHeight: 0,
					height: "100%",
					overflow: "hidden",
				},
			}}
		>
			<Flex flexDirection="column" flexGrow={1} minHeight="0" height="100%">
				<Flex
					gap={1}
					alignItems="center"
					padding="12px 14px"
					sx={{
						borderBottom: "1px solid",
						borderColor: "divider",
						flexShrink: 0,
					}}
				>
					<TextField
						size="small"
						fullWidth
						placeholder="Поиск…"
						value={quickFilter}
						onChange={(e) => onQuickFilterChange(e.target.value)}
						sx={{
							"& .MuiInputBase-root": {
								height: 34,
								fontSize: 12.5,
							},
						}}
					/>
					{showCreateButton && onCreate ? (
						<Button
							onClick={onCreate}
							variant="contained"
							sx={{
								flexShrink: 0,
								textTransform: "none",
								height: 34,
								px: 1.5,
								whiteSpace: "nowrap",
							}}
						>
							Создать
						</Button>
					) : null}
				</Flex>
				<Typography
					variant="caption"
					color="text.secondary"
					sx={{ px: 1.75, py: 0.75, flexShrink: 0 }}
				>
					<b>{items.length}</b> справочников
				</Typography>
				<AgGridHost>
					<AgGridReact<V2DictionaryDto>
						ref={gridRef}
						theme={gridTheme}
						icons={agGridIconSet}
						rowData={items}
						columnDefs={columnDefs}
						defaultColDef={defaultColDef}
						localeText={AG_GRID_LOCALE_RU}
						getRowId={(p) => p.data.id}
						rowSelection={{ mode: "singleRow", enableClickSelection: true }}
						onSelectionChanged={handleSelectionChanged}
						sideBar={gridPersistence.sideBar}
						onGridReady={gridPersistence.onGridReady}
						onColumnMoved={(event) => gridPersistence.onColumnMoved(event.api)}
						onColumnVisible={(event) =>
							gridPersistence.onColumnVisible(event.api)
						}
						onColumnPinned={(event) =>
							gridPersistence.onColumnPinned(event.api)
						}
						onSortChanged={(event) => gridPersistence.onSortChanged(event.api)}
						onColumnResized={(event) => {
							if (event.finished) gridPersistence.onColumnResized(event.api);
						}}
						suppressCellFocus
						headerHeight={32}
						rowHeight={36}
						suppressCsvExport
						suppressExcelExport
					/>
				</AgGridHost>
			</Flex>
		</Card>
	);
}
