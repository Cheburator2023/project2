import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { styled, useColorScheme } from "@mui/material/styles";
import type { V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";
import {
	useCopyV2TypicalWork,
	usePatchV2TypicalWork,
	useV2TypicalWorksList,
} from "@react-client/common/api/queries/v2-works";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { getAgGridMainMenuItems } from "@react-client/common/tableStuff/agGridMainMenuItems";
import { registerAgGridTableModules } from "@react-client/common/tableStuff/agGridTableModules";
import { Flex } from "@react-client/common/primitives/Flex";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "@react-client/theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";
import type { ColDef, RowClickedEvent, SelectionChangedEvent } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@react-client/common/toasts";
import {
	buildTypicalWorkCopyName,
	planWorkAddition,
	workNeedsCopyForSchema,
	workSchemaLinkLabel,
	type WorkAddPlan,
} from "./assignWorkFromCatalog.util";
import { scopeLabel, scopeStreamExecutor, type LogicWorksScope } from "./typicalWorksAreas";
import { assignmentStatusLabel } from "./typicalWorksUi";

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
	templateId: string;
	templateName: string;
	templateVersionId: string | null;
	onClose: () => void;
	onAssigned: (workId: string, streamExecutor: string) => void;
	onCreateNew: () => void;
};

function groupPlans(plans: WorkAddPlan[]) {
	return {
		already: plans.filter((plan) => plan.action === "already_in_current"),
		bind: plans.filter((plan) => plan.action === "bind"),
		copy: plans.filter((plan) => plan.action === "copy"),
	};
}

