import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import type { V2LogicWorkspaceTab, V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";
import {
	useCreateV2TypicalWork,
	useDeleteV2TypicalWork,
	useV2TypicalWorkCard,
	useV2TypicalWorksList,
} from "@react-client/common/api/queries/v2-works";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { V2_TEMPLATE_VERSION_QUERY } from "@react-client/routing/common/pathHelpers";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { toast } from "@react-client/common/toasts";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../../testIds";
import { CreateTypicalWorkDialog } from "./CreateTypicalWorkDialog";
import { TypicalWorkEditableCard } from "./TypicalWorkEditableCard";
import { ParameterDependenciesPanel } from "./ParameterDependenciesPanel";
import { TypicalWorksTreeSidebar } from "./TypicalWorksTreeSidebar";
import {
	DEFAULT_WORK_STREAMS,
	groupWorksByArchComponent,
	pickDefaultStream,
	storeWorkStream,
} from "./typicalWorksUi";

export function TypicalWorksPanel() {
	const { templateId = "" } = useParams<{ templateId: string }>();
	const [searchParams, setSearchParams] = useSearchParams();
	const templateVersionId = searchParams.get(V2_TEMPLATE_VERSION_QUERY);

	const { data, isLoading, error } = useV2TypicalWorksList();
	const createWork = useCreateV2TypicalWork();
	const deleteWork = useDeleteV2TypicalWork();

	const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
	const [streamExecutor, setStreamExecutor] = useState<string | null>(null);
	const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(
		{},
	);
	const [viewMode] = useState<"tree" | "table" | "cards">("tree");
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<V2TypicalWorkListItemDto | null>(
		null,
	);

	const groups = useMemo(
		() => groupWorksByArchComponent(data?.items ?? []),
		[data?.items],
	);

	const selectedListItem = useMemo(
		() => data?.items.find((item) => item.id === selectedWorkId) ?? null,
		[data?.items, selectedWorkId],
	);

	const availableStreams = useMemo(() => {
		if (selectedListItem?.streams.length) return selectedListItem.streams;
		return [...DEFAULT_WORK_STREAMS];
	}, [selectedListItem]);

	useEffect(() => {
		if (!selectedWorkId && data?.items.length) {
			setSelectedWorkId(data.items[0]?.id ?? null);
		}
	}, [data?.items, selectedWorkId]);

	useEffect(() => {
		if (!selectedListItem) {
			setStreamExecutor(null);
			return;
		}
		setStreamExecutor(pickDefaultStream(selectedListItem) ?? DEFAULT_WORK_STREAMS[0]);
	}, [selectedListItem]);

	const {
		data: card,
		isLoading: cardLoading,
		error: cardError,
	} = useV2TypicalWorkCard(
		selectedWorkId,
		streamExecutor,
		templateVersionId,
	);

	const handleStreamChange = (stream: string) => {
		setStreamExecutor(stream);
		if (selectedWorkId) storeWorkStream(selectedWorkId, stream);
	};

	const handleVersionChange = (versionId: string) => {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			next.set(V2_TEMPLATE_VERSION_QUERY, versionId);
			return next;
		});
	};

	const handleCreateWork = async (payload: {
		name: string;
		archComponentType: string;
	}) => {
		try {
			const created = await createWork.mutateAsync(payload);
			setCreateOpen(false);
			setSelectedWorkId(created.id);
			setStreamExecutor(DEFAULT_WORK_STREAMS[0]);
			toast.success("Работа создана");
		} catch (err) {
			toast.error("Не удалось создать работу", {
				description: apiErrorMessage(err),
			});
		}
	};

	const handleDeleteWork = async () => {
		if (!deleteTarget) return;
		try {
			await deleteWork.mutateAsync(deleteTarget.id);
			if (selectedWorkId === deleteTarget.id) {
				setSelectedWorkId(null);
			}
			setDeleteTarget(null);
			toast.success("Работа удалена");
		} catch (err) {
			toast.error("Не удалось удалить работу", {
				description: apiErrorMessage(err),
			});
		}
	};

	if (isLoading) {
		return (
			<Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
				<CircularProgress size={32} />
			</Box>
		);
	}

	if (error) {
		return (
			<Alert severity="error" sx={{ m: 2 }}>
				Не удалось загрузить справочник типовых работ:{" "}
				{error instanceof Error ? error.message : String(error)}
			</Alert>
		);
	}

	return (
		<>
			<Box
				data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.typicalWorksPanel}
				sx={{
					display: "flex",
					flexDirection: "column",
					height: "100%",
					minHeight: 0,
				}}
			>
				<Box
					sx={{
						flexShrink: 0,
						px: 2,
						py: 1,
						borderBottom: 1,
						borderColor: "divider",
						bgcolor: "background.paper",
						display: "flex",
						alignItems: "center",
						gap: 1.5,
					}}
				>
					<Typography variant="body2" color="text.secondary">
						<b>{data?.total ?? 0}</b> работ · сгруппированы по арх. компоненту
					</Typography>
					<Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
						<Typography variant="body2" color="text.secondary">
							Вид:
						</Typography>
						<Chip
							size="small"
							color={viewMode === "tree" ? "primary" : "default"}
							label="Дерево"
						/>
						<Chip
							size="small"
							variant="outlined"
							label="Таблица"
							title="Будет реализовано позже"
							sx={{ opacity: 0.55 }}
						/>
						<Chip
							size="small"
							variant="outlined"
							label="Карточки"
							title="Будет реализовано позже"
							sx={{ opacity: 0.55 }}
						/>
					</Box>
				</Box>

				<Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
					<TypicalWorksTreeSidebar
						groups={groups}
						selectedWorkId={selectedWorkId}
						collapsedGroups={collapsedGroups}
						streamFilter={streamExecutor}
						onToggleGroup={(archComponentType) =>
							setCollapsedGroups((prev) => ({
								...prev,
								[archComponentType]: !prev[archComponentType],
							}))
						}
						onSelectWork={setSelectedWorkId}
						onCreateWork={() => setCreateOpen(true)}
						onDeleteWork={setDeleteTarget}
					/>
					<TypicalWorkEditableCard
						card={card}
						loading={cardLoading}
						error={
							cardError instanceof Error
								? cardError.message
								: cardError
									? String(cardError)
									: null
						}
						availableStreams={availableStreams}
						streamExecutor={streamExecutor}
						templateId={templateId}
						templateVersionId={templateVersionId}
						onStreamChange={handleStreamChange}
						onVersionChange={handleVersionChange}
					/>
				</Box>
			</Box>

			<CreateTypicalWorkDialog
				open={createOpen}
				pending={createWork.isPending}
				onClose={() => setCreateOpen(false)}
				onSubmit={handleCreateWork}
			/>

			<Dialog
				open={Boolean(deleteTarget)}
				onClose={() => (deleteWork.isPending ? undefined : setDeleteTarget(null))}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle>Удалить работу?</DialogTitle>
				<DialogContent>
					<Typography variant="body2" color="text.secondary">
						«{deleteTarget?.name}» будет удалена из глобального справочника без
						возможности восстановления.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteTarget(null)} disabled={deleteWork.isPending}>
						Отмена
					</Button>
					<Button
						color="error"
						variant="contained"
						disabled={deleteWork.isPending}
						onClick={() => void handleDeleteWork()}
					>
						Удалить
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}

