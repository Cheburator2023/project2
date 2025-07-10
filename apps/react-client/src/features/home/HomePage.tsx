import AddIcon from "@mui/icons-material/Add";
import ReplayIcon from "@mui/icons-material/Replay";
import { IconButton, styled, Tooltip, useColorScheme } from "@mui/material";
import { useCalculationControllerFindAll } from "@react-client/common/api/generated/queries/calculation";
import { CalculationResponseDto } from "@react-client/common/api/generated/types";
import { Flex } from "@react-client/common/primitives/Flex";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { toast } from "@react-client/common/toasts";
import { CalculationPreviewCell } from "@react-client/features/home/molecules/CalculationPreviewCell";
import schema from "@react-client/features/jsonFormGenerator/schemas/calc_schema.json";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { SearchInput } from "@react-client/features/navigation/organisms/SearchInput";
import { routes } from "@react-client/routing/routes";
import { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";
// import { AllEnterpriseModule } from "ag-grid-enterprise";
import {
	AllCommunityModule,
	ColDef,
	colorSchemeDarkBlue,
	type GridApi,
	type GridReadyEvent,
	type IRowNode,
	ModuleRegistry,
	SizeColumnsToContentStrategy,
	themeQuartz,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { format } from "date-fns/esm";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

const themeQuartzDark = themeQuartz.withPart(colorSchemeDarkBlue);

ModuleRegistry.registerModules([AllCommunityModule]);

const _columnDefs: ColDef<any, any>[] = [
	{
		field: "UI_PREVIEW",
		headerName: "",
		pinned: "right",
		lockPinned: true,
		filter: false,
		sortable: false,
		suppressColumnsToolPanel: true,
		suppressFiltersToolPanel: true,
		suppressHeaderFilterButton: true,
		suppressFloatingFilterButton: true,
		suppressFillHandle: true,
		suppressAutoSize: true,
		suppressSizeToFit: true,
		suppressMovable: true,
		suppressHeaderMenuButton: true,
		width: 120,
		maxWidth: 120,
		minWidth: 120,
		cellRenderer: CalculationPreviewCell,
	},
	{ field: "id", headerName: "ID", sortable: true, filter: true },
	{
		field: "name",
		headerName: "Название анкеты",
		sortable: true,
		filter: true,
	},
	{
		field: "finalCoefficient",
		headerName: "Финальный коэффициент",
		sortable: true,
		filter: true,
	},
	{
		field: "createdAt",
		headerName: "Дата создания",
		sortable: true,
		filter: "agDateColumnFilter",
		cellDataType: "dateTime",
		valueFormatter: (params) => {
			const dt = new Date(params?.value.replace("Z", ""));
			return format(dt, "dd MMMM yyyy, HH:mm:ss, xxxxx");
		},
	},

	{ field: "questionnaireData.name", headerName: "Название анкеты" },
	{
		field: "questionnaireData.modelsCount",
		headerName: "Количество моделей",
	},
	{ field: "finalCoefficient", headerName: "Итоговый коэффициент" },
	{
		field: "questionnaireData.autoMlRequired",
		headerName: "Необходимость AutoML",
	},
	{
		field: "questionnaireData.dataSourcesCount",
		headerName: "Количество источников для проработки",
	},
	{
		field: "questionnaireData.readyPromReports",
		headerName: "Наличие готовых пром витрин",
	},
	{
		field: "questionnaireData.pilotModelRequired",
		headerName: "Необходимость реализации пилотной модели",
	},
	{
		field: "questionnaireData.pilotSupportRequired",
		headerName: "Необходимость поддержки проведения пилота",
	},
	{
		field: "questionnaireData.assessedInitiativesCount",
		headerName: "Количество оцениваемых инициатив",
	},
	{
		field: "questionnaireData.productionAdditionalReports",
		headerName:
			"Необходимость продуктивизации и количество дополнительных витрин",
	},
	{
		field: "generalUncertainty",
		headerName: "Общая неопределенность",
		valueGetter: (params) => {
			const UNCERTAINTY_TYPE_VALUES =
				schema.properties.generalUncertainty.items.properties.type.enum;
			const UNCERTAINTY_TYPE_VALUE_NAMES =
				schema.properties.generalUncertainty.items.properties.type.enumNames;

			const generalUncertaintyObj =
				params.data.questionnaireData?.generalUncertainty || {};

			const final_pretty_string = Object.keys(generalUncertaintyObj)
				.map((key) => {
					const index = UNCERTAINTY_TYPE_VALUES.indexOf(key);

					if (index !== -1) {
						const prettyName = UNCERTAINTY_TYPE_VALUE_NAMES[index];
						const rawValue = generalUncertaintyObj[key];

						let formattedValue: string;

						if (typeof rawValue === "object" && rawValue !== null) {
							formattedValue = Object.values(rawValue).join(", ");
						} else {
							formattedValue = rawValue;
						}

						return `${prettyName}: ${formattedValue}`;
					}

					return null;
				})
				.filter((item) => item !== null)
				.join(", ");

			return final_pretty_string;
		},
	},
	{
		field: "algorithmComplexity",
		headerName: "Сложность алгоритма / тип ML задачи",
		valueGetter: (params) => {
			const colId = params.column.getColId();
			const channels = params.data.questionnaireData?.[colId] || [];
			return channels
				.map((ch: any, index: any) => `${index + 1}. ${ch.algorithmType}`)
				.join(", ");
		},
	},
	{
		field: "productionDeploymentChannels",
		headerName: "Необходимость продуктивизации и каналы внедрения моделей",
		valueGetter: (params: any) => {
			const colId = params.column.getColId();

			const channels = params.data.questionnaireData?.[colId] || [];
			return channels
				.map((ch: any, index: any) => `${index + 1}. ${ch.deploymentChannel}`)
				.join(", ");
		},
	},
];

export const HomePage = () => {
	const { data, isLoading, error, refetch } = useCalculationControllerFindAll({
		query: {
			refetchInterval: 30000,
		},
	});

	return (
		<HomeTemplete
			data={data}
			error={error}
			isLoading={isLoading}
			refetch={refetch}
		/>
	);
};

export const HomeTemplete = ({
	data,
	error,
	isLoading,
	refetch,
}: {
	data: CalculationResponseDto[] | undefined;
	error: any;
	isLoading: boolean;
	refetch: (
		options?: RefetchOptions,
	) => Promise<QueryObserverResult<CalculationResponseDto[], void>>;
}) => {
	const [hoveredRowId, setHoveredRowId] = useState("");
	const { setGridApi } = useGlobalSettingsStore();
	const gridRef = useRef<AgGridReact>(null);
	const { mode } = useColorScheme();
	const [params] = useSearchParams();
	const isInDefaultCompareMode = params.get("isInCompareMode") === "true";
	const navigate = useNavigate();
	const _location = useLocation();
	const [_isInCompareMode, setIsInCompareMode] = useState(
		params.get("isInCompareMode") === "true",
	);
	const [_selectedRows, setSelectedRows] = useState<
		IRowNode<any>[] | undefined
	>([]);

	useEffect(() => {
		setIsInCompareMode(params.get("isInCompareMode") === "true");
	}, [params.get("isInCompareMode")]);

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

	if (error) {
		toast.error("Ошибка загрузки данных реестра анкет", {
			description: error.message,
			action: {
				label: "Закрыть",
				onClick: () => {},
			},
		});
	}

	useEffect(() => {
		setIsInCompareMode(isInDefaultCompareMode);
	}, [isInDefaultCompareMode]);

	const defaultColDef: ColDef<any, any> | undefined = {
		sortable: true,
		filter: true,
		resizable: true,
		lockPosition: true,
		wrapHeaderText: true,
		autoHeaderHeight: true,
		cellStyle: { fontSize: "11px" },
		headerStyle: { fontSize: "11px" },
		tooltipValueGetter: (params: any) => params.value,
		cellRendererParams: {
			hoveredRowId,
		},
	};

	const _onExportExcel = () => {
		if (gridRef.current?.api) {
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
		navigate(routes.calculationCreate.rootPath);
	};

	const onGridReady = (params: GridReadyEvent<any, any>) => {
		console.log("Grid is ready, setting API in Zustand store.");
		setGridApi(params.api as GridApi);
	};

	const autoSizeStrategy: SizeColumnsToContentStrategy = {
		type: "fitCellContents",
		skipHeader: false,
	};

	useEffect(() => {
		return () => {
			setGridApi(null);
		};
	}, []);

	const rowClassRules = {
		"ag-row-is-odd": (params: any) => {
			return params?.rowIndex % 2 === 0;
		},
	};

	const theme =
		mode === "light" || mode === undefined ? themeQuartz : themeQuartzDark;

	const onCellMouseOver = (params: any) => {
		setHoveredRowId(params?.node.id || "0");
	};

	return (
		<div data-test-id="home-page--div-0">
			<Header data-test-id="home-page--Header-0">
				<Flex
					width="fill-available"
					justifyContent="space-between"
					alignItems="center"
					data-test-id="home-page--Flex-0"
				>
					<Flex width="100%" maxWidth="550px" data-test-id="home-page--Flex-1">
						<SearchInput data-test-id="home-page--SearchInput-0" />
					</Flex>
					<Flex
						gap={6}
						alignItems="center"
						justifyContent="flex-end"
						data-test-id="home-page--Flex-2"
					>
						<Tooltip title="Создать расчет" data-test-id="home-page--Tooltip-0">
							<IconButton
								aria-label="menu"
								onClick={onCreateCalculation}
								data-test-id="home-page--IconButton-0"
							>
								<AddIcon data-test-id="home-page--AddIcon-1" />
							</IconButton>
						</Tooltip>
						<Tooltip title="Обновить реестр">
							<IconButton onClick={refetch as any}>
								<ReplayIcon />
							</IconButton>
						</Tooltip>
						{/* <Tooltip title="Сравнить" data-test-id="home-page--Tooltip-1">
							<IconButton
								disabled={selectedRows?.length !== 2}
								aria-label="menu"
								onClick={() => {
									return navigate(
										`${routes.calculationCompare.rootPath}?${selectedRows
											?.map((row, index) => `id${index + 1}=${row.data.id}`)
											.join("&")}`,
									);
								}}
								data-test-id="home-page--IconButton-1"
							>
								<CompareArrowsIcon data-test-id="home-page--CompareArrowsIcon-0" />
							</IconButton>
						</Tooltip> */}
						{/* <Tooltip
							title="Выгрузить в Excel"
							data-test-id="home-page--Tooltip-2"
						>
							<Button
								aria-label="menu"
								onClick={onExportExcel}
								variant="contained"
								data-test-id="home-page--Button-0"
							>
								Выгрузить
							</Button>
						</Tooltip> */}
					</Flex>
				</Flex>
			</Header>

			<GridWrapper
				width="100%"
				height="-webkit-fill-available"
				data-test-id="home-page--GridWrapper-0"
			>
				<AgGridReact
					rowClass="custom-row-class"
					rowClassRules={rowClassRules}
					rowSelection={{ mode: "multiRow" }}
					theme={theme}
					onSelectionChanged={(e) => {
						setSelectedRows(e.api.getSelectedNodes());
					}}
					rowData={data}
					loading={isLoading}
					columnDefs={columnDefs}
					defaultColDef={defaultColDef}
					sideBar={false}
					pagination={true}
					paginationPageSize={100}
					localeText={AG_GRID_LOCALE_RU}
					ref={gridRef}
					autoSizeStrategy={autoSizeStrategy}
					onCellMouseOver={onCellMouseOver}
					onGridReady={onGridReady}
					tooltipShowDelay={500}
					data-test-id="home-page--AgGridReact-0"
				/>
			</GridWrapper>
		</div>
	);
};

const GridWrapper = styled(Flex)`
	& > div {
		width: 100%;
	}

    & .ag-column-panel .ag-pivot-mode-panel {
        display: none;
    }

    & .ag-column-panel .ag-unselectable.ag-column-drop {
        display: none;
    }
`;
