import Chip from "@mui/material/Chip";
import { alpha, styled, useColorScheme, useTheme } from "@mui/material/styles";
import {
	useActivateV2TemplateVersionAsCurrent,
	useBulkDeleteV2TemplateVersions,
	useDeleteV2Template,
	useRestoreV2Template,
	useRestoreV2TemplateVersions,
	useUpdateV2FactorySnapshotSetting,
	useV2TemplateRegistry,
} from "@react-client/common/api/queries/v2-templates";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { toast } from "@react-client/common/toasts";
import { toastWithUndo } from "@react-client/features/v2/admin/utils/v2UndoToast";
import { Flex } from "@react-client/common/primitives/Flex";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { getAgGridMainMenuItems } from "@react-client/common/tableStuff/agGridMainMenuItems";
import { registerAgGridTableModules } from "@react-client/common/tableStuff/agGridTableModules";
import { useAgGridColumnPersistence } from "@react-client/common/tableStuff/useAgGridColumnPersistence";
import {
	pathForAdminV2Template,
	pathForAdminV2TemplateHistory,
} from "@react-client/routing/common/pathHelpers";
import type {
	V2FactorySnapshotSettingDto,
	V2TemplateDto,
	V2TemplateStatus,
	V2TemplateVersionSummaryDto,
} from "@smart-anketa/api-contract";
import {
	type ColDef,
	type GetContextMenuItemsParams,
	type GridReadyEvent,
	type ICellRendererParams,
	type RowClassParams,
	type RowDoubleClickedEvent,
	type RowStyle,
	type SelectionChangedEvent,
	ModuleRegistry,
	ValidationModule,
} from "ag-grid-community";
import { ContextMenuModule, TreeDataModule } from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import {
	forwardRef,
	useCallback,
	useImperativeHandle,
	useMemo,
	useRef,
} from "react";
import { useNavigate } from "react-router";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "@react-client/theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";

