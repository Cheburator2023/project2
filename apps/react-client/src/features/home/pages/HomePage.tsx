import AddIcon from "@mui/icons-material/Add";
import ReplayIcon from "@mui/icons-material/Replay";
import { Button, IconButton, styled, useColorScheme } from "@mui/material";
import {
	useCalculationControllerFindAll,
	useCalculationControllerExportToExcel,
} from "@react-client/common/api/generated/queries/calculation";
import { CalculationResponseDto } from "@react-client/common/api/generated/types";
import { Flex } from "@react-client/common/primitives/Flex";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { toast } from "@react-client/common/toasts";
import { _columnDefs } from "@react-client/features/home/colDefs";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { SearchInput } from "@react-client/features/navigation/organisms/SearchInput";
import { routes } from "@react-client/routing/routes";
import { GridFilterModel } from "@react-client/types/agGridFilterModel";
import { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";

// import { AllEnterpriseModule } from "ag-grid-enterprise";
import {
	AllCommunityModule,
	ClientSideRowModelModule,
	ColDef,
	ColumnWidthCallbackParams,
	ExcelStyle,
	GetMainMenuItemsParams,
	GetContextMenuItemsParams,
	type GridApi,
	type GridReadyEvent,
	IDateFilterParams,
	INumberFilterParams,
	type IRowNode,
	ModuleRegistry,
	NumberFilterModule,
	SizeColumnsToContentStrategy,
	ValidationModule,
	ValueFormatterParams,
	RowDoubleClickedEvent,
} from "ag-grid-community";
import {
	ColumnMenuModule,
	ColumnsToolPanelModule,
	ContextMenuModule,
	ExcelExportModule,
	SetFilterModule,
} from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "../../../theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "../../../theme/ag-grid/agGridIconSet";

const excelStyles: ExcelStyle[] = [
	{
		id: "header",
		alignment: {
			vertical: "Center",
			wrapText: true,
		},
		font: {
			size: 16,
			family: "Arial",
			bold: true,
		},
		borders: {
			borderBottom: {
				color: "#000",
				lineStyle: "Continuous",
				weight: 1,
			},
		},
	},
	{
		id: "cell",
		alignment: {
			// wrapText: true,
		},
	},
];

ModuleRegistry.registerModules([
	AllCommunityModule,
	ClientSideRowModelModule,
	ColumnsToolPanelModule,
	ColumnMenuModule,
	ContextMenuModule,
	SetFilterModule,
	NumberFilterModule,
	ExcelExportModule,
	...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),
]);

const dateFilterParams: IDateFilterParams = {
	buttons: ["clear", "apply"],
	inRangeInclusive: true,
	maxNumConditions: 1,
	filterOptions: ["equals", "inRange"],
	closeOnApply: true,
	comparator: (filterLocalDateAtMidnight: Date, cellValue: string) => {
		if (cellValue == null) return -1;

		const cellDate = new Date(cellValue);

		if (
			cellDate.toLocaleDateString() ===
			filterLocalDateAtMidnight.toLocaleDateString()
		) {
			return 0;
		}
		if (cellDate < filterLocalDateAtMidnight) {
			return -1;
		}
		if (cellDate > filterLocalDateAtMidnight) {
			return 1;
		}
		return 0;
	},
	minValidYear: 2000,
	inRangeFloatingFilterDateFormat: " YYYY-MM-DD",
};

const numberFilterParams: INumberFilterParams = {
	buttons: ["clear", "apply"],
	maxNumConditions: 1,
	filterOptions: ["equals", "greaterThan", "lessThan"],
	closeOnApply: true,
};

const defaultExcelExportParams = {
	exportAsExcelTable: true,
};

// const IS_DEV = process.env.NODE_ENV !== "production";

// Number formatter function for floating point values
const numberFormatter = (params: ValueFormatterParams): string => {
	if (params.value == null || params.value === "") {
		return "";
	}

	const numValue = Number(params.value);

	// Check if it's a valid number and has decimal places
	if (!Number.isNaN(numValue) && numValue % 1 !== 0) {
		return numValue.toFixed(2);
	}

	// For integers or non-numeric values, return as is
	return params.value.toString();
};

