import Chip from "@mui/material/Chip";
import { alpha, styled, useColorScheme, useTheme } from "@mui/material/styles";
import {
	useActivateV2TemplateVersionAsCurrent,
	useDeleteV2Template,
	useV2Templates,
} from "@react-client/common/api/queries/v2-templates";
import { apiClient } from "@react-client/common/api/helpers/apiClient";
import { Flex } from "@react-client/common/primitives/Flex";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import {
	pathForAdminV2Template,
	pathForAdminV2TemplateHistory,
} from "@react-client/routing/routes";
import type {
	V2TemplateDto,
	V2TemplateStatus,
	V2TemplateVersionDto,
} from "@smart-anketa/api-contract";
import {
	AllCommunityModule,
	ClientSideRowModelModule,
	type ColDef,
	type GetContextMenuItemsParams,
	type GridReadyEvent,
	type ICellRendererParams,
	type RowClassParams,
	type RowDoubleClickedEvent,
	type RowStyle,
	ModuleRegistry,
	ValidationModule,
} from "ag-grid-community";
import { ContextMenuModule, TreeDataModule } from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import { useQueries } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "../../../../theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "../../../../theme/ag-grid/agGridIconSet";

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

const VERSION_STATUS_RU: Record<V2TemplateStatus, string> = {
	draft: "Черновик",
	published: "Опубликована",
	archived: "Архив",
};

export type V2SchemaGridTemplateRow = V2TemplateDto & {
	rowKind: "template";
	displayLabel: string;
	children: V2SchemaGridVersionRow[];
};

export type V2SchemaGridVersionRow = V2TemplateVersionDto & {
	rowKind: "version";
	displayLabel: string;
	templateCurrentVersionId: string | null;
};

export type V2SchemaGridRow = V2SchemaGridTemplateRow | V2SchemaGridVersionRow;

const dateFmt = (v: unknown) =>
	v ? new Date(String(v)).toLocaleString("ru-RU") : "";

