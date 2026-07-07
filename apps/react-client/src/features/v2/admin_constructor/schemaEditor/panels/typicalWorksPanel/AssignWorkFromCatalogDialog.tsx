import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { styled, useColorScheme } from "@mui/material/styles";
import type { V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";
import {
	useCreateV2TypicalWorkAssignment,
	usePatchV2TypicalWork,
	useV2TypicalWorksList,
} from "@react-client/common/api/queries/v2-works";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { registerAgGridTableModules } from "@react-client/common/tableStuff/agGridTableModules";
import { Flex } from "@react-client/common/primitives/Flex";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "@react-client/theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";
import type { ColDef, RowClickedEvent } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@react-client/common/toasts";
import { scopeLabel, type LogicWorksScope } from "./typicalWorksAreas";
import {
	buildAssignWorkPatch,
	inferBaseNormValue,
	targetStreamsForAssign,
} from "./typicalWorksAssignment";

registerAgGridTableModules();

const AgGridHost = styled("div")`
	height: 420px;
	width: 100%;

	& > div {
		width: 100%;
		height: 100%;
	}
`;

type AssignWorkFromRegistryDialogProps = {
	open: boolean;
	scope: LogicWorksScope;
	scopeStreams: string[];
	templateId: string;
	templateVersionId: string | null;
	onClose: () => void;
	onAssigned: (workId: string, streamExecutor: string) => void;
	onCreateNew: () => void;
};

export function AssignWorkFromCatalogDialog({
	open,
	scope,
	scopeStreams,
	templateId,
	templateVersionId,
	onClose,
	onAssigned,
	onCreateNew,
}: AssignWorkFromRegistryDialogProps) {
	const { mode } = useColorScheme();
	const gridRef = useRef<AgGridReact<V2TypicalWorkListItemDto>>(null);
	const [query, setQuery] = useState("");
	const [pending, setPending] = useState(false);

	const { data, isLoading, error } = useV2TypicalWorksList();
	const createAssignment = useCreateV2TypicalWorkAssignment();
	const patch = usePatchV2TypicalWork();

	const items = data?.items ?? [];

	const gridTheme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const columnDefs = useMemo<ColDef<V2TypicalWorkListItemDto>[]>(
		() => [
			{
				field: "name",
				headerName: "Название",
				flex: 1.6,
				minWidth: 200,
			},
			{
				field: "archComponentType",
				headerName: "Компонент",
				flex: 1,
				minWidth: 140,
			},
			{
				field: "workType",
				headerName: "Тип",
				width: 110,
				valueFormatter: (p) => p.value?.trim() || "—",
			},
			{
				field: "streams",
				headerName: "Стримы",
				flex: 1.1,
				minWidth: 150,
				valueFormatter: (p) =>
					Array.isArray(p.value) && p.value.length > 0
						? p.value.join(", ")
						: "не назначена",
			},
		],
		[],
	);

	useEffect(() => {
		if (!open) return;
		setQuery("");
	}, [open]);

	useEffect(() => {
		const api = gridRef.current?.api;
		if (!api) return;
		api.setGridOption("quickFilterText", query.trim());
	}, [query]);

	const handleAssign = useCallback(
		async (work: V2TypicalWorkListItemDto) => {
			const streams = targetStreamsForAssign(work, scopeStreams);
			if (!streams.length) {
				toast.info("Работа уже назначена на эту область");
				return;
			}
			setPending(true);
			try {
				const baseNorm = inferBaseNormValue(work);
				for (const streamExecutor of streams) {
					await createAssignment.mutateAsync({
						workId: work.id,
						streamExecutor,
					});
					await patch.mutateAsync({
						workId: work.id,
						dto: {
							...buildAssignWorkPatch(streamExecutor, baseNorm),
							templateVersionId: templateVersionId ?? undefined,
							templateId: templateId || undefined,
						},
					});
				}
				toast.success(`«${work.name}» добавлена в схему`);
				onAssigned(work.id, streams[0] ?? work.streams[0] ?? "");
				onClose();
			} catch (err) {
				toast.error("Не удалось добавить работу из реестра", {
					description: apiErrorMessage(err),
				});
			} finally {
				setPending(false);
			}
		},
		[
			createAssignment,
			onAssigned,
			onClose,
			patch,
			scopeStreams,
			templateId,
			templateVersionId,
		],
	);

	const onRowClicked = useCallback(
		(event: RowClickedEvent<V2TypicalWorkListItemDto>) => {
			if (pending || !event.data) return;
			void handleAssign(event.data);
		},
		[handleAssign, pending],
	);

	return (
		<Dialog
			open={open}
			onClose={pending ? undefined : onClose}
			maxWidth="md"
			fullWidth
		>
			<DialogTitle sx={{ fontWeight: 800 }}>Добавить из реестра</DialogTitle>
			<DialogContent sx={{ pt: 0 }}>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
					Глобальный реестр типовых работ. Назначить на:{" "}
					<b>{scopeLabel(scope)}</b>
				</Typography>
				<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
					Выберите строку в таблице, чтобы добавить работу в текущую схему.
				</Typography>
				<TextField
					size="small"
					fullWidth
					placeholder="Поиск по названию, компоненту, стриму…"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					sx={{ mb: 1.5 }}
				/>
				{error ? (
					<Typography color="error" sx={{ py: 2 }}>
						Не удалось загрузить реестр: {apiErrorMessage(error)}
					</Typography>
				) : isLoading ? (
					<Flex justifyContent="center" sx={{ py: 6 }}>
						<CircularProgress size={28} />
					</Flex>
				) : items.length === 0 ? (
					<Typography sx={{ py: 3, textAlign: "center", color: "text.secondary" }}>
						В реестре пока нет работ.{" "}
						<Box
							component="button"
							type="button"
							onClick={onCreateNew}
							sx={{
								border: "none",
								bgcolor: "transparent",
								color: "primary.main",
								fontWeight: 600,
								cursor: "pointer",
								fontFamily: "inherit",
							}}
						>
							Создать новую
						</Box>
					</Typography>
				) : (
					<AgGridHost>
						<AgGridReact<V2TypicalWorkListItemDto>
							ref={gridRef}
							theme={gridTheme}
							icons={agGridIconSet}
							localeText={AG_GRID_LOCALE_RU}
							rowData={items}
							columnDefs={columnDefs}
							defaultColDef={{
								sortable: true,
								resizable: true,
								filter: false,
							}}
							headerHeight={36}
							rowHeight={40}
							suppressCellFocus
							rowSelection={{ mode: "singleRow", checkboxes: false }}
							onRowClicked={onRowClicked}
							getRowId={(p) => p.data.id}
							overlayNoRowsTemplate="Нет работ по запросу"
						/>
					</AgGridHost>
				)}
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={onCreateNew} disabled={pending}>
					+ Создать новую работу
				</Button>
				<Box sx={{ flex: 1 }} />
				{pending ? <CircularProgress size={22} sx={{ mr: 1 }} /> : null}
				<Button onClick={onClose} disabled={pending}>
					Закрыть
				</Button>
			</DialogActions>
		</Dialog>
	);
}
