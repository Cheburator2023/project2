import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import type {
	V2ExecutorStreamLabel,
	V2TypicalWorkListItemDto,
} from "@smart-anketa/api-contract";
import {
	isExecutorStreamPresentInSchema,
	isV2ExecutorStreamLabel,
	resolveStreamExecutorForTypicalWorkOutputPath,
} from "@smart-anketa/api-contract";
import {
	useCreateV2TypicalWork,
	useBulkDeleteV2TypicalWorks,
	useV2TypicalWorkCard,
	useV2TypicalWorksList,
} from "@react-client/common/api/queries/v2-works";
import { useV2Template } from "@react-client/common/api/queries/v2-templates";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { parseTypicalWorkDeleteError } from "./typicalWorkPatchErrors";
import { V2_TEMPLATE_VERSION_QUERY } from "@react-client/routing/common/pathHelpers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useDictionaryListPanelWidth } from "@react-client/features/v2/admin/hooks/useDictionaryListPanelWidth";
import { Flex } from "@react-client/common/primitives/Flex";
import { useSchemaEditor } from "../../SchemaEditorContext";
import { useSchemaEditorUiStore } from "../../schemaEditorUiStore";
import { logSchemaEditorNav } from "../../schemaEditorNavDebug";
import { toast } from "@react-client/common/toasts";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../../testIds";
import { CreateTypicalWorkDialog } from "./CreateTypicalWorkDialog";
import { AssignWorkFromCatalogDialog } from "./AssignWorkFromCatalogDialog";
import { LogicWorksToolbar } from "./LogicWorksToolbar";
import { TypicalWorkEditableCard } from "./TypicalWorkEditableCard";
import { TypicalWorksEmptyState } from "./TypicalWorksEmptyState";
import { TypicalWorksSidebarGrid } from "./TypicalWorksSidebarGrid";
import {
	type LogicWorksScope,
	DEFAULT_LOGIC_STREAM,
	DEFAULT_SCOPE,
	pickStreamForScope,
	resolveScopeStreams,
	scopeLabel,
	scopeStreamExecutor,
	scopeSubtitle,
	streamAreaKey,
	workMatchesLogicScope,
} from "./typicalWorksAreas";
import {
	BIND_POINTER_QUERY,
	DEFAULT_WORK_STREAMS,
	NEW_WORK_QUERY,
	pickDefaultStream,
	ROLLBACK_TYPICAL_WORK_QUERY,
	storeWorkStream,
} from "./typicalWorksUi";
import {
	appendBoundWorkIdAtPointer,
	pointerToOutputPath,
	removeWorkIdFromAllTypicalWorkBindings,
} from "../../typicalWorkBlockBinding";
import { listCanvasEditableChildKeys } from "../../schemaCanvasTree";
import {
	makeStreamBlockJsonSchema,
	makeStreamBlockUiOptions,
} from "../../streamBlockHelpers";

function TypicalWorksSidebarResizeHandle({
	onResizeStart,
	active,
}: {
	onResizeStart: (event: React.MouseEvent) => void;
	active: boolean;
}) {
	return (
		<Flex
			role="separator"
			aria-orientation="vertical"
			aria-label="Изменить ширину панели работ"
			title="Потяните, чтобы изменить ширину"
			onMouseDown={onResizeStart}
			flexShrink={0}
			width="10px"
			height="100%"
			position="relative"
			zIndex={2}
			sx={{
				cursor: "col-resize",
				mx: "-4px",
				"&::after": {
					content: '""',
					position: "absolute",
					left: "50%",
					top: 0,
					bottom: 0,
					width: 2,
					transform: "translateX(-50%)",
					borderRadius: 1,
					bgcolor: "divider",
					opacity: active ? 0.55 : 0.2,
					transition: "opacity 0.15s",
				},
				"&:hover::after": {
					opacity: 0.45,
				},
			}}
		/>
	);
}

