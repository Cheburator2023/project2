import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { styled, useColorScheme } from "@mui/material/styles";
import { Flex } from "@react-client/common/primitives/Flex";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { useDeleteV2Dictionary, useV2Dictionaries } from "@react-client/common/api/queries/v2-templates";
import type { V2DictionaryDto } from "@smart-anketa/api-contract";
import {
	AllCommunityModule,
	ClientSideRowModelModule,
	type CellContextMenuEvent,
	type ColDef,
	ModuleRegistry,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useMemo, useRef, useState } from "react";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "../../../../theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "../../../../theme/ag-grid/agGridIconSet";

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

export const V2DictionaryList = () => {
	const { mode } = useColorScheme();
	const { data: dictionaries, isLoading } = useV2Dictionaries();
	const deleteDictionary = useDeleteV2Dictionary();
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

	const handleDeleteDictionary = useCallback(
		(id: string) => {
			deleteDictionary.mutate(id);
		},
		[deleteDictionary],
	);

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

	const columnDefs = useMemo<ColDef<V2DictionaryDto>[]>(
		() => [
			{ field: "code", headerName: "Код", flex: 1, minWidth: 120 },
			{ field: "name", headerName: "Название", flex: 1, minWidth: 160 },
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
			{
				field: "updatedAt",
				headerName: "Обновлено",
				minWidth: 170,
				valueFormatter: (p) => dateFmt(p.value),
			},
		],
		[],
	);

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
				onCellContextMenu={handleCellContextMenu}
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
				<MenuItem disabled>Редактировать</MenuItem>
				<MenuItem
					onClick={() => {
						if (menuState) handleDeleteDictionary(menuState.row.id);
						closeMenu();
					}}
				>
					Удалить
				</MenuItem>
			</Menu>
		</GridWrapper>
	);
};
