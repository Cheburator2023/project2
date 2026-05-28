import AddIcon from "@mui/icons-material/Add";
import { Button, Chip, styled, useColorScheme } from "@mui/material";
import { useV2Questionnaires } from "@react-client/common/api/queries/v2-questionnaires";
import { Flex } from "@react-client/common/primitives/Flex";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { v2Routes } from "@react-client/routing/version/v2/routes";
import type {
	V2QuestionnaireDto,
	V2SchemaBindingStatus,
} from "@smart-anketa/api-contract";
import {
	AllCommunityModule,
	ClientSideRowModelModule,
	type ColDef,
	type GetContextMenuItemsParams,
	type GridReadyEvent,
	type ICellRendererParams,
	type MenuItemDef,
	type RowDoubleClickedEvent,
	ModuleRegistry,
	ValidationModule,
} from "ag-grid-community";
import { ContextMenuModule, TreeDataModule } from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import {useCallback, useEffect, useMemo, useRef} from "react";
import { useNavigate } from "react-router";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "@react-client/theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";

ModuleRegistry.registerModules([
	AllCommunityModule,
	ClientSideRowModelModule,
	TreeDataModule,
	ContextMenuModule,
	...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),
]);

const GridWrapper = styled(Flex)`
	width: 100%;
	height: -webkit-fill-available;

	& > div {
		width: 100%;
		min-height: 360px;
		height: -webkit-fill-available;
	}
`;

const BINDING_LABEL: Record<V2SchemaBindingStatus, string> = {
	aligned: "Схема актуальна",
	superseded: "Схема устарела",
	unavailable: "Схема недоступна",
};

const BINDING_COLOR: Record<
	V2SchemaBindingStatus,
	"success" | "warning" | "error"
> = {
	aligned: "success",
	superseded: "warning",
	unavailable: "error",
};

export type V2QuestionnaireSeriesRow = {
	rowKind: "series";
	seriesId: string;
	displayLabel: string;
	calcName: string;
	children: V2QuestionnaireVersionRow[];
};

export type V2QuestionnaireVersionRow = V2QuestionnaireDto & {
	rowKind: "version";
	displayLabel: string;
};

export type V2QuestionnaireGridRow =
	| V2QuestionnaireSeriesRow
	| V2QuestionnaireVersionRow;

const dateFmt = (v: unknown) =>
	v ? new Date(String(v)).toLocaleString("ru-RU") : "";

function BindingChip({ status }: { status: V2SchemaBindingStatus }) {
	return (
		<Chip
			size="small"
			label={BINDING_LABEL[status]}
			color={BINDING_COLOR[status]}
			variant="outlined"
		/>
	);
}

