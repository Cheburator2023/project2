import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { styled, useColorScheme } from "@mui/material/styles";
import { usePatchV2TypicalWork } from "@react-client/common/api/queries/v2-works";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { getAgGridMainMenuItems } from "@react-client/common/tableStuff/agGridMainMenuItems";
import { registerAgGridTableModules } from "@react-client/common/tableStuff/agGridTableModules";
import {
	AG_GRID_SCHEMA_GROUP_AUTO_COLUMN,
	readAgGridSchemaGroupLabel,
} from "@react-client/common/tableStuff/agGridSchemaGrouping";
import { useAgGridColumnPersistence } from "@react-client/common/tableStuff/useAgGridColumnPersistence";
import { toast } from "@react-client/common/toasts";
import { WORK_ARCH_COMPONENT_TYPES } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/typicalWorkPatchErrors";
import { resolveEffectiveWorkArchComponentType } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/schemaWorkParameters";
import { DEFAULT_WORK_STREAMS } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/typicalWorksUi";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "@react-client/theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";
import type { V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";
import {
	type CellValueChangedEvent,
	type ColDef,
	type ICellRendererParams,
	type RowClassParams,
	type RowClickedEvent,
	type SelectionChangedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
	onCheckedWorksChange?: (works: V2TypicalWorkListItemDto[]) => void;
	onCreate?: () => void;
	showCreateButton?: boolean;
};

function streamsCellRenderer(p: ICellRendererParams<V2TypicalWorkListItemDto>) {
	const streams = p.data?.streams ?? [];
	if (streams.length === 0) {
		return (
			<Typography variant="caption" color="text.disabled">
				не назначена
			</Typography>
		);
	}
	return (
		<Flex gap={6} wrap="wrap" alignItems="center" height="100%">
			{streams.slice(0, 2).map((stream) => (
				<Chip
					key={stream}
					size="small"
					label={stream}
					variant="outlined"
					sx={{ opacity: 0.75, fontSize: 11 }}
				/>
			))}
			{streams.length > 2 ? (
				<Typography variant="caption" color="text.disabled">
					+{streams.length - 2}
				</Typography>
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
	onCheckedWorksChange,
	onCreate,
	showCreateButton = true,
}: V2TypicalWorkListPanelProps) {
	const navigate = useNavigate();
	const { mode } = useColorScheme();
	const gridRef = useRef<AgGridReact<V2TypicalWorkListItemDto>>(null);
	const gridPersistence = useAgGridColumnPersistence("v2.typical-works.panel");
	const patch = usePatchV2TypicalWork();
	const patchRef = useRef(patch);
	patchRef.current = patch;
	const [checkedWorks, setCheckedWorks] = useState<V2TypicalWorkListItemDto[]>(
		[],
	);
	const onCheckedWorksChangeRef = useRef(onCheckedWorksChange);
	onCheckedWorksChangeRef.current = onCheckedWorksChange;

	const gridTheme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const archComponentValues = useMemo(
		() => WORK_ARCH_COMPONENT_TYPES.map((type) => type),
		[],
	);

	const columnDefs = useMemo<ColDef<V2TypicalWorkListItemDto>[]>(
		() => [
			{
				colId: "schemaGroup",
				rowGroup: true,
				hide: true,
				valueGetter: (params) =>
					readAgGridSchemaGroupLabel(params.data?.templateName),
			},
			{
				field: "name",
				headerName: "Название",
				flex: 1.6,
				minWidth: 260,
				editable: true,
				cellEditor: "agTextCellEditor",
			},
			{
				field: "archComponentType",
				headerName: "Тип компонента",
				flex: 1.2,
				minWidth: 140,
				editable: true,
				cellEditor: "agSelectCellEditor",
				cellEditorParams: { values: archComponentValues },
				valueFormatter: (p) =>
					resolveEffectiveWorkArchComponentType(String(p.value ?? "")),
			},
			{
				field: "workType",
				headerName: "Тип работы",
				flex: 0.9,
				minWidth: 100,
				valueFormatter: (p) => (p.value ? String(p.value) : "—"),
			},
			{
				colId: "streams",
				headerName: "Стримы",
				flex: 1,
				minWidth: 220,
				sortable: false,
				filter: false,
				cellRenderer: streamsCellRenderer,
			},
		],
		[archComponentValues],
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

	const onCellValueChanged = useCallback(
		async (event: CellValueChangedEvent<V2TypicalWorkListItemDto>) => {
			const work = event.data;
			const field = event.colDef.field;
			if (!work || (field !== "name" && field !== "archComponentType")) return;
			if (event.newValue === event.oldValue) return;

			const patchStream = work.streams[0] ?? DEFAULT_WORK_STREAMS[0];
			const dto: {
				streamExecutor: string;
				name?: string;
				archComponentType?: string;
			} = { streamExecutor: patchStream };

			if (field === "name") {
				const trimmed = String(event.newValue ?? "").trim();
				if (!trimmed) {
					toast.error("Укажите название работы");
					event.node.setDataValue("name", event.oldValue);
					return;
				}
				dto.name = trimmed;
			} else {
				dto.archComponentType = String(event.newValue ?? "");
			}

			try {
				await patchRef.current.mutateAsync({ workId: work.id, dto });
			} catch (error) {
				event.node.setDataValue(field, event.oldValue);
				toast.error("Не удалось сохранить работу", {
					description: apiErrorMessage(error),
				});
			}
		},
		[],
	);

	useEffect(() => {
		gridRef.current?.api?.setGridOption("quickFilterText", quickFilter);
	}, [quickFilter]);

	useEffect(() => {
		const api = gridRef.current?.api;
		if (!api) return;
		const selected = api.getSelectedRows();
		setCheckedWorks(selected);
		onCheckedWorksChangeRef.current?.(selected);
	}, [items]);

	const getRowClass = useCallback(
		(params: RowClassParams<V2TypicalWorkListItemDto>) =>
			!params.node.group && params.data?.id === selectedId
				? "v2-typical-work-list-row--active"
				: "",
		[selectedId],
	);

	const onSelectionChanged = useCallback(
		(event: SelectionChangedEvent<V2TypicalWorkListItemDto>) => {
			const selected = event.api.getSelectedRows();
			setCheckedWorks(selected);
			onCheckedWorksChangeRef.current?.(selected);
		},
		[],
	);

	useEffect(() => {
		const api = gridRef.current?.api;
		if (!api) return;
		api.redrawRows();
		if (!selectedId) return;
		api.forEachNode((node) => {
			if (node.data?.id === selectedId) {
				api.ensureNodeVisible(node, "middle");
			}
		});
	}, [selectedId, items]);

	const onRowClicked = useCallback(
		(event: RowClickedEvent<V2TypicalWorkListItemDto>) => {
			if (event.node.group || !event.data?.id) return;
			onSelect(event.data.id);
		},
		[onSelect],
	);

	return (
		<Card
			height="100%"
			width="100%"
			padding="12px"
			sx={{
				"& .v2-typical-work-list-row--active": {
					backgroundColor: "action.selected",
				},
			}}
		>
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
				<Typography variant="caption" color="text.secondary">
					{checkedWorks.length > 0
						? `Выбрано для удаления: ${checkedWorks.length}. `
						: null}
					Название и тип компонента редактируются по клику в ячейке
				</Typography>
				<AgGridHost>
					<AgGridReact<V2TypicalWorkListItemDto>
						ref={gridRef}
						theme={gridTheme}
						icons={agGridIconSet}
						rowData={items}
						columnDefs={columnDefs}
						defaultColDef={defaultColDef}
						autoGroupColumnDef={autoGroupColumnDef}
						groupDefaultExpanded={-1}
						groupDisplayType="singleColumn"
						isRowSelectable={(node) => !node.group}
						localeText={AG_GRID_LOCALE_RU}
						rowSelection={{
							mode: "multiRow",
							checkboxes: true,
							headerCheckbox: true,
							enableClickSelection: false,
						}}
						suppressRowClickSelection
						singleClickEdit
						stopEditingWhenCellsLoseFocus
						suppressCellFocus
						getRowClass={getRowClass}
						onRowClicked={onRowClicked}
						onSelectionChanged={onSelectionChanged}
						onRowDoubleClicked={(event) => {
							if (event.data?.id)
								navigate(pathForAdminV2TypicalWork(event.data.id));
						}}
						onCellValueChanged={onCellValueChanged}
						getRowId={(params) => params.data.id}
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
					/>
				</AgGridHost>
			</Flex>
		</Card>
	);
}
