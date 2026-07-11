import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { styled, useColorScheme } from "@mui/material/styles";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { registerAgGridTableModules } from "@react-client/common/tableStuff/agGridTableModules";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "@react-client/theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";
import type { V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";
import {
	type ColDef,
	type ICellRendererParams,
	type RowClassParams,
	type RowClickedEvent,
	type SelectionChangedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ARCH_COMPONENT_DOT,
	archComponentShortLabel,
	typicalWorkSidebarDisplayLabel,
} from "./typicalWorksUi";

registerAgGridTableModules();

const AgGridHost = styled("div")`
	flex: 1 1 auto;
	min-height: 0;
	width: 100%;

	& > div {
		width: 100%;
		height: 100%;
	}
`;

type TypicalWorksSidebarGridProps = {
	works: V2TypicalWorkListItemDto[];
	selectedWorkId: string | null;
	onSelectWork: (workId: string) => void;
	onAssignFromCatalog: () => void;
	onDeleteWorks: (works: V2TypicalWorkListItemDto[]) => void;
	assignedCount: number;
	scopeSubtitle: string;
};

function archComponentCellRenderer(
	params: ICellRendererParams<V2TypicalWorkListItemDto>,
) {
	const type = params.data?.archComponentType ?? "";
	const dot = ARCH_COMPONENT_DOT[type] ?? "#94a3b8";
	return (
		<Box
			component="span"
			title={type}
			sx={{
				display: "inline-flex",
				alignItems: "center",
				gap: 0.6,
				minWidth: 0,
				overflow: "hidden",
			}}
		>
			<Box
				component="span"
				sx={{
					width: 8,
					height: 8,
					borderRadius: "2px",
					bgcolor: dot,
					flexShrink: 0,
				}}
			/>
			<Box
				component="span"
				sx={{
					fontSize: 10,
					fontWeight: 700,
					letterSpacing: "0.03em",
					color: "#8a93a3",
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
				}}
			>
				{archComponentShortLabel(type)}
			</Box>
		</Box>
	);
}

export function TypicalWorksSidebarGrid({
	works,
	selectedWorkId,
	onSelectWork,
	onAssignFromCatalog,
	onDeleteWorks,
	assignedCount,
	scopeSubtitle,
}: TypicalWorksSidebarGridProps) {
	const { mode } = useColorScheme();
	const gridRef = useRef<AgGridReact<V2TypicalWorkListItemDto>>(null);
	const [query, setQuery] = useState("");
	const [checkedWorks, setCheckedWorks] = useState<V2TypicalWorkListItemDto[]>(
		[],
	);

	const gridTheme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const displayLabels = useMemo(() => {
		const map = new Map<string, string>();
		for (const work of works) {
			map.set(work.id, typicalWorkSidebarDisplayLabel(work, works));
		}
		return map;
	}, [works]);

	const columnDefs = useMemo<ColDef<V2TypicalWorkListItemDto>[]>(
		() => [
			{
				colId: "archComponentType",
				headerName: "Тип",
				width: 118,
				minWidth: 96,
				maxWidth: 140,
				sortable: true,
				filter: false,
				cellRenderer: archComponentCellRenderer,
				valueGetter: (params) => params.data?.archComponentType ?? "",
			},
			{
				colId: "name",
				headerName: "Работа",
				flex: 1,
				minWidth: 120,
				sortable: true,
				filter: false,
				valueGetter: (params) =>
					params.data ? displayLabels.get(params.data.id) ?? params.data.name : "",
			},
		],
		[displayLabels],
	);

	const defaultColDef = useMemo<ColDef>(
		() => ({
			resizable: true,
			suppressHeaderMenuButton: true,
		}),
		[],
	);

	const getRowClass = useCallback(
		(params: RowClassParams<V2TypicalWorkListItemDto>) =>
			params.data?.id === selectedWorkId ? "typical-work-sidebar-row--active" : "",
		[selectedWorkId],
	);

	const onRowClicked = useCallback(
		(event: RowClickedEvent<V2TypicalWorkListItemDto>) => {
			if (!event.data?.id) return;
			onSelectWork(event.data.id);
		},
		[onSelectWork],
	);

	const onSelectionChanged = useCallback(
		(event: SelectionChangedEvent<V2TypicalWorkListItemDto>) => {
			setCheckedWorks(event.api.getSelectedRows());
		},
		[],
	);

	useEffect(() => {
		gridRef.current?.api?.setGridOption("quickFilterText", query.trim());
	}, [query]);

	useEffect(() => {
		const api = gridRef.current?.api;
		if (!api) return;
		setCheckedWorks(api.getSelectedRows());
	}, [works]);

	useEffect(() => {
		const api = gridRef.current?.api;
		if (!api) return;
		api.redrawRows();
		if (!selectedWorkId) return;
		api.forEachNode((node) => {
			if (node.data?.id === selectedWorkId) {
				api.ensureNodeVisible(node, "middle");
			}
		});
	}, [selectedWorkId, works]);

	const handleDeleteChecked = () => {
		if (!checkedWorks.length) return;
		onDeleteWorks(checkedWorks);
	};

	return (
		<Box
			sx={{
				width: "100%",
				height: "100%",
				flexShrink: 0,
				bgcolor: "#fff",
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
				minWidth: 0,
				"& .typical-work-sidebar-row--active": {
					backgroundColor: "#eef4ff !important",
				},
			}}
		>
			<Box
				sx={{
					px: 1.75,
					py: 1.4,
					borderBottom: "1px solid #eef0f4",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 1,
				}}
			>
				<Box minWidth={0}>
					<Typography
						sx={{ fontSize: 12.5, fontWeight: 700, color: "#1d2435" }}
					>
						Работы области
					</Typography>
					<Typography sx={{ fontSize: 10.5, color: "#8a93a3", mt: 0.25 }}>
						{assignedCount} назначено · {scopeSubtitle}
					</Typography>
				</Box>
				<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
					{checkedWorks.length > 0 ? (
						<Button
							size="small"
							color="error"
							variant="outlined"
							startIcon={<DeleteOutlineIcon />}
							onClick={handleDeleteChecked}
							sx={{
								textTransform: "none",
								minWidth: 0,
								px: 1,
								height: 27,
								fontSize: 11.5,
							}}
						>
							{checkedWorks.length}
						</Button>
					) : null}
					<Button
						onClick={onAssignFromCatalog}
						sx={{
							textTransform: "none",
							height: 27,
							px: 1.25,
							borderRadius: "7px",
							bgcolor: "#1c2333",
							color: "#fff",
							fontSize: 11.5,
							fontWeight: 600,
							minWidth: 0,
						}}
					>
						+
					</Button>
				</Box>
			</Box>

			<Box sx={{ px: 1.25, py: 1, borderBottom: "1px solid #eef0f4" }}>
				<TextField
					size="small"
					fullWidth
					placeholder="Поиск работ…"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					slotProps={{
						input: {
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon sx={{ fontSize: 18, color: "#8a93a3" }} />
								</InputAdornment>
							),
							sx: { fontSize: "0.8125rem" },
						},
					}}
				/>
			</Box>

			<AgGridHost sx={{ flex: 1, minHeight: 0, p: 0.5 }}>
				<AgGridReact<V2TypicalWorkListItemDto>
					ref={gridRef}
					theme={gridTheme}
					icons={agGridIconSet}
					localeText={AG_GRID_LOCALE_RU}
					rowData={works}
					columnDefs={columnDefs}
					defaultColDef={defaultColDef}
					getRowId={(params) => params.data.id}
					getRowClass={getRowClass}
					rowSelection={{
						mode: "multiRow",
						checkboxes: true,
						headerCheckbox: true,
						enableClickSelection: false,
					}}
					suppressCellFocus
					suppressRowClickSelection
					onRowClicked={onRowClicked}
					onSelectionChanged={onSelectionChanged}
				/>
			</AgGridHost>
		</Box>
	);
}