export function AssignWorkFromCatalogDialog({
	open,
	scope,
	templateId,
	templateName,
	templateVersionId,
	onClose,
	onAssigned,
	onCreateNew,
}: AssignWorkFromRegistryDialogProps) {
	const { mode } = useColorScheme();
	const gridRef = useRef<AgGridReact<V2TypicalWorkListItemDto>>(null);
	const [query, setQuery] = useState("");
	const [pending, setPending] = useState(false);
	const [decision, setDecision] = useState<V2TypicalWorkListItemDto | null>(null);
	const [bulkConfirmPlans, setBulkConfirmPlans] = useState<WorkAddPlan[] | null>(
		null,
	);
	const [selectedCount, setSelectedCount] = useState(0);

	const { data, isLoading, error } = useV2TypicalWorksList();
	const copyWork = useCopyV2TypicalWork();
	const patch = usePatchV2TypicalWork();

	const items = data?.items ?? [];
	const targetSchemaLabel = templateName.trim() || "текущая схема";

	const gridTheme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const columnDefs = useMemo<ColDef<V2TypicalWorkListItemDto>[]>(
		() => [
			{
				field: "name",
				headerName: "Название",
				flex: 1.5,
				minWidth: 180,
			},
			{
				field: "archComponentType",
				headerName: "Компонент",
				flex: 1,
				minWidth: 120,
			},
			{
				colId: "schemaLink",
				headerName: "Привязка к схеме",
				flex: 1.2,
				minWidth: 160,
				valueGetter: (params) =>
					params.data
						? workSchemaLinkLabel(params.data, templateId)
						: "—",
			},
			{
				colId: "assignment",
				headerName: "Назначение",
				flex: 1,
				minWidth: 140,
				valueGetter: (params) => {
					const work = params.data;
					if (!work) return "—";
					const status = assignmentStatusLabel(
						work.assignmentStatus,
						work.usedOnSchemasCount,
					);
					if (work.streams.length > 0) {
						return status
							? `${status} · ${work.streams.length} поток.`
							: `${work.streams.length} поток.`;
					}
					return status || "—";
				},
			},
		],
		[templateId],
	);

	useEffect(() => {
		if (!open) return;
		setQuery("");
		setDecision(null);
		setBulkConfirmPlans(null);
		setSelectedCount(0);
		gridRef.current?.api?.deselectAll();
	}, [open]);

	useEffect(() => {
		const api = gridRef.current?.api;
		if (!api) return;
		api.setGridOption("quickFilterText", query.trim());
	}, [query]);

	const onSelectionChanged = useCallback(
		(event: SelectionChangedEvent<V2TypicalWorkListItemDto>) => {
			setSelectedCount(event.api.getSelectedRows().length);
		},
		[],
	);

	const streamForWork = useCallback(
		(work: V2TypicalWorkListItemDto) =>
			scopeStreamExecutor(scope, work.streams[0] ?? "Источники данных"),
		[scope],
	);

	const executePlans = useCallback(
		async (plans: WorkAddPlan[]) => {
			if (plans.length === 0) return;
			setPending(true);
			let bound = 0;
			let copied = 0;
			let already = 0;
			let failed = 0;

			for (const plan of plans) {
				const work = plan.work;
				const streamExecutor = streamForWork(work);
				try {
					if (plan.action === "already_in_current") {
						onAssigned(work.id, work.streams[0] ?? streamExecutor);
						already += 1;
						continue;
					}
					if (plan.action === "copy") {
						const copy = await copyWork.mutateAsync({
							workId: work.id,
							dto: {
								templateId: templateId || undefined,
								streamExecutor,
								name: buildTypicalWorkCopyName(work, targetSchemaLabel),
							},
						});
						onAssigned(copy.id, copy.streamExecutor || streamExecutor);
						copied += 1;
						continue;
					}
					await patch.mutateAsync({
						workId: work.id,
						dto: {
							streamExecutor,
							templateVersionId: templateVersionId ?? undefined,
							templateId: templateId || undefined,
						},
					});
					onAssigned(work.id, streamExecutor);
					bound += 1;
				} catch {
					failed += 1;
				}
			}

			const added = bound + copied + already;
			if (failed === 0) {
				const parts: string[] = [];
				if (bound > 0) parts.push(`привязано ${bound}`);
				if (copied > 0) parts.push(`скопировано ${copied}`);
				if (already > 0) parts.push(`уже в схеме ${already}`);
				toast.success(
					added === 1
						? "Работа добавлена в схему"
						: `Добавлено работ: ${added}${parts.length ? ` (${parts.join(", ")})` : ""}`,
				);
				setDecision(null);
				setBulkConfirmPlans(null);
				onClose();
			} else {
				toast.error("Не все работы удалось добавить", {
					description: `Успешно: ${added}, ошибок: ${failed}`,
				});
			}
			setPending(false);
		},
		[
			copyWork,
			onAssigned,
			onClose,
			patch,
			streamForWork,
			targetSchemaLabel,
			templateId,
			templateVersionId,
		],
	);

	const handleAssignSelected = useCallback(() => {
		const selected = gridRef.current?.api?.getSelectedRows() ?? [];
		if (selected.length === 0) return;

		const plans = selected.map((work) => planWorkAddition(work, templateId));
		const { already, bind, copy } = groupPlans(plans);

		if (bind.length === 0 && copy.length === 0) {
			toast.info(
				already.length === 1
					? "Выбранная работа уже в этой схеме"
					: "Все выбранные работы уже в этой схеме",
			);
			return;
		}

		setBulkConfirmPlans(plans);
	}, [templateId]);

	const bindToSchema = useCallback(
		async (work: V2TypicalWorkListItemDto) => {
			setPending(true);
			const streamExecutor = streamForWork(work);
			try {
				await patch.mutateAsync({
					workId: work.id,
					dto: {
						streamExecutor,
						templateVersionId: templateVersionId ?? undefined,
						templateId: templateId || undefined,
					},
				});
				toast.success(`«${work.name}» привязана к схеме «${targetSchemaLabel}»`);
				onAssigned(work.id, streamExecutor);
				setDecision(null);
				onClose();
			} catch (err) {
				toast.error("Не удалось привязать работу к схеме", {
					description: apiErrorMessage(err),
				});
			} finally {
				setPending(false);
			}
		},
		[
			onAssigned,
			onClose,
			patch,
			streamForWork,
			targetSchemaLabel,
			templateId,
			templateVersionId,
		],
	);

	const copyToSchema = useCallback(
		async (work: V2TypicalWorkListItemDto) => {
			setPending(true);
			const streamExecutor = streamForWork(work);
			const copyName = buildTypicalWorkCopyName(work, targetSchemaLabel);
			try {
				const copy = await copyWork.mutateAsync({
					workId: work.id,
					dto: {
						templateId: templateId || undefined,
						streamExecutor,
						name: copyName,
					},
				});
				toast.success(`Создана копия «${copy.name}»`);
				onAssigned(copy.id, copy.streamExecutor || streamExecutor);
				setDecision(null);
				onClose();
			} catch (err) {
				toast.error("Не удалось создать копию работы", {
					description: apiErrorMessage(err),
				});
			} finally {
				setPending(false);
			}
		},
		[
			copyWork,
			onAssigned,
			onClose,
			streamForWork,
			targetSchemaLabel,
			templateId,
		],
	);

	const handleRowSelect = useCallback(
		(work: V2TypicalWorkListItemDto) => {
			if (pending) return;
			const owner = work.templateId ?? null;
			const streamExecutor = streamForWork(work);
			if (owner && templateId && owner === templateId) {
				toast.info("Работа уже в этой схеме");
				onAssigned(work.id, work.streams[0] ?? streamExecutor);
				onClose();
				return;
			}
			setDecision(work);
		},
		[pending, templateId, onAssigned, onClose, streamForWork],
	);

	const onRowClicked = useCallback(
		(event: RowClickedEvent<V2TypicalWorkListItemDto>) => {
			if (!event.data) return;
			handleRowSelect(event.data);
		},
		[handleRowSelect],
	);

	const decisionOwnedByOther = Boolean(
		decision?.templateId && decision.templateId !== templateId,
	);
	const decisionNeedsCopy = decision
		? workNeedsCopyForSchema(decision, templateId)
		: false;
	const bulkGroups = bulkConfirmPlans ? groupPlans(bulkConfirmPlans) : null;

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
					{templateName.trim() ? (
						<>
							{" "}
							· схема <b>{templateName.trim()}</b>
						</>
					) : null}
				</Typography>
				<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
					Отметьте чекбоксами несколько работ — перед добавлением покажем, что
					будет привязано, а что скопировано. Клик по строке — поштучное
					добавление.
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
								mainMenuItems: getAgGridMainMenuItems,
							}}
							headerHeight={36}
							rowHeight={40}
							suppressCellFocus
							suppressRowClickSelection
							rowSelection={{
								mode: "multiRow",
								checkboxes: true,
								headerCheckbox: true,
								enableClickSelection: false,
							}}
							onRowClicked={onRowClicked}
							onSelectionChanged={onSelectionChanged}
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
				<Button
					variant="contained"
					disabled={pending || selectedCount === 0}
					onClick={handleAssignSelected}
				>
					{selectedCount > 0
						? `Добавить выбранные (${selectedCount})`
						: "Добавить выбранные"}
				</Button>
				<Button onClick={onClose} disabled={pending}>
					Закрыть
				</Button>
			</DialogActions>

			<Dialog
				open={Boolean(bulkConfirmPlans)}
				onClose={pending ? undefined : () => setBulkConfirmPlans(null)}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle sx={{ fontWeight: 800 }}>
					Подтверждение добавления
				</DialogTitle>
				<DialogContent>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						В схему «{targetSchemaLabel}» ({scopeLabel(scope)}):
					</Typography>

					{bulkGroups?.copy.length ? (
						<Box sx={{ mb: 2 }}>
							<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
								Будут созданы копии ({bulkGroups.copy.length})
							</Typography>
							<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
								Оригиналы останутся на других схемах. Имя копии: «… (копия ·{" "}
								{targetSchemaLabel})».
							</Typography>
							<List dense disablePadding>
								{bulkGroups.copy.map((plan) => (
									<ListItem key={plan.work.id} disableGutters sx={{ py: 0.25 }}>
										<ListItemText
											primary={plan.work.name}
											secondary={
												plan.action === "copy" ? plan.reason : undefined
											}
											primaryTypographyProps={{ variant: "body2" }}
											secondaryTypographyProps={{ variant: "caption" }}
										/>
									</ListItem>
								))}
							</List>
						</Box>
					) : null}

					{bulkGroups?.bind.length ? (
						<Box sx={{ mb: 2 }}>
							<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
								Будут привязаны ({bulkGroups.bind.length})
							</Typography>
							<List dense disablePadding>
								{bulkGroups.bind.map((plan) => (
									<ListItem key={plan.work.id} disableGutters sx={{ py: 0.25 }}>
										<ListItemText
											primary={plan.work.name}
											secondary={workSchemaLinkLabel(plan.work, templateId)}
											primaryTypographyProps={{ variant: "body2" }}
											secondaryTypographyProps={{ variant: "caption" }}
										/>
									</ListItem>
								))}
							</List>
						</Box>
					) : null}

					{bulkGroups?.already.length ? (
						<Box>
							<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
								Уже в этой схеме ({bulkGroups.already.length})
							</Typography>
							<Typography variant="caption" color="text.secondary">
								{bulkGroups.already.map((plan) => plan.work.name).join(", ")}
							</Typography>
						</Box>
					) : null}
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button
						onClick={() => setBulkConfirmPlans(null)}
						disabled={pending}
					>
						Отмена
					</Button>
					<Box sx={{ flex: 1 }} />
					{pending ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
					<Button
						variant="contained"
						disabled={pending || !bulkConfirmPlans}
						onClick={() =>
							bulkConfirmPlans && void executePlans(bulkConfirmPlans)
						}
					>
						{bulkGroups?.copy.length
							? "Создать копии и добавить"
							: "Добавить"}
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog
				open={Boolean(decision)}
				onClose={pending ? undefined : () => setDecision(null)}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle sx={{ fontWeight: 800 }}>
					Добавить «{decision?.name}»
				</DialogTitle>
				<DialogContent>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
						{decision
							? `Текущая привязка: ${workSchemaLinkLabel(decision, templateId)}`
							: null}
					</Typography>
					<Typography variant="body2" color="text.secondary">
						{decisionNeedsCopy
							? decisionOwnedByOther
								? `Работа принадлежит схеме «${decision?.templateName ?? "другая схема"}». Перепривязка недоступна — будет создана копия «${decision ? buildTypicalWorkCopyName(decision, targetSchemaLabel) : ""}».`
								: `Работа уже используется на других схемах. Для «${targetSchemaLabel}» будет создана копия «${decision ? buildTypicalWorkCopyName(decision, targetSchemaLabel) : ""}».`
							: "Работа не привязана к схеме. Привяжите её к текущей схеме или создайте независимую копию."}
					</Typography>
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button onClick={() => setDecision(null)} disabled={pending}>
						Отмена
					</Button>
					<Box sx={{ flex: 1 }} />
					{pending ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
					{!decisionNeedsCopy ? (
						<Button
							variant="outlined"
							disabled={pending}
							onClick={() => decision && void copyToSchema(decision)}
						>
							Сделать копию
						</Button>
					) : null}
					<Button
						variant="contained"
						disabled={pending}
						onClick={() =>
							decision &&
							void (decisionNeedsCopy
								? copyToSchema(decision)
								: bindToSchema(decision))
						}
					>
						{decisionNeedsCopy ? "Создать копию" : "Привязать к схеме"}
					</Button>
				</DialogActions>
			</Dialog>
		</Dialog>
	);
}
