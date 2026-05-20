import Chip from "@mui/material/Chip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { styled, useColorScheme } from "@mui/material/styles";
import { Flex } from "@react-client/common/primitives/Flex";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { useV2Dictionaries } from "@react-client/common/api/queries/v2-templates";
import type { V2DictionaryDto } from "@smart-anketa/api-contract";
import {
	AllCommunityModule,
	ClientSideRowModelModule,
	type CellContextMenuEvent,
	type ColDef,
	type ICellRendererParams,
	type SelectionChangedEvent,
	ModuleRegistry,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { pathForAdminV2Dictionary } from "@react-client/routing/routes";
import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "@react-client/theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";

ModuleRegistry.registerModules([AllCommunityModule, ClientSideRowModelModule]);

const GridWrapper = styled(Flex)`
	width: 100%;
	height: -webkit-fill-available;

	& > div {
		width: 100%;
		min-height: 360px;
		height: -webkit-fill-available;
	}
`;

const dateFmt = (v: unknown) =>
	v ? new Date(String(v)).toLocaleString("ru-RU") : "";

export const canDeleteV2Dictionary = (row: V2DictionaryDto) =>
	!row.isDefault && !row.isInUse;

export const canResetV2Dictionary = (row: V2DictionaryDto) => Boolean(row.isDefault);

type Props = {
	onSelectionChange?: (rows: V2DictionaryDto[]) => void;
	onDeleteRequest?: (rows: V2DictionaryDto[]) => void;
	onResetRequest?: (rows: V2DictionaryDto[]) => void;
};

export const V2DictionaryList = ({
	onSelectionChange,
	onDeleteRequest,
	onResetRequest,
}: Props) => {
	const navigate = useNavigate();
	const { mode } = useColorScheme();
	const { data: dictionaries, isLoading } = useV2Dictionaries();
	const gridRef = useRef<AgGridReact<V2DictionaryDto>>(null);

	const [menuState, setMenuState] = useState<{
		mouseX: number;
		mouseY: number;
		row: V2DictionaryDto;
	} | null>(null);

	const gridTheme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const closeMenu = useCallback(() => setMenuState(null), []);

	const handleCellContextMenu = useCallback(
		(event: CellContextMenuEvent<V2DictionaryDto>) => {
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
		[],
	);

	const flagsCell = useCallback((p: ICellRendererParams<V2DictionaryDto>) => {
		const row = p.data;
		if (!row) return null;
		return (
			<Flex gap={0.5} wrap="wrap" alignItems="center">
				{row.isDefault ? (
					<Chip size="small" label="Заводской" variant="outlined" color="info" />
				) : null}
				{row.isInUse ? (
					<Chip size="small" label="В схемах" variant="outlined" color="warning" />
				) : null}
			</Flex>
		);
	}, []);

	const columnDefs = useMemo<ColDef<V2DictionaryDto>[]>(
		() => [
			{ field: "code", headerName: "Код", flex: 1, minWidth: 140 },
			{ field: "name", headerName: "Название", flex: 1.2, minWidth: 160 },
			{
				colId: "flags",
				headerName: "Статус",
				width: 180,
				sortable: false,
				filter: false,
				cellRenderer: flagsCell,
			},
			{
				field: "description",
				headerName: "Описание",
				flex: 1.5,
				minWidth: 180,
				valueFormatter: (p) => (p.value == null ? "" : String(p.value)),
			},
			{
				field: "createdAt",
				headerName: "Создано",
				minWidth: 170,
				valueFormatter: (p) => dateFmt(p.value),
			},
		],
		[flagsCell],
	);

	const menuRow = menuState?.row;
	const menuCanDelete = menuRow ? canDeleteV2Dictionary(menuRow) : false;
	const menuCanReset = menuRow ? canResetV2Dictionary(menuRow) : false;

	return (
		<GridWrapper>
			<AgGridReact<V2DictionaryDto>
				ref={gridRef}
				theme={gridTheme}
				icons={agGridIconSet}
				rowData={dictionaries ?? []}
				columnDefs={columnDefs}
				defaultColDef={{
					sortable: true,
					filter: true,
					resizable: true,
					floatingFilter: true,
					minWidth: 100,
				}}
				loading={isLoading}
				pagination
				localeText={AG_GRID_LOCALE_RU}
				rowSelection={{
					mode: "multiRow",
					checkboxes: true,
					headerCheckbox: true,
					enableClickSelection: false,
				}}
				onSelectionChanged={(e: SelectionChangedEvent<V2DictionaryDto>) => {
					onSelectionChange?.(e.api.getSelectedRows());
				}}
				onCellContextMenu={handleCellContextMenu}
				onRowDoubleClicked={(e) => {
					if (e.data?.id) navigate(pathForAdminV2Dictionary(e.data.id));
				}}
				suppressCsvExport
				suppressExcelExport
				preventDefaultOnContextMenu
			/>
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
				<MenuItem
					onClick={() => {
						if (menuState) navigate(pathForAdminV2Dictionary(menuState.row.id));
						closeMenu();
					}}
				>
					Открыть
				</MenuItem>
				{onResetRequest ? (
					<MenuItem
						disabled={!menuCanReset}
						onClick={() => {
							if (menuState && menuCanReset) {
								onResetRequest([menuState.row]);
								closeMenu();
							}
						}}
					>
						Сбросить к заводским значениям
					</MenuItem>
				) : null}
				{onDeleteRequest ? (
					<MenuItem
						disabled={!menuCanDelete}
						onClick={() => {
							if (menuState && menuCanDelete) {
								onDeleteRequest([menuState.row]);
								closeMenu();
							}
						}}
					>
						Удалить
					</MenuItem>
				) : null}
			</Menu>
		</GridWrapper>
	);
};
