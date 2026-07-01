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
import {
	formulaBadgeLabel,
	triggerStatusLabel,
} from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/typicalWorksUi";
import type { V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";
import { type ColDef, type ICellRendererParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { pathForAdminV2TypicalWork } from "@react-client/routing/common/pathHelpers";

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

type V2TypicalWorkListPanelProps = {
	items: V2TypicalWorkListItemDto[];
	selectedId: string | null;
	quickFilter: string;
	onQuickFilterChange: (value: string) => void;
	onSelect: (id: string) => void;
	onCreate?: () => void;
	showCreateButton?: boolean;
};

function streamsCellRenderer(p: ICellRendererParams<V2TypicalWorkListItemDto>) {
	const streams = p.data?.streams ?? [];
	if (streams.length === 0) {
		return (
			<Chip size="small" label="не назначена" variant="outlined" sx={{ opacity: 0.7 }} />
		);
	}
	return (
		<Flex gap={0.5} wrap="wrap" alignItems="center">
			{streams.slice(0, 2).map((stream) => (
				<Chip key={stream} size="small" label={stream} variant="outlined" />
			))}
			{streams.length > 2 ? (
				<Typography variant="caption" color="text.secondary">
					+{streams.length - 2}
				</Typography>
			) : null}
		</Flex>
	);
}

function statusCellRenderer(p: ICellRendererParams<V2TypicalWorkListItemDto>) {
	const row = p.data;
	if (!row) return null;
	return (
		<Flex gap={0.5} wrap="wrap" alignItems="center">
			<Chip
				size="small"
				label={triggerStatusLabel(row.triggerStatus)}
				variant="outlined"
			/>
			{row.formulaBadge ? (
				<Chip
					size="small"
					label={formulaBadgeLabel(row.formulaBadge)}
					variant="outlined"
					color="info"
				/>
			) : null}
		</Flex>
	);
}

export function V2TypicalWorkListPanel({
	items,
	selectedId,
	quickFilter,
	onQuickFilterChange,
	onSelect,
	onCreate,
	showCreateButton = true,
}: V2TypicalWorkListPanelProps) {
	const navigate = useNavigate();
	const { mode } = useColorScheme();
	const gridRef = useRef<AgGridReact<V2TypicalWorkListItemDto>>(null);
	const gridPersistence = useAgGridColumnPersistence("v2.typical-works.panel");

	const gridTheme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const columnDefs = useMemo<ColDef<V2TypicalWorkListItemDto>[]>(
		() => [
			{ field: "name", headerName: "Название", flex: 1.4, minWidth: 140 },
			{
				field: "archComponentType",
				headerName: "Тип компонента",
				flex: 1.2,
				minWidth: 120,
			},
			{
				colId: "streams",
				headerName: "Стримы",
				flex: 1,
				minWidth: 120,
				sortable: false,
				filter: false,
				cellRenderer: streamsCellRenderer,
			},
			{
				field: "currentNorm",
				headerName: "Норма",
				width: 88,
				valueFormatter: (p) =>
					p.value == null ? "—" : String(p.value),
			},
			{
				colId: "status",
				headerName: "Статус",
				width: 150,
				sortable: false,
				filter: false,
				cellRenderer: statusCellRenderer,
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

	const onRowClicked = useCallback(
		(event: { data?: V2TypicalWorkListItemDto }) => {
			if (event.data?.id) onSelect(event.data.id);
		},
		[onSelect],
	);

	return (
		<Card height="100%" width="100%" padding="12px">
			<Flex flexDirection="column" height="100%" minHeight="0" gap={8}>
				<Flex alignItems="center" gap={8}>
					<TextField
						size="small"
						fullWidth
						placeholder="Поиск работ…"
						value={quickFilter}
						onChange={(e) => onQuickFilterChange(e.target.value)}
					/>
					{showCreateButton && onCreate ? (
						<Button size="small" variant="contained" onClick={onCreate}>
							Создать
						</Button>
					) : null}
				</Flex>
				<AgGridHost>
					<AgGridReact<V2TypicalWorkListItemDto>
						ref={gridRef}
						theme={gridTheme}
						icons={agGridIconSet}
						rowData={items}
						columnDefs={columnDefs}
						defaultColDef={defaultColDef}
						localeText={AG_GRID_LOCALE_RU}
						rowSelection={{ mode: "singleRow", checkboxes: false }}
						suppressCellFocus
						onRowClicked={onRowClicked}
						onRowDoubleClicked={(event) => {
							if (event.data?.id) navigate(pathForAdminV2TypicalWork(event.data.id));
						}}
						getRowId={(params) => params.data.id}
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
