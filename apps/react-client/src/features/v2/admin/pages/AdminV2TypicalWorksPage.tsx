import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Flex } from "@react-client/common/primitives/Flex";
import {
	useCreateV2TypicalWork,
	useBulkDeleteV2TypicalWorks,
} from "@react-client/common/api/queries/v2-works";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { toast } from "@react-client/common/toasts";
import { V2AdminButton } from "@react-client/features/v2/admin/atoms/V2AdminButton";
import type { V2TypicalWorkHeaderState } from "@react-client/features/v2/admin/organisms/V2TypicalWorkDetail";
import { V2TypicalWorkWorkspace } from "@react-client/features/v2/admin/organisms/V2TypicalWorkWorkspace";
import { CreateTypicalWorkDialog } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/CreateTypicalWorkDialog";
import { TypicalWorkParametersCatalogView } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/TypicalWorkParametersCatalogView";
import { parseTypicalWorkDeleteError } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/typicalWorkPatchErrors";
import { resolveEffectiveWorkArchComponentType } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/schemaWorkParameters";
import { archComponentShortLabel } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/typicalWorksUi";
import type { CreateTypicalWorkDialogPayload } from "@react-client/features/v2/admin_constructor/schemaEditor/panels/typicalWorksPanel/CreateTypicalWorkDialog";
import { pathForAdminV2TypicalWork } from "@react-client/routing/common/pathHelpers";
import { commonRoutes as routes } from "@react-client/routing/common/routes";
import type { V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";

type AdminView = "works" | "parameters";

export function AdminV2TypicalWorksPage() {
	const navigate = useNavigate();
	const createWork = useCreateV2TypicalWork();
	const bulkDeleteWorks = useBulkDeleteV2TypicalWorks();

	const [view, setView] = useState<AdminView>("works");
	const [createOpen, setCreateOpen] = useState(false);
	const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
	const [checkedWorks, setCheckedWorks] = useState<V2TypicalWorkListItemDto[]>(
		[],
	);
	const [detailHeader, setDetailHeader] =
		useState<V2TypicalWorkHeaderState | null>(null);
	const [deleteTargets, setDeleteTargets] = useState<V2TypicalWorkListItemDto[]>(
		[],
	);
	const [deleteUsageConflict, setDeleteUsageConflict] =
		useState<ReturnType<typeof parseTypicalWorkDeleteError>>(null);

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

	const handleDeleteWorks = useCallback(
		async (confirm = false) => {
			if (!deleteTargets.length) return;

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
						setSelectedWorkId(null);
					}
					setCheckedWorks((prev) =>
						prev.filter((work) => !deletedIds.includes(work.id)),
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
			} catch (error) {
				toast.error("Не удалось удалить работы", {
					description: apiErrorMessage(error),
				});
			}
		},
		[deleteTargets, bulkDeleteWorks, selectedWorkId],
	);

	const openDeleteDialog = useCallback(
		(works: V2TypicalWorkListItemDto[]) => {
			if (!works.length) return;
			setDeleteUsageConflict(null);
			setDeleteTargets(works);
		},
		[],
	);

	const pageTitle =
		view === "parameters"
			? "Параметры трудоёмкости"
			: (detailHeader?.title ?? routes.adminV2TypicalWorks.name);

	const deleteButtonLabel = useMemo(() => {
		if (checkedWorks.length === 0) return "Удалить";
		if (checkedWorks.length === 1) return "Удалить";
		return `Удалить (${checkedWorks.length})`;
	}, [checkedWorks.length]);

	return (
		<Flex
			flexDirection="column"
			flexGrow={1}
			minHeight="0"
			sx={{ height: "100%" }}
		>
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
				<Stack
					direction="row"
					spacing={1}
					alignItems="center"
					flexWrap="wrap"
					useFlexGap
				>
					{view === "works" ? (
						<>
							<V2AdminButton onClick={() => setCreateOpen(true)}>
								Создать работу
							</V2AdminButton>
							<V2AdminButton
								color="error"
								variant="outlined"
								disabled={checkedWorks.length === 0 || bulkDeleteWorks.isPending}
								onClick={() => openDeleteDialog(checkedWorks)}
							>
								{deleteButtonLabel}
							</V2AdminButton>
						</>
					) : null}
				</Stack>
			</Header>

			<Flex
				flexDirection="column"
				flexGrow={1}
				minHeight="0"
				sx={{ overflow: "hidden" }}
			>
				{view === "works" ? (
					<V2TypicalWorkWorkspace
						onCreateRequest={() => setCreateOpen(true)}
						onSelectedWorkChange={setSelectedWorkId}
						onCheckedWorksChange={setCheckedWorks}
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
							: "Работы используются в анкетах"
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
							«{deleteTargets[0]?.name}» будет удалена из глобального справочника
							без возможности восстановления.
						</Typography>
					) : (
						<>
							<Typography
								variant="body2"
								color="text.secondary"
								sx={{ mb: 1.5 }}
							>
								Будут удалены из глобального справочника без возможности
								восстановления:
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
		</Flex>
	);
}