export const HomePage = () => {
	const { data, isLoading, isFetching, error, refetch } =
		useCalculationControllerFindAll();

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
	const [hoveredRowId, _setHoveredRowId] = useState("");
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
	const [_currentFilterModel, setCurrentFilterModel] =
		useState<GridFilterModel | null>(null);

	const exportToExcelMutation = useCalculationControllerExportToExcel();

	useEffect(() => {
		setIsInCompareMode(params.get("isInCompareMode") === "true");
	}, [params.get("isInCompareMode")]);

	const [columnDefs] = useState(
		_columnDefs.map((col) => {
			return {
				...col,
				headerName: col.headerName,
				field: col.field,
				filterParams:
					col.cellDataType === "dateString"
						? dateFilterParams
						: col.cellDataType === "number"
							? numberFilterParams
							: { buttons: ["clear"] },

				filter:
					col.cellDataType === "dateString"
						? "agDateColumnFilter"
						: col.cellDataType === "number"
							? "agNumberColumnFilter"
							: "agSetColumnFilter",
				sortable: true,
				resizable: true,
				valueFormatter: numberFormatter, // Add number formatter to all columns
			};
		}),
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
		maxWidth: 1000,
		minWidth: 200,
		initialWidth: 300,
		cellStyle: { fontSize: "11px" },
		headerStyle: { fontSize: "11px" },
		tooltipValueGetter: (params: any) => params.value,
		valueFormatter: numberFormatter, // Add number formatter as default
		cellRendererParams: {
			hoveredRowId,
		},
		mainMenuItems: (params: GetMainMenuItemsParams) => {
			return params.defaultItems.filter(
				(item) => item !== "columnChooser" && item !== "rowGroup",
			);
		},
	};

	const calculateColumnWidth = (params: ColumnWidthCallbackParams) => {
		const columnId = params.column?.getColId();

		if (!columnId) return 300;

		let maxLength = params.column?.getColDef().headerName?.length || 0;

		data?.forEach((row: any) => {
			const value = row[columnId];
			if (value != null) {
				const stringValue = String(value);
				maxLength = Math.max(maxLength, stringValue.length);
			}
		});

		const charWidth = 8;
		const padding = 20;
		const minWidth = 100;
		const maxWidth = 1500;

		const calculatedWidth = Math.max(
			minWidth,
			Math.min(maxWidth, maxLength * charWidth + padding),
		);

		return calculatedWidth;
	};

	// AG Grid export solution
	const onExportExcel = () => {
		if (gridRef.current?.api) {
			gridRef.current.api.exportDataAsExcel({
				fileName: `расчеты_${new Date().toISOString().split("T")[0]}.xlsx`,
				fontSize: 14,
				columnWidth: calculateColumnWidth,
				sheetName: `Расчеты ${new Date().toISOString().split("T")[0]}`,
			});
		} else {
			console.error(
				"Grid API not available, or Excel export module not registered/licensed.",
			);
		}
	};

	const _onExportExcel = async () => {
		try {
			const filterModel = gridRef?.current?.api?.getFilterModel() || {};
			const selectedNodes = gridRef?.current?.api?.getSelectedNodes() || [];
			const selectedIds = selectedNodes
				.map((node) => node.data?.id)
				.filter(Boolean);

			const response = await exportToExcelMutation.mutateAsync({
				data: {
					filterModel:
						Object.keys(filterModel).length > 0
							? JSON.stringify(filterModel)
							: undefined,
					selectedIds: selectedIds.length > 0 ? selectedIds : undefined,
				},
			});

			const blob = new Blob([response], {
				type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			});

			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `расчеты_${new Date().toISOString().split("T")[0]}.xlsx`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);

			toast.success("Файл успешно экспортирован");
		} catch (error) {
			console.error("Ошибка экспорта:", error);
			toast.error("Ошибка при экспорте файла");
		}
	};

	// const gridFilterModel: GridFilterModel | null =
	// 	gridRef?.current?.api?.getFilterModel() || null;

	const onCreateCalculation = () => {
		console.log("Create calculation");
		navigate(routes.calculationCreate.rootPath);
	};

	const onRowDoubleClicked = (event: RowDoubleClickedEvent) => {
		const calculationId = event.data?.id;
		if (calculationId) {
			navigate(
				routes.calculationPreview.rootPath.replace(
					":id",
					calculationId.toString(),
				),
			);
		}
	};

	const getContextMenuItems = (params: GetContextMenuItemsParams) => {
		const calculationId = params.node?.data?.id;

		const customItems = [
			{
				name: "Просмотр анкеты",
				action: () => {
					if (calculationId) {
						navigate(
							routes.calculationPreview.rootPath.replace(
								":id",
								calculationId.toString(),
							),
						);
					}
				},
				icon: '<span class="ag-icon ag-icon-eye"></span>',
			},
		];

		return [...customItems];
	};

	const onGridReady = (params: GridReadyEvent<any, any>) => {
		console.log("Grid is ready, setting API in Zustand store.");
		setGridApi(params.api as GridApi);
	};

	const _onFilterChanged = () => {
		const filterModel = gridRef?.current?.api?.getFilterModel() || null;
		setCurrentFilterModel(filterModel);
		console.log("🐸 Pepe said >> фильтр изменен:", filterModel);
	};

	const _onClearColumnFilter = (columnId: string) => {
		if (gridRef?.current?.api) {
			gridRef.current.api.setColumnFilterModel(columnId, null);
			gridRef.current.api.onFilterChanged();
		}
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
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const icons = useMemo<{
		[key: string]: ((...args: any[]) => any) | string;
	}>(() => {
		return agGridIconSet;
	}, []);

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
						<div title="Создать анкету" data-test-id="home-page--Tooltip-0">
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
				<Button
					onClick={onExportExcel}
					variant="contained"
					fullWidth
					sx={{ maxWidth: "150px" }}
					disabled={exportToExcelMutation.isPending}
				>
					{exportToExcelMutation.isPending ? "Экспорт..." : "Экспорт в xlsx"}
				</Button>
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
					defaultExcelExportParams={defaultExcelExportParams}
					autoSizeStrategy={autoSizeStrategy}
					onGridReady={onGridReady}
					onRowDoubleClicked={onRowDoubleClicked}
					getContextMenuItems={getContextMenuItems}
					tooltipShowDelay={500}
					animateRows={false}
					icons={icons}
					excelStyles={excelStyles}
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