registerAgGridTableModules();
ModuleRegistry.registerModules([
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

export type V2SchemaGridVersionRow = V2TemplateVersionSummaryDto & {
	rowKind: "version";
	displayLabel: string;
	templateCurrentVersionId: string | null;
};

export type V2SchemaGridRow = V2SchemaGridTemplateRow | V2SchemaGridVersionRow;

export function isV2SchemaRowSelectable(
	row: V2SchemaGridRow | undefined,
	systemCurrentVersionId: string | null,
): boolean {
	if (!row) return false;
	if (
		row.rowKind === "version" &&
		systemCurrentVersionId != null &&
		row.id === systemCurrentVersionId
	) {
		return false;
	}
	return true;
}

export function splitSelectedSchemaRows(rows: V2SchemaGridRow[]): {
	templates: V2SchemaGridTemplateRow[];
	versionsWithoutSelectedTemplate: V2SchemaGridVersionRow[];
} {
	const templates = rows.filter(
		(r): r is V2SchemaGridTemplateRow => r.rowKind === "template",
	);
	const selectedTemplateIds = new Set(templates.map((t) => t.id));
	const versionsWithoutSelectedTemplate = rows.filter(
		(r): r is V2SchemaGridVersionRow =>
			r.rowKind === "version" && !selectedTemplateIds.has(r.templateId),
	);
	return { templates, versionsWithoutSelectedTemplate };
}

type V2TemplateListProps = {
	onSelectionChange?: (rows: V2SchemaGridRow[]) => void;
	factorySnapshot?: V2FactorySnapshotSettingDto | null;
};

export type V2TemplateListHandle = {
	clearSelection: () => void;
};

const dateFmt = (v: unknown) =>
	v ? new Date(String(v)).toLocaleString("ru-RU") : "";

export const V2TemplateList = forwardRef<
	V2TemplateListHandle,
	V2TemplateListProps
>(function V2TemplateList({ onSelectionChange, factorySnapshot }, ref) {
	const theme = useTheme();
	const { mode } = useColorScheme();
	const navigate = useNavigate();

	const gridTheme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const { data: registry, isLoading: registryLoading } =
		useV2TemplateRegistry();
	const templates = registry?.items;
	const deleteTemplate = useDeleteV2Template();
	const restoreTemplate = useRestoreV2Template();
	const bulkDeleteVersions = useBulkDeleteV2TemplateVersions();
	const restoreVersions = useRestoreV2TemplateVersions();
	const activateVersion = useActivateV2TemplateVersionAsCurrent();
	const setFactorySnapshot = useUpdateV2FactorySnapshotSetting();

	const systemCurrentVersionId = useMemo(() => {
		const holder = templates?.find((t) => t.currentVersionId);
		return holder?.currentVersionId ?? null;
	}, [templates]);

	const gridRef = useRef<AgGridReact<V2SchemaGridRow>>(null);
	const gridPersistence = useAgGridColumnPersistence("v2.templates");

	useImperativeHandle(ref, () => ({
		clearSelection: () => {
			gridRef.current?.api?.deselectAll();
		},
	}));

	const treeRowData = useMemo<V2SchemaGridTemplateRow[]>(() => {
		if (!templates?.length) return [];

		return templates.map((t) => {
			const { versions, ...template } = t;
			const sorted = [...versions].sort(
				(a, b) => b.versionNumber - a.versionNumber,
			);

			return {
				...template,
				rowKind: "template",
				displayLabel: template.name,
				children: sorted.map((v) => ({
					...v,
					rowKind: "version",
					templateCurrentVersionId: t.currentVersionId,
					displayLabel: `Версия ${v.versionNumber} (${VERSION_STATUS_RU[v.status]})`,
				})),
			};
		});
	}, [templates]);

	const openEditor = useCallback(
		(templateId: string, versionId?: string | null) => {
			navigate(pathForAdminV2Template(templateId, versionId));
		},
		[navigate],
	);

	const handleDeleteTemplate = useCallback(
		(row: V2SchemaGridTemplateRow) => {
			if (row.currentVersionId) {
				toast.error(
					"Нельзя удалить шаблон с актуальной схемой системы. Сначала назначьте актуальной другую версию.",
				);
				return;
			}

			deleteTemplate.mutate(row.id, {
				onSuccess: (snapshot) => {
					const versionCount = snapshot.versions.length;
					toastWithUndo(
						`Шаблон «${row.name}» удалён`,
						async () => {
							await restoreTemplate.mutateAsync(snapshot);
							toast.success("Удаление шаблона отменено");
						},
						versionCount > 0
							? { description: `Вместе с ${versionCount} версиями` }
							: undefined,
					);
				},
				onError: (error) => {
					toast.error("Не удалось удалить шаблон", {
						description: apiErrorMessage(error),
					});
				},
			});
		},
		[deleteTemplate, restoreTemplate],
	);

	const handleBulkDeleteVersions = useCallback(
		(templateId: string, templateName: string) => {
			bulkDeleteVersions.mutate(
				{ templateId },
				{
					onSuccess: (result) => {
						const n = result.deletedVersionIds.length;
						if (n === 0) {
							toast.info(
								"Нет версий для удаления — актуальная схема системы не затрагивается",
							);
							return;
						}

						const extraNotes: string[] = [];
						if (result.reboundQuestionnaireCount > 0) {
							extraNotes.push(
								`перепривязано анкет: ${result.reboundQuestionnaireCount}`,
							);
						}
						if (result.deletedQuestionnaireCount > 0) {
							extraNotes.push(
								`удалено анкет: ${result.deletedQuestionnaireCount}`,
							);
						}

						toastWithUndo(
							`У шаблона «${templateName}» удалено версий: ${n}`,
							async () => {
								await restoreVersions.mutateAsync({
									templateId,
									versions: result.snapshot,
								});
								toast.success("Удаление версий отменено");
							},
							extraNotes.length
								? { description: extraNotes.join(", ") }
								: undefined,
						);
					},
					onError: (error) => {
						toast.error("Не удалось удалить версии", {
							description: apiErrorMessage(error),
						});
					},
				},
			);
		},
		[bulkDeleteVersions, restoreVersions],
	);

	const handleDeleteVersion = useCallback(
		(row: V2SchemaGridVersionRow) => {
			if (systemCurrentVersionId != null && row.id === systemCurrentVersionId) {
				toast.error(
					"Нельзя удалить версию — она является актуальной схемой системы",
				);
				return;
			}

			bulkDeleteVersions.mutate(
				{ templateId: row.templateId, versionIds: [row.id] },
				{
					onSuccess: (result) => {
						if (result.deletedVersionIds.length === 0) {
							toast.info("Версия не удалена");
							return;
						}

						toastWithUndo(`Версия ${row.versionNumber} удалена`, async () => {
							await restoreVersions.mutateAsync({
								templateId: row.templateId,
								versions: result.snapshot,
							});
							toast.success("Удаление версии отменено");
						});
					},
					onError: (error) => {
						toast.error("Не удалось удалить версию", {
							description: apiErrorMessage(error),
						});
					},
				},
			);
		},
		[bulkDeleteVersions, restoreVersions, systemCurrentVersionId],
	);

	const handleRowDoubleClicked = useCallback(
		(e: RowDoubleClickedEvent<V2SchemaGridRow>) => {
			const row = e.data;
			if (!row || row.rowKind !== "version") return;
			openEditor(row.templateId, row.id);
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

	const assignFactoryEtalon = useCallback(
		(templateId: string, versionId: string, label: string) => {
			if (
				!window.confirm(
					`Назначить заводским эталоном «${label}»?\nНовые схемы и сброс будут копировать эту версию (включая типовые работы).`,
				)
			) {
				return;
			}
			setFactorySnapshot.mutate(
				{
					source: "template",
					templateId,
					versionId,
				},
				{
					onSuccess: () => toast.success("Заводской эталон обновлён"),
					onError: (err) =>
						toast.error("Не удалось назначить эталон", {
							description: apiErrorMessage(err),
						}),
				},
			);
		},
		[setFactorySnapshot],
	);

	const getContextMenuItems = useCallback(
		(params: GetContextMenuItemsParams<V2SchemaGridRow>) => {
			const row = params.node?.data;
			const defaults = params.defaultItems ?? [];

			if (!row) {
				return defaults;
			}

			if (row.rowKind === "template") {
				const etalonVersionId = row.currentVersionId ?? row.children[0]?.id;
				return [
					{
						name: "История изменений",
						action: () => navigate(pathForAdminV2TemplateHistory(row.id)),
						icon: '<span class="ag-icon ag-icon-menu"></span>',
					},
					{
						name: "Назначить заводским эталоном",
						disabled: !etalonVersionId || setFactorySnapshot.isPending,
						action: () => {
							if (!etalonVersionId) return;
							const versionNum =
								row.children.find((c) => c.id === etalonVersionId)
									?.versionNumber ?? "?";
							assignFactoryEtalon(
								row.id,
								etalonVersionId,
								`${row.name} · v${versionNum}`,
							);
						},
						tooltip: etalonVersionId
							? "Эталон для «Заводская схема» и сброса; копируются схема и типовые работы"
							: "Нет версии для назначения эталоном",
					},
					"separator",
					{
						name: "Удалить все версии (кроме актуальной)",
						disabled: bulkDeleteVersions.isPending,
						action: () => handleBulkDeleteVersions(row.id, row.name),
					},
					{
						name: "Удалить шаблон",
						disabled: deleteTemplate.isPending,
						action: () => handleDeleteTemplate(row),
					},
					...defaults,
				] as any;
			}

			const isSystemCurrent =
				systemCurrentVersionId != null && row.id === systemCurrentVersionId;

			return [
				{
					name: "Сделать актуальной для системы",
					disabled: isSystemCurrent || activateVersion.isPending,
					action: () =>
						activateVersion.mutate(
							{
								templateId: row.templateId,
								versionId: row.id,
							},
							{
								onSuccess: () => {
									toast.success(
										`Версия ${row.versionNumber} — актуальная схема системы`,
									);
								},
								onError: (error) => {
									toast.error("Не удалось сделать версию актуальной", {
										description: apiErrorMessage(error),
									});
								},
							},
						),
					tooltip: isSystemCurrent
						? "Эта версия уже является актуальной схемой системы"
						: "Станет единственной актуальной схемой; у других шаблонов снимется актуальность",
				},
				{
					name: "Открыть редактор схемы",
					action: () => openEditor(row.templateId, row.id),
				},
				{
					name: "Назначить заводским эталоном",
					disabled: setFactorySnapshot.isPending,
					action: () =>
						assignFactoryEtalon(
							row.templateId,
							row.id,
							`${row.displayLabel || `v${row.versionNumber}`}`,
						),
					tooltip:
						"Эталон для «Заводская схема» и сброса; копируются схема и типовые работы",
				},
				"separator",
				{
					name: "Удалить версию",
					disabled: isSystemCurrent || bulkDeleteVersions.isPending,
					action: () => handleDeleteVersion(row),
					tooltip: isSystemCurrent
						? "Актуальная схема системы не может быть удалена"
						: undefined,
				},
				...defaults,
			] as any;
		},
		[
			navigate,
			openEditor,
			handleDeleteTemplate,
			handleBulkDeleteVersions,
			handleDeleteVersion,
			activateVersion,
			assignFactoryEtalon,
			setFactorySnapshot.isPending,
			bulkDeleteVersions.isPending,
			deleteTemplate.isPending,
			systemCurrentVersionId,
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
				field: "createdAt",
				headerName: "Создано",
				minWidth: 170,
				valueGetter: (p) =>
					p.data?.rowKind === "template" ? dateFmt(p.data.createdAt) : "",
			},
			{
				colId: "actualChip",
				headerName: "Актуальная схема",
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
							label={`Актуальная (система) №${num ?? "?"}`}
						/>
					);
				},
			},
			{
				colId: "factoryChip",
				headerName: "Заводской эталон",
				minWidth: 150,
				maxWidth: 180,
				sortable: false,
				filter: false,
				floatingFilter: false,
				cellRenderer: (p: ICellRendererParams<V2SchemaGridRow>) => {
					if (!factorySnapshot || factorySnapshot.source !== "template") {
						return null;
					}
					const d = p.data;
					if (!d) return null;
					if (
						d.rowKind === "version" &&
						factorySnapshot.versionId &&
						d.id === factorySnapshot.versionId
					) {
						return (
							<Chip
								size="small"
								color="info"
								variant="outlined"
								label="Эталон"
							/>
						);
					}
					if (
						d.rowKind === "template" &&
						d.id === factorySnapshot.templateId &&
						!factorySnapshot.versionId
					) {
						return (
							<Chip
								size="small"
								color="info"
								variant="outlined"
								label="Эталон"
							/>
						);
					}
					return null;
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
				valueGetter: (p) => (p.data?.rowKind === "template" ? p.data.code : ""),
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
				headerName: "Стрим",
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
					p.data?.rowKind === "version" ? VERSION_STATUS_RU[p.data.status] : "",
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
		[factorySnapshot],
	);

	const onGridReady = useCallback(
		(e: GridReadyEvent<V2SchemaGridRow>) => {
			gridPersistence.onGridReady(e);
			e.api.expandAll();
		},
		[gridPersistence],
	);

	const loadingCombined = registryLoading;

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
					mainMenuItems: getAgGridMainMenuItems,
				}}
				getRowStyle={getRowStyle}
				getContextMenuItems={getContextMenuItems}
				onGridReady={onGridReady}
				sideBar={gridPersistence.sideBar}
				onColumnMoved={(event) => gridPersistence.onColumnMoved(event.api)}
				onColumnVisible={(event) => gridPersistence.onColumnVisible(event.api)}
				onColumnPinned={(event) => gridPersistence.onColumnPinned(event.api)}
				onSortChanged={(event) => gridPersistence.onSortChanged(event.api)}
				onColumnResized={(event) => {
					if (event.finished) gridPersistence.onColumnResized(event.api);
				}}
				loading={loadingCombined}
				pagination
				paginationPageSize={50}
				localeText={AG_GRID_LOCALE_RU}
				onRowDoubleClicked={handleRowDoubleClicked}
				isRowSelectable={(node) =>
					isV2SchemaRowSelectable(node.data, systemCurrentVersionId)
				}
				rowSelection={{
					mode: "multiRow",
					checkboxes: true,
					headerCheckbox: true,
					enableClickSelection: false,
				}}
				onSelectionChanged={(e: SelectionChangedEvent<V2SchemaGridRow>) => {
					onSelectionChange?.(e.api.getSelectedRows());
				}}
				suppressCsvExport
				suppressExcelExport
				paginationAutoPageSize={false}
				animateRows={false}
			/>
		</GridWrapper>
	);
});
