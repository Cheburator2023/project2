import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha, styled, useColorScheme, useTheme } from "@mui/material/styles";
import {
	useActivateV2TemplateVersionAsCurrent,
	useResetV2TemplateToDefault,
	useV2Audit,
	useV2Template,
} from "@react-client/common/api/queries/v2-templates";
import { Flex } from "@react-client/common/primitives/Flex";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { auditActionRu } from "@react-client/features/admin/V2Admin/utils/auditActionRu";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { routes } from "@react-client/routing/routes";
import type {
	V2TemplateAuditAction,
	V2TemplateAuditDto,
} from "@smart-anketa/api-contract";
import {
	AllCommunityModule,
	ClientSideRowModelModule,
	type ColDef,
	type GetContextMenuItemsParams,
	type RowClassParams,
	ModuleRegistry,
} from "ag-grid-community";
import { ContextMenuModule } from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "../../../theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "../../../theme/ag-grid/agGridIconSet";

ModuleRegistry.registerModules([
	AllCommunityModule,
	ClientSideRowModelModule,
	ContextMenuModule,
]);

const GridWrapper = styled(Flex)`
	& > div {
		width: 100%;
		min-height: 420px;
	}
`;

export function AdminV2TemplateHistoryPage() {
	const theme = useTheme();
	const { mode } = useColorScheme();
	const { templateId = "" } = useParams<{ templateId: string }>();
	const navigate = useNavigate();

	const gridTheme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const { data: template } = useV2Template(templateId);
	const { data = [], isLoading, error } = useV2Audit(templateId, undefined);
	const resetMutation = useResetV2TemplateToDefault();
	const activateVersion = useActivateV2TemplateVersionAsCurrent();

	const gridRef = useRef<AgGridReact<V2TemplateAuditDto>>(null);
	const [confirmOpen, setConfirmOpen] = useState(false);

	const getRowStyle = useCallback(
		(params: RowClassParams<V2TemplateAuditDto>) => {
			const d = params.data;
			if (!d?.versionId || !d.templateCurrentVersionId) {
				return undefined;
			}
			if (d.versionId !== d.templateCurrentVersionId) {
				return undefined;
			}
			return {
				backgroundColor: alpha(
					theme.palette.primary.main,
					theme.palette.mode === "dark" ? 0.22 : 0.14,
				),
			};
		},
		[theme.palette.primary.main, theme.palette.mode],
	);

	const getContextMenuItems = useCallback(
		(params: GetContextMenuItemsParams<V2TemplateAuditDto>) => {
			const row = params.node?.data;
			const defaults = params.defaultItems ?? [];

			if (!row?.versionId || !templateId) {
				return defaults;
			}

			const isAlreadyCurrent =
				row.templateCurrentVersionId != null &&
				row.versionId === row.templateCurrentVersionId;

			return [
				{
					name: "Сделать эту версию актуальной",
					disabled: isAlreadyCurrent || activateVersion.isPending,
					action: () =>
						activateVersion.mutate({
							templateId,
							versionId: row.versionId as string,
						}),
					tooltip: isAlreadyCurrent ? "Уже актуальная версия" : undefined,
				},
				"separator",
				...defaults,
			] as any;
		},
		[templateId, activateVersion],
	);

	const columnDefs: ColDef<V2TemplateAuditDto>[] = useMemo(
		() => [
			{
				colId: "isActualVersion",
				headerName: "Актуальная версия",
				minWidth: 140,
				sortable: false,
				filter: false,
				floatingFilter: false,
				valueGetter: (p) => {
					const d = p.data;
					if (!d?.versionId || !d.templateCurrentVersionId) {
						return "";
					}
					return d.versionId === d.templateCurrentVersionId ? "Да" : "";
				},
			},
			{
				field: "versionNumber",
				headerName: "№ версии",
				minWidth: 100,
				valueFormatter: (p) =>
					p.value == null || p.value === undefined ? "—" : String(p.value),
			},
			{
				field: "createdAt",
				headerName: "Время",
				minWidth: 180,
				valueFormatter: (p) =>
					p.value ? new Date(String(p.value)).toLocaleString("ru-RU") : "",
			},
			{
				field: "action",
				headerName: "Действие",
				minWidth: 220,
				valueFormatter: (p) =>
					p.value ? auditActionRu(p.value as V2TemplateAuditAction) : "",
			},
			{
				field: "versionId",
				headerName: "Идентификатор версии",
				flex: 1,
				minWidth: 200,
				valueFormatter: (p) =>
					p.value == null || p.value === "" ? "—" : String(p.value),
			},
			{
				field: "createdBy",
				headerName: "Пользователь",
				minWidth: 140,
				valueFormatter: (p) =>
					p.value == null || p.value === "" ? "—" : String(p.value),
			},
			{
				colId: "payload",
				headerName: "Payload",
				flex: 1.5,
				minWidth: 240,
				valueGetter: (p) =>
					p.data?.payload === null || p.data?.payload === undefined
						? ""
						: JSON.stringify(p.data.payload),
			},
		],
		[],
	);

	return (
		<Flex flexDirection="column" flexGrow={1} minHeight="0">
			<Header
				leadingAccessory={
					<Flex gap={1} alignItems="center" wrap="wrap" minWidth="0">
						<Tooltip title="Назад к списку схем">
							<IconButton
								onClick={() => navigate(routes.adminV2Schemas.rootPath)}
								aria-label="Назад к списку схем"
								size="small"
							>
								<ArrowBackIcon />
							</IconButton>
						</Tooltip>
						<Typography variant="subtitle2" component="span" fontWeight={600} noWrap>
							История: {template?.name ?? (templateId || "…")}
						</Typography>
					</Flex>
				}
			>
				<Button
					variant="contained"
					color="warning"
					disabled={!templateId || resetMutation.isPending}
					onClick={() => setConfirmOpen(true)}
				>
					Сбросить к заводской схеме
				</Button>
			</Header>

			{resetMutation.isError ? (
				<Typography color="error" variant="body2" sx={{ pb: 1 }}>
					{resetMutation.error?.message ?? "Не удалось выполнить сброс"}
				</Typography>
			) : null}

			{error ? (
				<Typography color="error" variant="body2" sx={{ pb: 1 }}>
					Не удалось загрузить историю сохранений
				</Typography>
			) : null}

			<Typography variant="body2" color="text.secondary" sx={{ pb: 1 }}>
				Подсветка — записи по версии, которая сейчас активна. Для строк с версией в
				контекстном меню можно выбрать «Сделать эту версию актуальной».
			</Typography>

			<GridWrapper flexDirection="column" flexGrow={1} minHeight="0">
				<Box sx={{ flex: 1, minHeight: 420 }}>
					<AgGridReact<V2TemplateAuditDto>
						ref={gridRef}
						theme={gridTheme}
						icons={agGridIconSet}
						rowData={data}
						columnDefs={columnDefs}
						defaultColDef={{
							sortable: true,
							filter: true,
							resizable: true,
							floatingFilter: true,
							minWidth: 120,
						}}
						getRowStyle={getRowStyle}
						getContextMenuItems={getContextMenuItems}
						loading={isLoading}
						pagination
						paginationPageSize={50}
						localeText={AG_GRID_LOCALE_RU}
						suppressCsvExport
						suppressExcelExport
						preventDefaultOnContextMenu
					/>
				</Box>
			</GridWrapper>

			<Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
				<DialogTitle>Сброс к заводской схеме</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Будет создана и опубликована новая версия шаблона «
						{template?.name ?? "…"}» с встроенным эталоном. Текущая опубликованная
						версия будет заменена.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmOpen(false)}>Отмена</Button>
					<Button
						onClick={() => {
							if (!templateId) return;
							resetMutation.mutate(templateId, {
								onSuccess: () => setConfirmOpen(false),
							});
						}}
						color="warning"
						variant="contained"
						disabled={resetMutation.isPending}
					>
						Сбросить
					</Button>
				</DialogActions>
			</Dialog>
		</Flex>
	);
}