export function V2QuestionnaireList() {
	const { mode } = useColorScheme();
	const navigate = useNavigate();
	const gridRef = useRef<AgGridReact<V2QuestionnaireGridRow>>(null);

	const gridTheme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const { data: questionnaires, isLoading } = useV2Questionnaires();

	const treeRowData = useMemo<V2QuestionnaireSeriesRow[]>(() => {
		if (!questionnaires?.length) return [];

		const bySeries = new Map<string, V2QuestionnaireDto[]>();
		for (const q of questionnaires) {
			const list = bySeries.get(q.seriesId) ?? [];
			list.push(q);
			bySeries.set(q.seriesId, list);
		}

		const buffer = [...bySeries.entries()].map(([seriesId, versions]) => {
			const sorted = [...versions].sort(
				(a, b) =>
					Number.parseInt(b.version, 10) - Number.parseInt(a.version, 10),
			);
			const children = sorted.map((v) => ({
				...v,
				rowKind: "version" as const,
				displayLabel: `Версия ${v.version}${v.readableId ? ` · ${v.readableId}` : ""}`,
			}))

			const head = sorted[0];
			return [
				{
					rowKind: "series" as const,
					seriesId,
					displayLabel: head?.calcName ?? seriesId,
					calcName: head?.calcName ?? seriesId,
				},
				...children
			];
		});

		return buffer.flat()
	}, [questionnaires]);

	const columnDefs = useMemo<ColDef<V2QuestionnaireGridRow>[]>(
		() => [
			{
				field: "displayLabel",
				headerName: "Анкета / версия",
				flex: 2,
				minWidth: 220,
				cellRenderer: (p: ICellRendererParams<V2QuestionnaireGridRow>) =>
					p.data?.displayLabel ?? "",
			},
			{
				colId: "readableId",
				headerName: "Код",
				width: 160,
				valueGetter: (p) =>
					p.data?.rowKind === "version" ? p.data.readableId : "",
			},
			{
				colId: "schemaBinding",
				headerName: "Схема",
				width: 180,
				cellRenderer: (p: ICellRendererParams<V2QuestionnaireGridRow>) => {
					if (p.data?.rowKind !== "version") return null;
					return <BindingChip status={p.data.schemaBinding.status} />;
				},
			},
			{
				colId: "templateName",
				headerName: "Шаблон схемы",
				flex: 1,
				minWidth: 140,
				valueGetter: (p) =>
					p.data?.rowKind === "version" ? p.data.templateName : "",
			},
			{
				colId: "boundVersion",
				headerName: "Версия схемы",
				width: 110,
				valueGetter: (p) =>
					p.data?.rowKind === "version"
						? p.data.schemaBinding.boundTemplateVersionNumber
						: "",
			},
			{
				colId: "author",
				headerName: "Автор",
				width: 140,
				valueGetter: (p) =>
					p.data?.rowKind === "version" ? p.data.author : "",
			},
			{
				colId: "createdAt",
				headerName: "Создана",
				width: 160,
				valueFormatter: (p) => dateFmt(p.value),
				valueGetter: (p) =>
					p.data?.rowKind === "version" ? p.data.createdAt : "",
			},
		],
		[],
	);

	const onRowDoubleClicked = useCallback(
		(e: RowDoubleClickedEvent<V2QuestionnaireGridRow>) => {
			const row = e.data;
			if (!row || row.rowKind !== "version") return;
			navigate(
				`/v2/${v2Routes.calculationPreview.rootPath.replace(":id", row.id)}`,
			);
		},
		[navigate],
	);

	const onGridReady = useCallback((e: GridReadyEvent) => {
		e.api.sizeColumnsToFit();
	}, []);

	const getContextMenuItems = useCallback(
		(
			params: GetContextMenuItemsParams<V2QuestionnaireGridRow>,
		): MenuItemDef[] => {
			const row = params.node?.data;
			if (!row || row.rowKind !== "version") {
				return [];
			}
			return [
				{
					name: "Открыть",
					action: () =>
						navigate(
							`/v2/${v2Routes.calculationPreview.rootPath.replace(":id", row.id)}`,
						),
				},
				{
					name: "Новая версия анкеты",
					action: () =>
						navigate(
							`/v2/${v2Routes.calculationNewVersion.rootPath.replace(":id", row.id)}`,
						),
				},
			];
		},
		[navigate],
	);

	return (
		<div>
			<Header>
				<Button
					variant="contained"
					size="small"
					startIcon={<AddIcon />}
					onClick={() => navigate(`/v2/${v2Routes.calculationCreate.rootPath}`)}
				>
					Создать анкету
				</Button>
			</Header>
			<GridWrapper flexGrow={1} minHeight="0" sx={{ p: 0 }}>
				<AgGridReact<V2QuestionnaireGridRow>
					ref={gridRef}
					theme={gridTheme}
					icons={agGridIconSet}
					localeText={AG_GRID_LOCALE_RU}
					rowData={treeRowData}
					columnDefs={columnDefs}
					treeData
					getDataPath={(row) =>
						row.rowKind === "series" ? [row.seriesId] : [row.seriesId, row.id]
					}
					autoGroupColumnDef={{
						headerName: "Серия",
						minWidth: 200,
						cellRendererParams: { suppressCount: true },
					}}
					groupDefaultExpanded={1}
					defaultColDef={{ sortable: true, resizable: true }}
					onRowDoubleClicked={onRowDoubleClicked}
					getContextMenuItems={getContextMenuItems}
					onGridReady={onGridReady}
					loading={isLoading}
					domLayout="normal"
				/>
			</GridWrapper>
		</div>
	);
}