export type LogicWorkspaceShellProps = {
	tab: V2LogicWorkspaceTab;
	onTabChange: (tab: V2LogicWorkspaceTab) => void;
	jsonLogicPanel: React.ReactNode;
};

export function LogicWorkspaceShell({
	tab,
	onTabChange,
	jsonLogicPanel,
}: LogicWorkspaceShellProps) {
	const segments: Array<{ id: V2LogicWorkspaceTab; label: string; hint?: string }> =
		[
			{ id: "works", label: "Типовые работы" },
			{
				id: "dependencies",
				label: "Зависимости параметров",
				hint: "Связи значений параметров между собой",
			},
			{ id: "jsonlogic", label: "JsonLogic" },
		];

	return (
		<Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
			<Box
				sx={{
					flexShrink: 0,
					px: 2,
					py: 1.25,
					borderBottom: 1,
					borderColor: "divider",
					bgcolor: "background.paper",
					display: "flex",
					alignItems: "center",
					gap: 1.5,
					flexWrap: "wrap",
				}}
			>
				<Box
					sx={{
						display: "inline-flex",
						p: 0.4,
						gap: 0.25,
						borderRadius: 1.25,
						border: 1,
						borderColor: "divider",
						bgcolor: "action.hover",
					}}
				>
					{segments.map((segment) => (
						<Chip
							key={segment.id}
							label={segment.label}
							title={segment.hint}
							clickable
							color={tab === segment.id ? "primary" : "default"}
							variant={tab === segment.id ? "filled" : "outlined"}
							onClick={() => onTabChange(segment.id)}
							sx={{ border: "none" }}
						/>
					))}
				</Box>
				<Typography variant="caption" color="text.secondary">
					{tab === "works"
						? "Норматив · триггеры появления · параметры трудоёмкости · формула"
						: tab === "dependencies"
							? "Зависимости между параметрами анкеты"
							: "Расширенный редактор JsonLogic-правил"}
				</Typography>
			</Box>

			<Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
				{tab === "works" ? <TypicalWorksPanel /> : null}
				{tab === "dependencies" ? <ParameterDependenciesPanel /> : null}
				{tab === "jsonlogic" ? (
					<Box sx={{ height: "100%", minHeight: 0 }}>{jsonLogicPanel}</Box>
				) : null}
			</Box>
		</Box>
	);
}