export function TypicalWorksPanel() {
	const { templateId = "" } = useParams<{ templateId: string }>();
	const [searchParams, setSearchParams] = useSearchParams();
	const templateVersionId = searchParams.get(V2_TEMPLATE_VERSION_QUERY);
	const { data: templateMeta } = useV2Template(templateId);

	const {
		jsonSchema,
		uiSchema,
		handleAddFieldPresetAtParent,
		patchUiSchema,
		recordDraftHistory,
		handleDeleteField,
		placeTypicalWorkInStreamBlock,
	} = useSchemaEditor();
	const activateMainTab = useSchemaEditorUiStore((s) => s.activateMainTab);
	const logicWorkspaceTab = useSchemaEditorUiStore((s) => s.logicWorkspaceTab);
	const typicalWorkNavFocus = useSchemaEditorUiStore((s) => s.typicalWorkNavFocus);
	const selectedWorkId = useSchemaEditorUiStore((s) => s.selectedTypicalWorkId);
	const setSelectedTypicalWorkId = useSchemaEditorUiStore(
		(s) => s.setSelectedTypicalWorkId,
	);

	const { data, isLoading, error } = useV2TypicalWorksList({
		templateId,
	});
	const createWork = useCreateV2TypicalWork();
	const bulkDeleteWorks = useBulkDeleteV2TypicalWorks();
	const {
		width: sidebarWidth,
		isResizing: isSidebarResizing,
		onResizeStart: onSidebarResizeStart,
	} = useDictionaryListPanelWidth();

	const bindWorkToTypicalWorkBlock = useCallback(
		(pointer: string, workId: string) => {
			const catalog = (data?.items ?? []).map((item) => ({
				id: item.id,
				streams: item.streams ?? [],
			}));
			const outputPath = pointerToOutputPath(pointer);
			const streamExecutor =
				resolveStreamExecutorForTypicalWorkOutputPath(uiSchema, outputPath) ??
				"";
			recordDraftHistory();
			patchUiSchema(
				(prev) =>
					appendBoundWorkIdAtPointer(
						prev as Record<string, unknown>,
						pointer,
						workId,
						catalog,
						streamExecutor,
					) as import("@rjsf/utils").UiSchema,
				{ recordHistory: false },
			);
		},
		[data?.items, patchUiSchema, recordDraftHistory, uiSchema],
	);

	const isStreamPresentInSchema = useCallback(
		(stream: string) => isExecutorStreamPresentInSchema(uiSchema, stream),
		[uiSchema],
	);

	const handleCreateStreamBlock = useCallback(
		(stream: V2ExecutorStreamLabel) => {
			const rootCount = listCanvasEditableChildKeys(
				jsonSchema,
				"/",
				uiSchema,
			).length;
			handleAddFieldPresetAtParent(
				"/",
				makeStreamBlockJsonSchema(stream),
				rootCount,
				makeStreamBlockUiOptions(stream),
			);
			activateMainTab("designer");
			toast.success(`Добавлен стримовый блок «${stream}»`);
		},
		[jsonSchema, uiSchema, handleAddFieldPresetAtParent, activateMainTab],
	);

	const [streamExecutor, setStreamExecutor] = useState<string | null>(null);
	const [scope, setScope] = useState<LogicWorksScope>(DEFAULT_SCOPE);
	const [createOpen, setCreateOpen] = useState(false);
	const [assignOpen, setAssignOpen] = useState(false);
	const [deleteTargets, setDeleteTargets] = useState<
		V2TypicalWorkListItemDto[]
	>([]);
	const [deleteUsageConflict, setDeleteUsageConflict] =
		useState<ReturnType<typeof parseTypicalWorkDeleteError>>(null);

	const scopeStreams = useMemo(() => resolveScopeStreams(scope), [scope]);

	useEffect(() => {
		logSchemaEditorNav("works.panelMounted", {
			logicTab: logicWorkspaceTab,
			navFocusWorkId: typicalWorkNavFocus?.workId ?? null,
			selectedWorkId,
			isLoading,
			itemsCount: data?.items?.length ?? 0,
		});
		return () => {
			logSchemaEditorNav("works.panelUnmounted", {});
		};
	}, []);

	const applyWorkSelection = useCallback(
		(workId: string) => {
			const work = (data?.items ?? []).find((item) => item.id === workId);
			if (!work) return false;

			const area = work.streams[0]
				? streamAreaKey(work.streams[0])
				: DEFAULT_LOGIC_STREAM;
			setScope({ kind: "stream", stream: area });
			if (
				useSchemaEditorUiStore.getState().selectedTypicalWorkId !== work.id
			) {
				setSelectedTypicalWorkId(work.id);
			}
			const stream =
				pickDefaultStream(work) ??
				work.streams[0] ??
				scopeStreamExecutor(
					{ kind: "stream", stream: area },
					DEFAULT_LOGIC_STREAM,
				);
			if (stream) {
				setStreamExecutor(stream);
				storeWorkStream(work.id, stream);
			}
			logSchemaEditorNav("works.applyWorkSelection", {
				source: "navFocus",
				workId: work.id,
				scopeStream: area,
			});
			return true;
		},
		[data?.items, setSelectedTypicalWorkId],
	);

	useEffect(() => {
		if (!typicalWorkNavFocus?.workId) return;
		logSchemaEditorNav("works.navFocusEffect", {
			workId: typicalWorkNavFocus.workId,
			paramCode: typicalWorkNavFocus.paramCode ?? null,
			logicTab: logicWorkspaceTab,
			itemsCount: data?.items?.length ?? 0,
		});
		applyWorkSelection(typicalWorkNavFocus.workId);
	}, [
		applyWorkSelection,
		data?.items?.length,
		logicWorkspaceTab,
		typicalWorkNavFocus?.paramCode,
		typicalWorkNavFocus?.workId,
	]);

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
		return items.filter((item) => workMatchesLogicScope(item.streams, scope));
	}, [data?.items, scope]);

	const selectedListItem = useMemo(
		() => assignedWorks.find((item) => item.id === selectedWorkId) ?? null,
		[assignedWorks, selectedWorkId],
	);

	const availableStreams = useMemo(() => {
		if (selectedListItem?.streams.length) return selectedListItem.streams;
		return [...DEFAULT_WORK_STREAMS];
	}, [selectedListItem]);

	const openWorkInStreamsView = (workId: string, stream: string) => {
		setSelectedTypicalWorkId(workId);
		setStreamExecutor(stream);
		storeWorkStream(workId, stream);
	};

	const handleSelectWork = useCallback(
		(workId: string) => {
			if (useSchemaEditorUiStore.getState().selectedTypicalWorkId === workId) {
				return;
			}
			setSelectedTypicalWorkId(workId);
			const work = (data?.items ?? []).find((item) => item.id === workId);
			if (!work) return;
			const stream =
				pickDefaultStream(work) ??
				work.streams[0] ??
				scopeStreamExecutor(scope, DEFAULT_LOGIC_STREAM);
			if (stream) {
				setStreamExecutor(stream);
				storeWorkStream(workId, stream);
			}
		},
		[data?.items, scope, setSelectedTypicalWorkId],
	);

	const clearSelectedWork = useCallback(() => {
		setSelectedTypicalWorkId(null);
	}, [setSelectedTypicalWorkId]);

	useEffect(() => {
		if (typicalWorkNavFocus?.workId || selectedWorkId) {
			logSchemaEditorNav("works.assignedWorksGuard.skip", {
				reason: typicalWorkNavFocus?.workId ? "navFocus" : "store",
				typicalWorkNavFocusId: typicalWorkNavFocus?.workId ?? null,
				selectedWorkId,
			});
			return;
		}
		if (!assignedWorks.length) {
			logSchemaEditorNav("works.assignedWorksGuard.clear", {
				reason: "emptyAssignedWorks",
				selectedWorkId,
			});
			clearSelectedWork();
			return;
		}
	}, [
		assignedWorks,
		clearSelectedWork,
		selectedWorkId,
		typicalWorkNavFocus?.workId,
	]);

	useEffect(() => {
		if (typicalWorkNavFocus?.workId || !selectedWorkId) {
			return;
		}
		if (!assignedWorks.some((w) => w.id === selectedWorkId)) {
			logSchemaEditorNav("works.assignedWorksGuard.clear", {
				reason: "outOfScope",
				selectedWorkId,
				assignedIds: assignedWorks.map((w) => w.id),
			});
			clearSelectedWork();
		}
	}, [
		assignedWorks,
		clearSelectedWork,
		selectedWorkId,
		typicalWorkNavFocus?.workId,
	]);

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
	} = useV2TypicalWorkCard(selectedWorkId, streamExecutor, templateVersionId);

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
			activateMainTab("designer");
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
	}, [activateMainTab, searchParams, handleDeleteField, setSearchParams]);

	const createDefaultStreamExecutor = useMemo(() => {
		const bindPointer = searchParams.get(BIND_POINTER_QUERY);
		if (bindPointer) {
			return (
				resolveStreamExecutorForTypicalWorkOutputPath(
					uiSchema,
					pointerToOutputPath(bindPointer),
				) ?? scopeStreamExecutor(scope, DEFAULT_LOGIC_STREAM)
			);
		}
		return scopeStreamExecutor(scope, DEFAULT_LOGIC_STREAM);
	}, [searchParams, uiSchema, scope]);

	const handleCreateWork = async (payload: {
		name: string;
		archComponentType: string;
		streamExecutor?: string;
		starterNormValue?: number;
	}) => {
		try {
			const targetStream = scopeStreamExecutor(
				scope,
				payload.streamExecutor ?? DEFAULT_LOGIC_STREAM,
			);
			const created = await createWork.mutateAsync({
				name: payload.name,
				archComponentType: payload.archComponentType,
				templateId,
				streamExecutor: payload.streamExecutor ?? targetStream,
				starterNormValue: payload.starterNormValue,
			});
			setCreateOpen(false);
			setSelectedTypicalWorkId(created.id);
			const stream =
				created.streamExecutor ||
				payload.streamExecutor ||
				targetStream ||
				DEFAULT_WORK_STREAMS[0];
			setStreamExecutor(stream);
			storeWorkStream(created.id, stream);
			const bindPointer = searchParams.get(BIND_POINTER_QUERY);
			const streamForPlacement = isV2ExecutorStreamLabel(
				payload.streamExecutor ?? targetStream,
			)
				? (payload.streamExecutor ?? targetStream)
				: targetStream;
			const targetPointer = placeTypicalWorkInStreamBlock(
				streamForPlacement as V2ExecutorStreamLabel,
				bindPointer,
			);
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

	const handleDeleteWorks = async (confirm = false) => {
		if (!deleteTargets.length) return;
		const catalog = (data?.items ?? []).map((item) => ({
			id: item.id,
			streams: item.streams ?? [],
		}));

		try {
			const result = await bulkDeleteWorks.mutateAsync({
				ids: deleteTargets.map((work) => work.id),
				confirm,
			});
			const { deletedIds, conflicts, failed } = result;

			for (const failure of failed) {
				const work = deleteTargets.find((item) => item.id === failure.id);
				toast.error(`Не удалось удалить «${work?.name ?? failure.id}»`, {
					description: failure.message,
				});
			}

			if (deletedIds.length > 0) {
				if (selectedWorkId && deletedIds.includes(selectedWorkId)) {
					clearSelectedWork();
				}
				recordDraftHistory();
				patchUiSchema(
					(prev) => {
						let next = prev as Record<string, unknown>;
						for (const workId of deletedIds) {
							next = removeWorkIdFromAllTypicalWorkBindings(
								next,
								workId,
								catalog,
							);
						}
						return next as import("@rjsf/utils").UiSchema;
					},
					{ recordHistory: false },
				);
				toast.success(
					deletedIds.length === 1
						? "Работа удалена"
						: `Удалено работ: ${deletedIds.length}`,
				);
			}

			if (conflicts.length > 0 && !confirm) {
				const conflictIds = new Set(conflicts.map((row) => row.workId));
				setDeleteTargets(
					deleteTargets.filter((work) => conflictIds.has(work.id)),
				);
				setDeleteUsageConflict({
					code: "WORK_IN_USE",
					usedInQuestionnaireVersions: conflicts.flatMap(
						(row) => row.usedInQuestionnaireVersions,
					),
				});
				return;
			}

			setDeleteTargets([]);
			setDeleteUsageConflict(null);
		} catch (err) {
			toast.error("Не удалось удалить работы", {
				description: apiErrorMessage(err),
			});
		}
	};

	const openDeleteDialog = (works: V2TypicalWorkListItemDto[]) => {
		if (!works.length) return;
		setDeleteUsageConflict(null);
		setDeleteTargets(works);
	};

	if (isLoading && !data) {
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
						clearSelectedWork();
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
							<Flex
								flexDirection="column"
								flexShrink={0}
								height="100%"
								minHeight="0"
								width={`${sidebarWidth}px`}
								sx={{
									borderRight: "1px solid #e6e8ee",
								}}
							>
								<TypicalWorksSidebarGrid
									works={assignedWorks}
									selectedWorkId={selectedWorkId}
									onSelectWork={handleSelectWork}
									onAssignFromCatalog={() => setAssignOpen(true)}
									onDeleteWorks={openDeleteDialog}
									assignedCount={assignedWorks.length}
									scopeSubtitle={scopeSubtitle(scope)}
								/>
							</Flex>
							<TypicalWorksSidebarResizeHandle
								onResizeStart={onSidebarResizeStart}
								active={isSidebarResizing}
							/>
							<Flex flexGrow={1} minWidth="0" minHeight="0" height="100%">
								<TypicalWorkEditableCard
									key={`${selectedWorkId ?? ""}::${streamExecutor ?? ""}::${templateVersionId ?? ""}`}
									card={card}
									fallbackArchComponentType={
										selectedListItem?.archComponentType
									}
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
							</Flex>
						</>
					)}
				</Box>
			</Box>

			<AssignWorkFromCatalogDialog
				open={assignOpen}
				scope={scope}
				templateId={templateId}
				templateName={templateMeta?.name ?? ""}
				templateVersionId={templateVersionId}
				onClose={() => setAssignOpen(false)}
				onAssigned={(workId, stream) => {
					openWorkInStreamsView(workId, stream);
					if (isV2ExecutorStreamLabel(stream)) {
						const pointer = placeTypicalWorkInStreamBlock(
							stream as V2ExecutorStreamLabel,
						);
						if (pointer) {
							bindWorkToTypicalWorkBlock(pointer, workId);
						}
					}
				}}
				onCreateNew={() => {
					setAssignOpen(false);
					setCreateOpen(true);
				}}
			/>

			<CreateTypicalWorkDialog
				open={createOpen}
				pending={createWork.isPending}
				defaultStreamExecutor={createDefaultStreamExecutor}
				isStreamPresentInSchema={isStreamPresentInSchema}
				onCreateStreamBlock={handleCreateStreamBlock}
				onClose={handleCreateDialogClose}
				onSubmit={handleCreateWork}
			/>

			<Dialog
				open={deleteTargets.length > 0}
				onClose={() => {
					if (bulkDeleteWorks.isPending) return;
					setDeleteTargets([]);
					setDeleteUsageConflict(null);
				}}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle>
					{deleteUsageConflict
						? deleteTargets.length === 1
							? "Работа используется в анкетах"
							: "Некоторые работы используются в анкетах"
						: deleteTargets.length === 1
							? "Удалить работу?"
							: `Удалить работы (${deleteTargets.length})?`}
				</DialogTitle>
				<DialogContent>
					{deleteUsageConflict ? (
						<>
							<Typography
								variant="body2"
								color="text.secondary"
								sx={{ mb: 1.5 }}
							>
								{deleteTargets.length === 1 ? (
									<>
										«{deleteTargets[0]?.name}» учтена в версиях анкет. Удаление
										затронет сохранённые данные в этих версиях.
									</>
								) : (
									<>
										{deleteTargets.length} работ учтены в версиях анкет.
										Удаление затронет сохранённые данные.
									</>
								)}
							</Typography>
							{deleteTargets.length > 1 ? (
								<Box component="ul" sx={{ m: 0, pl: 2.5, mb: 1.5 }}>
									{deleteTargets.map((work) => (
										<Typography
											key={work.id}
											component="li"
											variant="body2"
											color="text.secondary"
											sx={{ mb: 0.5 }}
										>
											{work.name}
										</Typography>
									))}
								</Box>
							) : null}
							<Box component="ul" sx={{ m: 0, pl: 2.5 }}>
								{deleteUsageConflict.usedInQuestionnaireVersions.map(
									(usage) => (
										<Typography
											key={`${usage.questionnaireId}-${usage.version}`}
											component="li"
											variant="body2"
											color="text.secondary"
											sx={{ mb: 0.5 }}
										>
											{usage.calcName} (версия {usage.version})
										</Typography>
									),
								)}
							</Box>
						</>
					) : deleteTargets.length === 1 ? (
						<Typography variant="body2" color="text.secondary">
							«{deleteTargets[0]?.name}» будет удалена из глобального
							справочника без возможности восстановления.
						</Typography>
					) : (
						<>
							<Typography
								variant="body2"
								color="text.secondary"
								sx={{ mb: 1.5 }}
							>
								Будут удалены работы:
							</Typography>
							<Box component="ul" sx={{ m: 0, pl: 2.5 }}>
								{deleteTargets.map((work) => (
									<Typography
										key={work.id}
										component="li"
										variant="body2"
										color="text.secondary"
										sx={{ mb: 0.5 }}
									>
										{work.name}
									</Typography>
								))}
							</Box>
						</>
					)}
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => {
							setDeleteTargets([]);
							setDeleteUsageConflict(null);
						}}
						disabled={bulkDeleteWorks.isPending}
					>
						Отмена
					</Button>
					<Button
						color="error"
						variant="contained"
						disabled={bulkDeleteWorks.isPending}
						onClick={() => void handleDeleteWorks(Boolean(deleteUsageConflict))}
					>
						{deleteUsageConflict ? "Удалить всё равно" : "Удалить"}
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