export const V2TemplateList = () => {
	const theme = useTheme();
	const { mode } = useColorScheme();
	const navigate = useNavigate();

	const gridTheme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const { data: templates, isLoading: templatesLoading } = useV2Templates();
	const deleteTemplate = useDeleteV2Template();
	const activateVersion = useActivateV2TemplateVersionAsCurrent();

	const gridRef = useRef<AgGridReact<V2SchemaGridRow>>(null);

	const versionQueries = useQueries({
		queries: (templates ?? []).map((t) => ({
			queryKey: ["v2-templates", t.id, "versions"],
			queryFn: () =>
				apiClient<V2TemplateVersionDto[]>({
					url: `/v2/templates/${t.id}/versions`,
					method: "GET",
				}),
			enabled: !!templates?.length,
			staleTime: 30_000,
		})),
	});

	const versionsLoading = versionQueries.some((q) => q.isLoading);

	const treeRowData = useMemo<V2SchemaGridTemplateRow[]>(() => {
		if (!templates?.length) return [];

		return templates.map((t, idx) => {
			const versions = versionQueries[idx]?.data ?? [];
			const sorted = [...versions].sort(
				(a, b) => b.versionNumber - a.versionNumber,
			);

			return {
				...t,
				rowKind: "template",
				displayLabel: t.name,
				children: sorted.map((v) => ({
					...v,
					rowKind: "version",
					templateCurrentVersionId: t.currentVersionId,
					displayLabel: `Версия ${v.versionNumber} (${VERSION_STATUS_RU[v.status]})`,
				})),
			};
		});
	}, [templates, versionQueries]);

	const openEditor = useCallback(
		(templateId: string) => {
			navigate(pathForAdminV2Template(templateId));
		},
		[navigate],
	);

	const handleDeleteTemplate = useCallback(
		(id: string) => {
			deleteTemplate.mutate(id);
		},
		[deleteTemplate],
	);

	const handleRowDoubleClicked = useCallback(
		(e: RowDoubleClickedEvent<V2SchemaGridRow>) => {
			const row = e.data;
			if (!row) return;
			const tid = row.rowKind === "template" ? row.id : row.templateId;
			openEditor(tid);
		},
		[openEditor],
	);

	const getRowStyle = useCallback(
		(params: RowClassParams<V2SchemaGridRow>): RowStyle | undefined => {
			const d = params.data;
			if (!d) return undefined;

			if (d.rowKind === "template" && d.currentVersionId) {
				const style: RowStyle = {
					boxShadow: `inset 3px 0 0 ${theme.palette.primary.main}`,
					backgroundColor: alpha(theme.palette.primary.main, 0.07),
				};
				return style;
			}

			if (
				d.rowKind === "version" &&
				d.templateCurrentVersionId &&
				d.id === d.templateCurrentVersionId
			) {
				const style: RowStyle = {
					backgroundColor: alpha(theme.palette.success.main, 0.16),
				};
				return style;
			}

			return undefined;
		},
		[theme.palette.primary.main, theme.palette.success.main],
	);

	const getContextMenuItems = useCallback(
		(params: GetContextMenuItemsParams<V2SchemaGridRow>) => {
			const row = params.node?.data;
			const defaults = params.defaultItems ?? [];

			if (!row) {
				return defaults;
			}

			if (row.rowKind === "template") {
				return [
					{
						name: "История изменений",
						action: () => navigate(pathForAdminV2TemplateHistory(row.id)),
						icon: '<span class="ag-icon ag-icon-menu"></span>',
					},
					{
						name: "Открыть редактор",
						action: () => openEditor(row.id),
					},
					"separator",
					{
						name: "Удалить шаблон",
						action: () => handleDeleteTemplate(row.id),
					},
					"separator",
					...defaults,
				] as any;
			}

			const isAlreadyCurrent =
				row.templateCurrentVersionId != null &&
				row.id === row.templateCurrentVersionId;

			return [
				{
					name: "Сделать актуальной",
					disabled: isAlreadyCurrent || activateVersion.isPending,
					action: () =>
						activateVersion.mutate({
							templateId: row.templateId,
							versionId: row.id,
						}),
					tooltip: isAlreadyCurrent ? "Эта версия уже является актуальной" : undefined,
				},
				{
					name: "Открыть редактор схемы",
					action: () => openEditor(row.templateId),
				},
				"separator",
				...defaults,
			] as any;
		},
		[
			navigate,
			openEditor,
			handleDeleteTemplate,
			activateVersion,
		],
	);

	const autoGroupColumnDef = useMemo<ColDef<V2SchemaGridRow>>(
		() => ({
			field: "displayLabel",
			headerName: "Схема / версия",
			flex: 1,
			minWidth: 260,
			sortable: false,
			filter: "agTextColumnFilter",
			floatingFilter: true,
		}),
		[],
	);

	const columnDefs = useMemo<ColDef<V2SchemaGridRow>[]>(
		() => [
			{
				colId: "actualChip",
				headerName: "Актуальный снимок",
				minWidth: 190,
				maxWidth: 220,
				sortable: false,
				filter: false,
				floatingFilter: false,
				cellRenderer: (p: ICellRendererParams<V2SchemaGridRow>) => {
					const d = p.data;
					if (!d || d.rowKind !== "template") return null;
					const cv = d.currentVersionId;
					if (!cv) {
						return (
							<Chip size="small" label="Не опубликовано" variant="outlined" />
						);
					}
					const num = d.children.find((c) => c.id === cv)?.versionNumber;
					return (
						<Chip
							size="small"
							color="success"
							variant="outlined"
							label={`Актуальная №${num ?? "?"}`}
						/>
					);
				},
			},
			{
				colId: "entityId",
				field: "id",
				headerName: "Идентификатор",
				flex: 1,
				minWidth: 260,
			},
			{
				field: "code",
				headerName: "Код",
				flex: 0.8,
				minWidth: 110,
				valueGetter: (p) =>
					p.data?.rowKind === "template" ? p.data.code : "",
			},
			{
				field: "description",
				headerName: "Описание",
				flex: 1.2,
				minWidth: 160,
				valueGetter: (p) =>
					p.data?.rowKind === "template" && p.data.description != null
						? String(p.data.description)
						: "",
			},
			{
				field: "streamCode",
				headerName: "Поток",
				minWidth: 100,
				valueGetter: (p) =>
					p.data?.rowKind === "template" && p.data.streamCode != null
						? String(p.data.streamCode)
						: "",
			},
			{
				colId: "versionNumber",
				headerName: "№ версии",
				minWidth: 100,
				valueGetter: (p) =>
					p.data?.rowKind === "version" ? p.data.versionNumber : "",
			},
			{
				colId: "versionStatus",
				headerName: "Статус версии",
				minWidth: 130,
				valueGetter: (p) =>
					p.data?.rowKind === "version"
						? VERSION_STATUS_RU[p.data.status]
						: "",
			},
			{
				colId: "publishedAt",
				headerName: "Опубликована",
				minWidth: 170,
				valueGetter: (p) =>
					p.data?.rowKind === "version" && p.data.publishedAt
						? dateFmt(p.data.publishedAt)
						: "",
			},
			{
				colId: "releaseNotes",
				headerName: "Комментарий к версии",
				flex: 1,
				minWidth: 160,
				valueGetter: (p) =>
					p.data?.rowKind === "version" && p.data.releaseNotes
						? String(p.data.releaseNotes)
						: "",
			},
			{
				field: "updatedAt",
				headerName: "Обновлено (шаблон)",
				minWidth: 170,
				valueGetter: (p) =>
					p.data?.rowKind === "template" ? dateFmt(p.data.updatedAt) : "",
			},
		],
		[],
	);

	const onGridReady = useCallback((e: GridReadyEvent<V2SchemaGridRow>) => {
		e.api.expandAll();
	}, []);

	const loadingCombined = templatesLoading || versionsLoading;

	return (
		<GridWrapper>
			<AgGridReact<V2SchemaGridRow>
				ref={gridRef}
				theme={gridTheme}
				icons={agGridIconSet}
				treeData
				treeDataChildrenField="children"
				getRowId={(p) =>
					p.data.rowKind === "template"
						? `tpl:${p.data.id}`
						: `ver:${p.data.id}`
				}
				rowData={treeRowData}
				columnDefs={columnDefs}
				autoGroupColumnDef={autoGroupColumnDef}
				defaultColDef={{
					sortable: true,
					filter: true,
					resizable: true,
					floatingFilter: true,
					minWidth: 100,
				}}
				getRowStyle={getRowStyle}
				getContextMenuItems={getContextMenuItems}
				onGridReady={onGridReady}
				loading={loadingCombined}
				pagination
				paginationPageSize={50}
				localeText={AG_GRID_LOCALE_RU}
				onRowDoubleClicked={handleRowDoubleClicked}
				suppressCsvExport
				suppressExcelExport
				paginationAutoPageSize={false}
				animateRows={false}
			/>
		</GridWrapper>
	);
};
