import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { Flex } from "@react-client/common/primitives/Flex";
import {
	useCreateV2TypicalWork,
	useDeleteV2TypicalWork,
	useV2TypicalWorksList,
} from "@react-client/common/api/queries/v2-works";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { toast } from "@react-client/common/toasts";
import { V2AdminButton } from "@react-client/features/v2/admin/atoms/V2AdminButton";
import type { V2TypicalWorkHeaderState } from "@react-client/features/v2/admin/organisms/V2TypicalWorkDetail";
import { V2TypicalWorkWorkspace } from "@react-client/features/v2/admin/organisms/V2TypicalWorkWorkspace";
import { CreateTypicalWorkDialog } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/CreateTypicalWorkDialog";
import { TypicalWorkParametersCatalogView } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/TypicalWorkParametersCatalogView";
import {
	parseTypicalWorkDeleteError,
} from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/typicalWorkPatchErrors";
import { resolveEffectiveWorkArchComponentType } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/schemaWorkParameters";
import {
	archComponentShortLabel,
} from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/typicalWorksUi";
import type { CreateTypicalWorkDialogPayload } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/CreateTypicalWorkDialog";
import { pathForAdminV2TypicalWork } from "@react-client/routing/common/pathHelpers";
import { commonRoutes as routes } from "@react-client/routing/common/routes";
import type { V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";

type AdminView = "works" | "parameters";

export function AdminV2TypicalWorksPage() {
	const navigate = useNavigate();
	const { data } = useV2TypicalWorksList();
	const createWork = useCreateV2TypicalWork();
	const deleteWork = useDeleteV2TypicalWork();

	const [view, setView] = useState<AdminView>("works");
	const [createOpen, setCreateOpen] = useState(false);
	const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
	const [detailHeader, setDetailHeader] = useState<V2TypicalWorkHeaderState | null>(
		null,
	);
	const [deleteTarget, setDeleteTarget] = useState<V2TypicalWorkListItemDto | null>(
		null,
	);
	const [deleteUsageConflict, setDeleteUsageConflict] = useState<
		ReturnType<typeof parseTypicalWorkDeleteError>
	>(null);

	const selectedWork = useMemo(
		() => (data?.items ?? []).find((item) => item.id === selectedWorkId) ?? null,
		[data?.items, selectedWorkId],
	);

	const handleCreateWork = async (payload: CreateTypicalWorkDialogPayload) => {
		try {
			const created = await createWork.mutateAsync({
				name: payload.name,
				archComponentType: payload.archComponentType,
				streamExecutor: payload.streamExecutor,
				starterNormValue: payload.starterNormValue,
			});
			setCreateOpen(false);
			toast.success("Работа создана");
			navigate(pathForAdminV2TypicalWork(created.id));
		} catch (error) {
			toast.error("Не удалось создать работу", {
				description: apiErrorMessage(error),
			});
		}
	};

	const handleDeleteWork = useCallback(
		async (confirm = false) => {
			if (!deleteTarget) return;
			try {
				await deleteWork.mutateAsync({ workId: deleteTarget.id, confirm });
				if (selectedWorkId === deleteTarget.id) {
					setSelectedWorkId(null);
				}
				setDeleteTarget(null);
				setDeleteUsageConflict(null);
				toast.success("Работа удалена");
			} catch (error) {
				if (!confirm) {
					const conflict = parseTypicalWorkDeleteError(error);
					if (conflict) {
						setDeleteUsageConflict(conflict);
						return;
					}
				}
				toast.error("Не удалось удалить работу", {
					description: apiErrorMessage(error),
				});
			}
		},
		[deleteTarget, deleteWork, selectedWorkId],
	);

	const pageTitle =
		view === "parameters"
			? "Параметры трудоёмкости"
			: (detailHeader?.title ?? routes.adminV2TypicalWorks.name);

	return (
		<Flex flexDirection="column" flexGrow={1} minHeight="0" sx={{ height: "100%" }}>
			<Header
				title={pageTitle}
				leadingAccessory={
					view === "works" && detailHeader ? (
						<Typography
							component="span"
							variant="caption"
							sx={{ color: "text.secondary" }}
						>
							{archComponentShortLabel(
								resolveEffectiveWorkArchComponentType(
									detailHeader.archComponentType,
								),
							)}
						</Typography>
					) : undefined
				}
			>
				<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
					<ToggleButtonGroup
						size="small"
						exclusive
						value={view}
						onChange={(_e, val: AdminView | null) => {
							if (val) setView(val);
						}}
					>
						<ToggleButton value="works">Работы</ToggleButton>
						<ToggleButton value="parameters">Параметры</ToggleButton>
					</ToggleButtonGroup>

					{view === "works" ? (
						<>
							{detailHeader ? (
								!detailHeader.isEditing ? (
									<Button variant="outlined" onClick={detailHeader.onStartEdit}>
										Редактировать
									</Button>
								) : (
									<>
										<Button
											variant="text"
											onClick={detailHeader.onCancelEdit}
											disabled={detailHeader.savePending}
										>
											Отмена
										</Button>
										<V2AdminButton
											onClick={detailHeader.onSave}
											disabled={detailHeader.savePending}
										>
											{detailHeader.savePending ? "Сохранение…" : "Сохранить"}
										</V2AdminButton>
									</>
								)
							) : null}
							<V2AdminButton onClick={() => setCreateOpen(true)}>
								Создать работу
							</V2AdminButton>
							<V2AdminButton
								color="error"
								variant="outlined"
								disabled={!selectedWork || deleteWork.isPending}
								onClick={() => {
									if (selectedWork) {
										setDeleteUsageConflict(null);
										setDeleteTarget(selectedWork);
									}
								}}
							>
								Удалить
							</V2AdminButton>
						</>
					) : null}
				</Stack>
			</Header>

			<Flex flexDirection="column" flexGrow={1} minHeight="0" sx={{ overflow: "hidden" }}>
				{view === "works" ? (
					<V2TypicalWorkWorkspace
						onCreateRequest={() => setCreateOpen(true)}
						onSelectedWorkChange={setSelectedWorkId}
						onHeaderChange={setDetailHeader}
					/>
				) : (
					<Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 2 }}>
						<TypicalWorkParametersCatalogView />
					</Box>
				)}
			</Flex>

			<CreateTypicalWorkDialog
				open={createOpen}
				pending={createWork.isPending}
				onClose={() => setCreateOpen(false)}
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
		</Flex>
	);
}
