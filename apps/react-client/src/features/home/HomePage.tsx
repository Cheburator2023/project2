import "ag-grid-enterprise";
import AddIcon from "@mui/icons-material/Add";
import CompareIcon from "@mui/icons-material/Compare";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import SaveIcon from "@mui/icons-material/Save";
import {
	Button,
	IconButton,
	Tooltip,
	styled,
	useColorScheme,
} from "@mui/material";
import { useCalculationControllerFindAll } from "@react-client/common/api/generated";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { useAuthStore } from "@react-client/common/store/authStore";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { SearchInput } from "@react-client/features/navigation/organisms/SearchInput";
import { routes } from "@react-client/routing/routes";
import {
	type GridApi,
	type GridReadyEvent,
	type IRowNode,
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

const _columnDefs = [
	{ headerName: "ID", field: "id", sortable: true, filter: true },
	{
		field: "name",
		headerName: "Имя",
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
		filter: true,
	},
];

export const HomePage = () => {
	const gridRef = useRef<AgGridReact>(null);
	const { mode } = useColorScheme();
	const [params] = useSearchParams();
	const navigate = useNavigate();
	const location = useLocation();
	const { accessToken } = useAuthStore();

	const { data, isLoading, error } = useCalculationControllerFindAll({
		query: {
			enabled: !!accessToken,
		},
	});

	const isInDefaultCompareMode = params.get("isInCompareMode") === "true";

	const { setGridApi } = useGlobalSettingsStore();
	const [isInCompareMode, setIsInCompareMode] = useState(
		isInDefaultCompareMode,
	);
	const [selectedRows, setSelectedRows] = useState<IRowNode<any>[] | undefined>(
		[],
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
		"ag-row-is-odd": (params: any) => {
			return params?.rowIndex % 2 === 0;
		},
	};

	if (error) {
		console.error("Error loading calculations:", error);
	}

	return (
		<div>
			<Spacer height={6} />
			<Header>
				<Flex
					width="fill-available"
					justifyContent="space-between"
					alignItems="center"
				>
					<Flex width="100%" maxWidth="550px">
						<SearchInput />
					</Flex>

					<Flex gap={6} alignItems="center" justifyContent="flex-end">
						<Tooltip title="Создать расчет">
							<IconButton aria-label="menu" onClick={onCreateCalculation}>
								<AddIcon />
							</IconButton>
						</Tooltip>

						<Tooltip title="Сравнить">
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
							>
								<CompareArrowsIcon />
							</IconButton>
						</Tooltip>

						<Tooltip title="Выгрузить в Excel">
							<Button
								aria-label="menu"
								onClick={onExportExcel}
								variant="contained"
							>
								Выгрузить в Excel
							</Button>
						</Tooltip>
					</Flex>
				</Flex>
			</Header>
			<Spacer height={12} />
			<GridWrapper width="100%" height="-webkit-fill-available">
				<AgGridReact
					rowClass="custom-row-class"
					rowClassRules={rowClassRules}
					rowSelection={{ mode: "multiRow" }}
					theme={
						mode === "light" || mode === undefined
							? themeQuartz
							: themeQuartzDark
					}
					onSelectionChanged={(e) => {
						setSelectedRows(e.api.getSelectedNodes());
					}}
					rowData={data}
					columnDefs={columnDefs as any}
					defaultColDef={defaultColDef}
					sideBar={false}
					pagination={true}
					paginationPageSize={10}
					localeText={AG_GRID_LOCALE_RU}
					ref={gridRef}
					onGridReady={onGridReady}
					onRowClicked={(params) => {
						navigate(
							routes.calculationPreview.rootPath.replace(
								":id",
								params.data.id.toString(),
							),
						);
					}}
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
