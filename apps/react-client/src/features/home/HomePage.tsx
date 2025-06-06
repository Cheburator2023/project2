import "ag-grid-enterprise";

import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import {
	SpeedDial,
	SpeedDialAction,
	SpeedDialIcon,
	styled,
	useColorScheme,
} from "@mui/material";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import {
	GridApi,
	GridReadyEvent,
	ModuleRegistry,
	themeQuartz,
} from "ag-grid-community";
import { colorSchemeDarkBlue } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import { useEffect, useRef, useState } from "react";

const themeQuartzDark = themeQuartz.withPart(colorSchemeDarkBlue);

ModuleRegistry.registerModules([AllEnterpriseModule]);

const rowData = [
	{
		record_id: 1,
		_: "Пример текста 846", // Название расчета
		col_: "Calc93025-v4", // Идентификатор
		__: "12/04/2022", // Дата создания расчета
		rfd: "RFD-884264106", // RFD
		__1: "Архив", // Статус расчета
		__2: "Стрим B", // Стрим исполнитель
		__3: "Департамент X", // Департамент Заказчика
		__4: "Михайлова О.Н.", // Фио заказчика
		col__1: "Пример текста 952", // Комментарий
		__5: "model58086-v1", // Связанные модели
		__6: "Михайлова О.Н.", // Автор расчета
		__7: 359, // Итоговая оценка
		_____: 54.8, // % Отклонение итоговой оценки от средней
		col_01__: 4602, // 01. Постановка задачи.
		col_02__: 4737, // 02. Поиск данных.
		col_03____: 2773, // 03. Построение витрины для разработки.
		col_05____mvp: 4501, // 05А. Разработка пилотной модели (MVP)
		col_05__: 3693, // 05. Разработка модели.
		aml_: 2998, // AML Разработка.
		col_05b__: 1598, // 05B. Пилотирование модели.
		col_07_____: 4416, // 07. Разработка витрины для применения модели.
		col_09_____: 3178, // 09. Адаптация и внедре ние модели.
		aml__1: 1251, // AML Внедрение.
	},
	{
		record_id: 2,
		_: "Пример текста 697",
		col_: "Calc36812-v2",
		__: "25/05/2021",
		rfd: "RFD-168479713",
		__1: "Архив",
		__2: "Департамент X",
		__3: "Стрим B",
		__4: "Кузнецов Д.С.",
		col__1: "Пример текста 814",
		__5: "model18506-v3",
		__6: "Кузнецов Д.С.",
		__7: 493,
		_____: 54.04,
		col_01__: 2902,
		col_02__: 4476,
		col_03____: 96,
		col_05____mvp: 1969,
		col_05__: 1421,
		aml_: 894,
		col_05b__: 2583,
		col_07_____: 4849,
		col_09_____: 2898,
		aml__1: 1978,
	},
];

const _columnDefs = [
	{ headerName: "№", field: "record_id" },
	{ headerName: "Название расчета", field: "_" },
	{ headerName: "Идентификатор", field: "col_" },
	{ headerName: "Дата создания расчета", field: "__" },
	{ headerName: "RFD", field: "rfd" },
	{ headerName: "Статус расчета", field: "__1" },
	{ headerName: "Стрим исполнитель", field: "__2" },
	{ headerName: "Департамент Заказчика", field: "__3" },
	{ headerName: "Фио заказчика", field: "__4" },
	{ headerName: "Комментарий", field: "col__1" },
	{ headerName: "Связанные модели", field: "__5" },
	{ headerName: "Автор расчета", field: "__6" },
	{ headerName: "Итоговая оценка", field: "__7" },
	{ headerName: "% Отклонение итоговой оценки от средней", field: "_____" },
	{ headerName: "01. Постановка задачи.", field: "col_01__" },
	{ headerName: "02. Поиск данных.", field: "col_02__" },
	{ headerName: "03. Построение витрины для разработки.", field: "col_03____" },
	{
		headerName: "05А. Разработка пилотной модели (MVP)",
		field: "col_05____mvp",
	},
	{ headerName: "05. Разработка модели.", field: "col_05__" },
	{ headerName: "AML Разработка.", field: "aml_" },
	{ headerName: "05B. Пилотирование модели.", field: "col_05b__" },
	{
		headerName: "07. Разработка витрины для применения модели.",
		field: "col_07_____",
	},
	{ headerName: "09. Адаптация и внедре ние модели.", field: "col_09_____" },
	{ headerName: "AML Внедрение.", field: "aml__1" },
];

export const HomePage = () => {
	const gridRef = useRef<AgGridReact>(null);
	const { mode } = useColorScheme();
	const { setGridApi } = useGlobalSettingsStore();

	const [columnDefs] = useState(
		_columnDefs.map((col) => ({
			...col,
			headerName: col.headerName,
			field: col.field,
			sortable: true,
			filter: true,
			resizable: true,
		})),
	);

	const defaultColDef = {
		sortable: true,
		filter: true,
		resizable: true,
	};

	const onExportExcel = () => {
		if (gridRef.current && gridRef.current.api) {
			gridRef.current.api.exportDataAsExcel({
				fileName: "export_data.xlsx",
			});
		} else {
			console.error(
				"Grid API not available, or Excel export module not registered/licensed.",
			);
		}
	};

	const onCreateCalculation = () => {
		console.log("Create calculation");
	};

	const actions = [
		{ icon: <AddIcon onClick={onCreateCalculation} />, name: "Создать расчет" },
		{ icon: <SaveIcon onClick={onExportExcel} />, name: "Выгрузить в Excel" },
	];

	const onGridReady = (params: GridReadyEvent<any, any>) => {
		console.log("Grid is ready, setting API in Zustand store.");
		setGridApi(params.api as GridApi);
	};

	useEffect(() => {
		return () => {
			setGridApi(null);
		};
	}, []);

	return (
		<>
			<GridWrapper>
				<AgGridReact
					theme={
						mode === "light" || mode === undefined
							? themeQuartz
							: themeQuartzDark
					}
					rowData={rowData}
					columnDefs={columnDefs as any}
					defaultColDef={defaultColDef}
					sideBar={false}
					pagination={true}
					paginationPageSize={10}
					localeText={AG_GRID_LOCALE_RU}
					ref={gridRef}
					onGridReady={onGridReady}
				/>
			</GridWrapper>
			<SpeedDial
				ariaLabel="SpeedDial"
				sx={{ position: "absolute", bottom: 16, right: 16 }}
				icon={<SpeedDialIcon />}
			>
				{actions.map((action) => (
					<SpeedDialAction
						key={action.name}
						icon={action.icon}
						tooltipTitle={action.name}
					/>
				))}
			</SpeedDial>
		</>
	);
};

const GridWrapper = styled("div")`
    height: 90vh;
    width: 100%;

    & .ag-column-panel .ag-pivot-mode-panel {
        display: none;
    }

    & .ag-column-panel .ag-unselectable.ag-column-drop {
        display: none;
    }
`;
