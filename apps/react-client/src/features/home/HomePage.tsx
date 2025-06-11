import "ag-grid-enterprise";

import AddIcon from "@mui/icons-material/Add";
import CompareIcon from "@mui/icons-material/Compare";
import SaveIcon from "@mui/icons-material/Save";
import {
	SpeedDial,
	SpeedDialAction,
	SpeedDialIcon,
	styled,
	useColorScheme,
} from "@mui/material";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { useAllCalculations } from "@react-client/common/services/useCalculations";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { SearchInput } from "@react-client/features/navigation/organisms/SearchInput";
import { routes } from "@react-client/routing/routes";
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
import { useLocation, useNavigate, useSearchParams } from "react-router";

const themeQuartzDark = themeQuartz.withPart(colorSchemeDarkBlue);

ModuleRegistry.registerModules([AllEnterpriseModule]);

const rowData = [
	{
		record_id: 1,
		_: "Пример текста 846",
		col_: "Calc93025-v4",
		__: "12/04/2022",
		rfd: "RFD-884264106",
		__1: "Архив",
		__2: "Стрим B",
		__3: "Департамент X",
		__4: "Михайлова О.Н.",
		col__1: "Пример текста 952",
		__5: "model58086-v1",
		__6: "Михайлова О.Н.",
		__7: 359,
		_____: 54.8,
		col_01__: 4602,
		col_02__: 4737,
		col_03____: 2773,
		col_05____mvp: 4501,
		col_05__: 3693,
		aml_: 2998,
		col_05b__: 1598,
		col_07_____: 4416,
		col_09_____: 3178,
		aml__1: 1251,
	},
	{
		record_id: 1,
		_: "Пример текста 846",
		col_: "Calc93025-v4",
		__: "12/04/2022",
		rfd: "RFD-884264106",
		__1: "Архив",
		__2: "Стрим B",
		__3: "Департамент X",
		__4: "ихайлова О.Н.",
		col__1: "Пример текста 952",
		__5: "model58086-v1",
		__6: "айлова О.Н.",
		__7: 359,
		_____: 54.8,
		col_01__: 4602,
		col_02__: 4737,
		col_03____: 2773,
		col_05____mvp: 4501,
		col_05__: 3693,
		aml_: 2998,
		col_05b__: 1598,
		col_07_____: 4416,
		col_09_____: 3178,
		aml__1: 1251,
	},
	{
		record_id: 1,
		_: "Пример текста 846", // Название расчета
		col_: "Calc93025-v4", // Идентификатор
		__: "12/04/2022", // Дата создания расчета
		rfd: "RFD-884264106", // RFD
		__1: "Архив", // Статус расчета
		__2: "Стрим B", // Стрим исполнитель
		__3: "аментX", // Департамент Заказчика
		__4: "айлова О.Н.", // Фио заказчика
		col__1: "Пример текста 952",
		__5: "model58086-v1",
		__6: "ихайлова О.Н.",
		__7: 359,
		_____: 54.8,
		col_01__: 4602,
		col_02__: 4737,
		col_03____: 2773,
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
	const [params] = useSearchParams();
	const navigate = useNavigate();
	const location = useLocation();

	const { data, isLoading, error } = useAllCalculations();

	const isInDefaultCompareMode = params.get("isInCompareMode") === "true";

	const { setGridApi } = useGlobalSettingsStore();
	const [isInCompareMode, setIsInCompareMode] = useState(
		isInDefaultCompareMode,
	);

	useEffect(() => {
		setIsInCompareMode(isInDefaultCompareMode);
	}, [isInDefaultCompareMode]);

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
		navigate(routes.anketaCreate.rootPath);
	};

	const actions = [
		{
			icon: <AddIcon />,
			name: "Создать расчет",
			onClick: onCreateCalculation,
		},
		{ icon: <SaveIcon onClick={onExportExcel} />, name: "Выгрузить в Excel" },
		{
			icon: (
				<CompareIcon onClick={() => setIsInCompareMode(!isInCompareMode)} />
			),
			name: isInCompareMode ? "Отменить сравнение" : "Сравнить",
		},
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

	const rowClassRules = {
		// row style function
		"ag-row-is-odd": (params: any) => {
			return params?.rowIndex % 2 === 0;
		},
	};

	return (
		<>
			<Spacer height={6} />
			<Header>
				<SearchInput />
				{/* <DatePicker /> */}
			</Header>
			<Spacer height={12} />
			<GridWrapper>
				<AgGridReact
					rowClass="custom-row-class"
					rowClassRules={rowClassRules}
					rowSelection={isInCompareMode ? { mode: "multiRow" } : undefined}
					theme={
						mode === "light" || mode === undefined
							? themeQuartz
							: themeQuartzDark
					}
					onSelectionChanged={(e) => {
						const selectedRows = e.api.getSelectedNodes();
						if (selectedRows.length === 2) {
							navigate(
								routes.anketaCompare.rootPath +
									"?" +
									selectedRows
										.map((row, index) => `id${index + 1}=${row.data.record_id}`)
										.join("&"),
							);
						}
					}}
					rowData={rowData}
					columnDefs={columnDefs as any}
					defaultColDef={defaultColDef}
					sideBar={false}
					pagination={true}
					paginationPageSize={10}
					localeText={AG_GRID_LOCALE_RU}
					ref={gridRef}
					onGridReady={onGridReady}
					onRowClicked={
						isInCompareMode
							? undefined
							: (params) => {
									navigate(
										routes.anketaPreview.rootPath.replace(
											":id",
											params.data.record_id.toString(),
										),
									);
								}
					}
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
						onClick={action.onClick}
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
