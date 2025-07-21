import AddIcon from "@mui/icons-material/Add";
import ReplayIcon from "@mui/icons-material/Replay";
import { IconButton, styled, Tooltip, useColorScheme } from "@mui/material";
import { useCalculationControllerFindAll } from "@react-client/common/api/generated/queries/calculation";
import { CalculationResponseDto } from "@react-client/common/api/generated/types";
import { Flex } from "@react-client/common/primitives/Flex";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { toast } from "@react-client/common/toasts";
import { _columnDefs } from "@react-client/features/home/colDefs";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { SearchInput } from "@react-client/features/navigation/organisms/SearchInput";
import { routes } from "@react-client/routing/routes";
import { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";
// import { AllEnterpriseModule } from "ag-grid-enterprise";
import {
	AllCommunityModule,
	ClientSideRowModelModule,
	ColDef,
	colorSchemeDarkBlue,
	GetMainMenuItemsParams,
	type GridApi,
	type GridReadyEvent,
	type IRowNode,
	ModuleRegistry,
	NumberFilterModule,
	SizeColumnsToContentStrategy,
	themeQuartz,
	ValidationModule,
} from "ag-grid-community";
import {
	ColumnMenuModule,
	ColumnsToolPanelModule,
	ContextMenuModule,
	SetFilterModule,
} from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { agGridCustomQuartzTheme } from "../../../theme/agGridCustomTheme";

ModuleRegistry.registerModules([
	AllCommunityModule,
	ClientSideRowModelModule,
	ColumnsToolPanelModule,
	ColumnMenuModule,
	ContextMenuModule,
	SetFilterModule,
	NumberFilterModule,
	...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),
]);

const themeQuartzDark = agGridCustomQuartzTheme.withPart(colorSchemeDarkBlue);

// const IS_DEV = process.env.NODE_ENV !== "production";

export const HomePage = () => {
	const { data, isLoading, isFetching, error, refetch } =
		useCalculationControllerFindAll({
			query: {
				refetchInterval: 100000,
				staleTime: 10,
			},
		});

	return (
		<HomeTemplete
			data={data as any}
			error={error}
			isLoading={isLoading || isFetching}
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
	isLoading?: boolean;
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
		floatingFilter: true,
		cellStyle: { fontSize: "11px" },
		headerStyle: { fontSize: "11px" },
		tooltipValueGetter: (params: any) => params.value,
		cellRendererParams: {
			hoveredRowId,
		},
		mainMenuItems: (params: GetMainMenuItemsParams) => {
			return params.defaultItems.filter(
				(item) => item !== "columnChooser" && item !== "rowGroup",
			);
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
		refetch();

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
		mode === "light" || mode === undefined
			? agGridCustomQuartzTheme
			: themeQuartzDark;

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
						<div title="Создать расчет" data-test-id="home-page--Tooltip-0">
							<IconButton
								aria-label="menu"
								onClick={onCreateCalculation}
								data-test-id="home-page--IconButton-0"
							>
								<AddIcon data-test-id="home-page--AddIcon-1" />
							</IconButton>
						</div>
						<div title="Обновить реестр">
							<IconButton onClick={refetch as any}>
								<ReplayIcon />
							</IconButton>
						</div>
						{/* <div title="Сравнить" data-test-id="home-page--Tooltip-1">
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
						</div> */}
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
						</div> */}
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
					// rowSelection={{ mode: "multiRow" }}
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
					animateRows={false}
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
