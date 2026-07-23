import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { styled, useColorScheme } from "@mui/material/styles";
import { useV2Audit } from "@react-client/common/api/queries/v2-templates";
import { Flex } from "@react-client/common/primitives/Flex";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { getAgGridMainMenuItems } from "@react-client/common/tableStuff/agGridMainMenuItems";
import { registerAgGridTableModules } from "@react-client/common/tableStuff/agGridTableModules";
import { useAgGridColumnPersistence } from "@react-client/common/tableStuff/useAgGridColumnPersistence";
import { auditActionRu } from "@react-client/features/v2/admin/utils/auditActionRu";
import { Header } from "@react-client/common/navigation/organisms/Header";
import type {
	V2TemplateAuditAction,
	V2TemplateAuditDto,
} from "@smart-anketa/api-contract";
import { type ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useMemo, useRef } from "react";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "@react-client/theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";

registerAgGridTableModules();

const GridWrapper = styled(Flex)`
	& > div {
		width: 100%;
		min-height: 420px;
	}
`;

/** Журнал аудита схем (чтение для auditor / appadmin). */
export function AdminV2AuditJournalPage() {
	const { mode } = useColorScheme();
	const gridTheme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const { data = [], isLoading, error } = useV2Audit(undefined, undefined);
	const gridRef = useRef<AgGridReact<V2TemplateAuditDto>>(null);
	const gridPersistence = useAgGridColumnPersistence("v2.audit-journal");

	const columnDefs: ColDef<V2TemplateAuditDto>[] = useMemo(
		() => [
			{
				field: "createdAt",
				headerName: "Время",
				minWidth: 180,
				valueFormatter: (p) =>
					p.value ? new Date(String(p.value)).toLocaleString("ru-RU") : "",
			},
			{
				field: "templateName",
				headerName: "Схема",
				minWidth: 180,
				valueFormatter: (p) =>
					p.value == null || p.value === "" ? "—" : String(p.value),
			},
			{
				field: "templateCode",
				headerName: "Код",
				minWidth: 120,
				valueFormatter: (p) =>
					p.value == null || p.value === "" ? "—" : String(p.value),
			},
			{
				field: "versionNumber",
				headerName: "№ версии",
				minWidth: 100,
				valueFormatter: (p) =>
					p.value == null || p.value === undefined ? "—" : String(p.value),
			},
			{
				field: "action",
				headerName: "Действие",
				minWidth: 220,
				valueFormatter: (p) =>
					p.value ? auditActionRu(p.value as V2TemplateAuditAction) : "",
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
			<Header title="Журнал аудита" />

			{error ? (
				<Typography color="error" variant="body2" sx={{ pb: 1 }}>
					Не удалось загрузить журнал аудита
				</Typography>
			) : null}

			<Typography variant="body2" color="text.secondary" sx={{ pb: 1 }}>
				Записи об изменениях схем и версий шаблонов.
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
							mainMenuItems: getAgGridMainMenuItems,
						}}
						loading={isLoading}
						pagination
						paginationPageSize={50}
						localeText={AG_GRID_LOCALE_RU}
						sideBar={gridPersistence.sideBar}
						onGridReady={gridPersistence.onGridReady}
						onColumnMoved={(event) => gridPersistence.onColumnMoved(event.api)}
						onColumnVisible={(event) =>
							gridPersistence.onColumnVisible(event.api)
						}
						onColumnPinned={(event) => gridPersistence.onColumnPinned(event.api)}
						onSortChanged={(event) => gridPersistence.onSortChanged(event.api)}
						onColumnResized={(event) => {
							if (event.finished) gridPersistence.onColumnResized(event.api);
						}}
						suppressCsvExport
						suppressExcelExport
						preventDefaultOnContextMenu
					/>
				</Box>
			</GridWrapper>
		</Flex>
	);
}
