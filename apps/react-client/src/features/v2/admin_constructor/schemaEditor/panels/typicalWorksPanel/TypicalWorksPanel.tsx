import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import type { V2ExecutorStreamLabel, V2LogicWorkspaceTab, V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";
import { isExecutorStreamPresentInSchema } from "@smart-anketa/api-contract";
import {
	useCreateV2TypicalWork,
	useDeleteV2TypicalWork,
	useV2TypicalWorkCard,
	useV2TypicalWorksList,
} from "@react-client/common/api/queries/v2-works";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { parseTypicalWorkDeleteError } from "./typicalWorkPatchErrors";
import { V2_TEMPLATE_VERSION_QUERY } from "@react-client/routing/common/pathHelpers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useSchemaEditor } from "../../SchemaEditorContext";
import { findPointerByArchComponent } from "../../components/SchemaCanvasDnd";
import { ARCH_COMPONENT_PRESET_DEFS } from "../../archComponentPresets";
import { toast } from "@react-client/common/toasts";
import { SegmentBar } from "@react-client/common/muiCustom/SegmentBar";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../../testIds";
import { CreateTypicalWorkDialog } from "./CreateTypicalWorkDialog";
import { AssignWorkFromCatalogDialog } from "./AssignWorkFromCatalogDialog";
import { LogicWorksToolbar } from "./LogicWorksToolbar";
import { TypicalWorkEditableCard } from "./TypicalWorkEditableCard";
import { ParameterDependenciesPanel } from "./ParameterDependenciesPanel";
import { TypicalWorksEmptyState } from "./TypicalWorksEmptyState";
import { TypicalWorksTreeSidebar } from "./TypicalWorksTreeSidebar";
import {
	type LogicWorksScope,
	pickStreamForScope,
	resolveScopeStreams,
	scopeLabel,
	scopeSubtitle,
	streamAreaKey,
	workAssignedToScope,
} from "./typicalWorksAreas";
import {
	BIND_POINTER_QUERY,
	DEFAULT_WORK_STREAMS,
	groupWorksByArchComponent,
	NEW_WORK_QUERY,
	pickDefaultStream,
	ROLLBACK_TYPICAL_WORK_QUERY,
	storeWorkStream,
	WORK_ID_QUERY,
} from "./typicalWorksUi";
import { appendBoundWorkIdAtPointer } from "../../typicalWorkBlockBinding";
import { listCanvasEditableChildKeys } from "../../schemaCanvasTree";
import {
	makeStreamBlockJsonSchema,
	makeStreamBlockUiOptions,
} from "../../streamBlockHelpers";

const DEFAULT_SCOPE: LogicWorksScope = {
	kind: "stream",
	stream: "Источники данных",
};

export function TypicalWorksPanel() {
	const { templateId = "" } = useParams<{ templateId: string }>();
	const [searchParams, setSearchParams] = useSearchParams();
	const templateVersionId = searchParams.get(V2_TEMPLATE_VERSION_QUERY);

	const { jsonSchema, uiSchema, setSelectedPointer, handleAddFieldPresetAtParent, patchUiSchema, recordDraftHistory, setMainTab, handleDeleteField } =
		useSchemaEditor();

	const { data, isLoading, error } = useV2TypicalWorksList({
		templateId,
	});
	const createWork = useCreateV2TypicalWork();
	const deleteWork = useDeleteV2TypicalWork();

	/** Дуплекс логика→конструктор: гарантирует блок «Типовые работы» на холсте и выделяет его. */
	const ensureTypicalWorkBlockOnCanvas = useCallback(
		(preferredPointer?: string | null): string | null => {
			if (preferredPointer) {
				setSelectedPointer(preferredPointer);
				return preferredPointer;
			}
			const existing = findPointerByArchComponent(
				jsonSchema,
				uiSchema,
				"typicalWork",
			);
			if (existing) {
				setSelectedPointer(existing);
				return existing;
			}
			const def = ARCH_COMPONENT_PRESET_DEFS.typicalWork;
			handleAddFieldPresetAtParent(
				"/",
				def.make(),
				Number.MAX_SAFE_INTEGER,
				def.uiOptions,
				def.uiBranch,
			);
			return null;
		},
		[
			jsonSchema,
			uiSchema,
			setSelectedPointer,
			handleAddFieldPresetAtParent,
		],
	);

	const bindWorkToTypicalWorkBlock = useCallback(
		(pointer: string, workId: string) => {
			const allWorkIds = (data?.items ?? []).map((item) => item.id);
			recordDraftHistory();
			patchUiSchema(
				(prev) =>
					appendBoundWorkIdAtPointer(
						prev as Record<string, unknown>,
						pointer,
						workId,
						allWorkIds,
					) as import("@rjsf/utils").UiSchema,
				{ recordHistory: false },
			);
		},
		[data?.items, patchUiSchema, recordDraftHistory],
	);

	const isStreamPresentInSchema = useCallback(
		(stream: string) => isExecutorStreamPresentInSchema(uiSchema, stream),
		[uiSchema],
	);

	const handleCreateStreamBlock = useCallback(
		(stream: V2ExecutorStreamLabel) => {
			const rootCount = listCanvasEditableChildKeys(jsonSchema, "/", uiSchema).length;
			handleAddFieldPresetAtParent(
				"/",
				makeStreamBlockJsonSchema(stream),
				rootCount,
				makeStreamBlockUiOptions(stream),
			);
			setMainTab("designer");
			toast.success(`Добавлен стримовый блок «${stream}»`);
		},
		[jsonSchema, uiSchema, handleAddFieldPresetAtParent, setMainTab],
	);

	const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
	const [streamExecutor, setStreamExecutor] = useState<string | null>(null);
	const [scope, setScope] = useState<LogicWorksScope>(DEFAULT_SCOPE);
	const [createOpen, setCreateOpen] = useState(false);
	const [assignOpen, setAssignOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<V2TypicalWorkListItemDto | null>(
		null,
	);
	const [deleteUsageConflict, setDeleteUsageConflict] = useState<
		ReturnType<typeof parseTypicalWorkDeleteError>
	>(null);

	const scopeStreams = useMemo(() => resolveScopeStreams(scope), [scope]);

	// Дуплекс конструктор→логика: открыть конкретную работу по deep-link (?workId=).
	const deepLinkWorkId = searchParams.get(WORK_ID_QUERY);
	useEffect(() => {
		if (!deepLinkWorkId) return;
		const work = (data?.items ?? []).find((w) => w.id === deepLinkWorkId);
		if (!work) return;
		const area = work.streams[0]
			? streamAreaKey(work.streams[0])
			: DEFAULT_SCOPE.stream;
		setScope({ kind: "stream", stream: area });
		setSelectedWorkId(work.id);
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.delete(WORK_ID_QUERY);
				return next;
			},
			{ replace: true },
		);
	}, [deepLinkWorkId, data?.items, setSearchParams]);

	// Дуплекс конструктор→логика: открыть диалог создания работы по deep-link (?newWork=1).
	const openCreateFlag = searchParams.get(NEW_WORK_QUERY);
	useEffect(() => {
		if (openCreateFlag !== "1") return;
		setCreateOpen(true);
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.delete(NEW_WORK_QUERY);
				return next;
			},
			{ replace: true },
		);
	}, [openCreateFlag, setSearchParams]);

	const assignedWorks = useMemo(() => {
		const items = data?.items ?? [];
		return items.filter((item) => workAssignedToScope(item.streams, scopeStreams));
	}, [data?.items, scopeStreams]);

	const groups = useMemo(
		() => groupWorksByArchComponent(assignedWorks),
		[assignedWorks],
	);

	const selectedListItem = useMemo(
		() => assignedWorks.find((item) => item.id === selectedWorkId) ?? null,
		[assignedWorks, selectedWorkId],
	);

	const availableStreams = useMemo(() => {
		if (selectedListItem?.streams.length) return selectedListItem.streams;
		return [...DEFAULT_WORK_STREAMS];
	}, [selectedListItem]);

	const openWorkInStreamsView = (workId: string, stream: string) => {
		setSelectedWorkId(workId);
		setStreamExecutor(stream);
		storeWorkStream(workId, stream);
	};

	useEffect(() => {
		if (!assignedWorks.length) {
			setSelectedWorkId(null);
			return;
		}
		if (!selectedWorkId || !assignedWorks.some((w) => w.id === selectedWorkId)) {
			setSelectedWorkId(assignedWorks[0]?.id ?? null);
		}
	}, [assignedWorks, selectedWorkId]);

	useEffect(() => {
		if (!selectedListItem) {
			setStreamExecutor(null);
			return;
		}
		const preferred = pickDefaultStream(selectedListItem);
		setStreamExecutor(
			pickStreamForScope(selectedListItem.streams, scopeStreams, preferred),
		);
	}, [selectedListItem, scopeStreams]);

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

	const handleCreateDialogClose = useCallback(() => {
		setCreateOpen(false);
		const rollbackPointer = searchParams.get(BIND_POINTER_QUERY);
		const shouldRollback =
			searchParams.get(ROLLBACK_TYPICAL_WORK_QUERY) === "1" && rollbackPointer;

		if (shouldRollback) {
			handleDeleteField(rollbackPointer);
			setMainTab("designer");
		}

		if (rollbackPointer || shouldRollback) {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					next.delete(BIND_POINTER_QUERY);
					next.delete(ROLLBACK_TYPICAL_WORK_QUERY);
					return next;
				},
				{ replace: true },
			);
		}
	}, [searchParams, handleDeleteField, setMainTab, setSearchParams]);

	const handleCreateWork = async (payload: {
		name: string;
		archComponentType: string;
		streamExecutor?: string;
		starterNormValue?: number;
	}) => {
		try {
			const created = await createWork.mutateAsync({
				name: payload.name,
				archComponentType: payload.archComponentType,
				templateId,
				streamExecutor: payload.streamExecutor ?? scope.stream,
				starterNormValue: payload.starterNormValue,
			});
			setCreateOpen(false);
			setSelectedWorkId(created.id);
			const stream =
				created.streamExecutor ||
				payload.streamExecutor ||
				scope.stream ||
				DEFAULT_WORK_STREAMS[0];
			setStreamExecutor(stream);
			storeWorkStream(created.id, stream);
			const bindPointer = searchParams.get(BIND_POINTER_QUERY);
			ensureTypicalWorkBlockOnCanvas(bindPointer);
			const targetPointer =
				bindPointer ??
				findPointerByArchComponent(jsonSchema, uiSchema, "typicalWork");
			if (targetPointer) {
				bindWorkToTypicalWorkBlock(targetPointer, created.id);
			}
			if (bindPointer) {
				setSearchParams(
					(prev) => {
						const next = new URLSearchParams(prev);
						next.delete(BIND_POINTER_QUERY);
						next.delete(ROLLBACK_TYPICAL_WORK_QUERY);
						return next;
					},
					{ replace: true },
				);
			}
			toast.success("Работа создана");
		} catch (err) {
			toast.error("Не удалось создать работу", {
				description: apiErrorMessage(err),
			});
		}
	};

	const handleDeleteWork = async (confirm = false) => {
		if (!deleteTarget) return;
		try {
			await deleteWork.mutateAsync({ workId: deleteTarget.id, confirm });
			if (selectedWorkId === deleteTarget.id) {
				setSelectedWorkId(null);
			}
			setDeleteTarget(null);
			setDeleteUsageConflict(null);
			toast.success("Работа удалена");
		} catch (err) {
			if (!confirm) {
				const conflict = parseTypicalWorkDeleteError(err);
				if (conflict) {
					setDeleteUsageConflict(conflict);
					return;
				}
			}
			toast.error("Не удалось удалить работу", {
				description: apiErrorMessage(err),
			});
		}
	};

	const openDeleteDialog = (work: V2TypicalWorkListItemDto) => {
		setDeleteUsageConflict(null);
		setDeleteTarget(work);
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
			<LogicWorksToolbar
				scope={scope}
				onScopeChange={(next) => {
					setScope(next);
					setSelectedWorkId(null);
				}}
			/>

			<Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
				{assignedWorks.length === 0 ? (
					<TypicalWorksEmptyState
						areaTitle={scopeLabel(scope)}
						onCreateWork={() => setCreateOpen(true)}
						onAssignFromCatalog={() => setAssignOpen(true)}
					/>
				) : (
					<>
						<TypicalWorksTreeSidebar
							groups={groups}
							selectedWorkId={selectedWorkId}
							onSelectWork={setSelectedWorkId}
							onAssignFromCatalog={() => setAssignOpen(true)}
							onDeleteWork={openDeleteDialog}
							assignedCount={assignedWorks.length}
							scopeSubtitle={scopeSubtitle(scope)}
						/>
						<TypicalWorkEditableCard
							card={card}
							fallbackArchComponentType={selectedListItem?.archComponentType}
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
					</>
				)}
			</Box>
			</Box>

			<AssignWorkFromCatalogDialog
				open={assignOpen}
				scope={scope}
				templateId={templateId}
				templateVersionId={templateVersionId}
				onClose={() => setAssignOpen(false)}
				onAssigned={(workId, stream) => {
					openWorkInStreamsView(workId, stream);
					ensureTypicalWorkBlockOnCanvas();
				}}
				onCreateNew={() => {
					setAssignOpen(false);
					setCreateOpen(true);
				}}
			/>

			<CreateTypicalWorkDialog
				open={createOpen}
				pending={createWork.isPending}
				defaultStreamExecutor={scope.stream}
				isStreamPresentInSchema={isStreamPresentInSchema}
				onCreateStreamBlock={handleCreateStreamBlock}
				onClose={handleCreateDialogClose}
				onSubmit={handleCreateWork}
			/>

			<Dialog
				open={Boolean(deleteTarget)}
				onClose={() => {
					if (deleteWork.isPending) return;
					setDeleteTarget(null);
					setDeleteUsageConflict(null);
				}}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle>
					{deleteUsageConflict ? "Работа используется в анкетах" : "Удалить работу?"}
				</DialogTitle>
				<DialogContent>
					{deleteUsageConflict ? (
						<>
							<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
								«{deleteTarget?.name}» учтена в версиях анкет. Удаление затронет
								сохранённые данные в этих версиях.
							</Typography>
							<Box component="ul" sx={{ m: 0, pl: 2.5 }}>
								{deleteUsageConflict.usedInQuestionnaireVersions.map((usage) => (
									<Typography
										key={`${usage.questionnaireId}-${usage.version}`}
										component="li"
										variant="body2"
										color="text.secondary"
										sx={{ mb: 0.5 }}
									>
										{usage.calcName} (версия {usage.version})
									</Typography>
								))}
							</Box>
						</>
					) : (
						<Typography variant="body2" color="text.secondary">
							«{deleteTarget?.name}» будет удалена из глобального справочника без
							возможности восстановления.
						</Typography>
					)}
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => {
							setDeleteTarget(null);
							setDeleteUsageConflict(null);
						}}
						disabled={deleteWork.isPending}
					>
						Отмена
					</Button>
					<Button
						color="error"
						variant="contained"
						disabled={deleteWork.isPending}
						onClick={() => void handleDeleteWork(Boolean(deleteUsageConflict))}
					>
						{deleteUsageConflict ? "Удалить всё равно" : "Удалить"}
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

const LOGIC_WORKSPACE_SEGMENTS: Array<{
	id: V2LogicWorkspaceTab;
	label: string;
	title?: string;
}> = [
	{ id: "works", label: "Типовые работы" },
	{
		id: "dependencies",
		label: "Зависимости параметров",
		title: "Связи значений параметров между собой",
	},
	{ id: "jsonlogic", label: "JsonLogic" },
];

export function LogicWorkspaceShell({
	tab,
	onTabChange,
	jsonLogicPanel,
}: LogicWorkspaceShellProps) {
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
				<SegmentBar
					segments={LOGIC_WORKSPACE_SEGMENTS}
					value={tab}
					onChange={onTabChange}
				/>
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
