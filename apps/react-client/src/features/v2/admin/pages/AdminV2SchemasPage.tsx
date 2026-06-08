import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
	useBulkDeleteV2TemplateVersions,
	useDeleteV2Template,
	useResetV2TemplateToDefault,
	useRestoreV2Template,
	useRestoreV2TemplateVersions,
	useV2Templates,
} from "@react-client/common/api/queries/v2-templates";
import { useSeedV2TestQuestionnaires } from "@react-client/common/api/queries/v2-questionnaires";
import { toast } from "@react-client/common/toasts";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { Flex } from "@react-client/common/primitives/Flex";
import { V2AdminButton } from "@react-client/features/v2/admin/atoms/V2AdminButton";
import { V2SchemaCreateDialog } from "@react-client/features/v2/admin/organisms/V2SchemaCreateDialog";
import {
	splitSelectedSchemaRows,
	V2TemplateList,
	type V2SchemaGridRow,
	type V2TemplateListHandle,
} from "@react-client/features/v2/admin/organisms/V2TemplateList";
import { toastWithUndo } from "@react-client/features/v2/admin/utils/v2UndoToast";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { commonRoutes as routes } from "@react-client/routing/common/routes";
import type {
	V2TemplateDeleteSnapshotDto,
	V2TemplateVersionDto,
} from "@smart-anketa/api-contract";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink } from "react-router";

export function AdminV2SchemasPage() {
	const resetMutation = useResetV2TemplateToDefault();
	const seedMutation = useSeedV2TestQuestionnaires();
	const bulkDeleteVersions = useBulkDeleteV2TemplateVersions();
	const deleteTemplate = useDeleteV2Template();
	const restoreTemplate = useRestoreV2Template();
	const restoreVersions = useRestoreV2TemplateVersions();
	const { data: templates } = useV2Templates();
	const listRef = useRef<V2TemplateListHandle>(null);

	const [selectedTemplateId, setSelectedTemplateId] = useState("");
	const [confirmResetOpen, setConfirmResetOpen] = useState(false);
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [selectedRows, setSelectedRows] = useState<V2SchemaGridRow[]>([]);
	const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

	const systemCurrentVersionId = useMemo(() => {
		const holder = templates?.find((t) => t.currentVersionId);
		return holder?.currentVersionId ?? null;
	}, [templates]);

	const { templates: selectedTemplates, versionsWithoutSelectedTemplate } =
		useMemo(
			() => splitSelectedSchemaRows(selectedRows),
			[selectedRows],
		);

	const bulkDeletePending =
		bulkDeleteVersions.isPending || deleteTemplate.isPending;

	useEffect(() => {
		if (!selectedTemplateId && templates?.length) {
			setSelectedTemplateId(templates[0].id);
		}
	}, [templates, selectedTemplateId]);

	const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId);

	const runBulkDelete = useCallback(async () => {
		if (!selectedRows.length) return;

		const { templates: tplRows, versionsWithoutSelectedTemplate: verRows } =
			splitSelectedSchemaRows(selectedRows);

		let deletedVersionCount = 0;
		let deletedTemplateCount = 0;
		let reboundQuestionnaireCount = 0;
		let deletedQuestionnaireCount = 0;
		const templateErrors: string[] = [];
		const restoreVersionBatches: {
			templateId: string;
			versions: V2TemplateVersionDto[];
		}[] = [];
		const restoreTemplateSnapshots: V2TemplateDeleteSnapshotDto[] = [];

		const trackVersionDeleteResult = (result: {
			deletedVersionIds: string[];
			reboundQuestionnaireCount?: number;
			deletedQuestionnaireCount?: number;
			snapshot: V2TemplateVersionDto[];
		}, templateId: string) => {
			deletedVersionCount += result.deletedVersionIds.length;
			reboundQuestionnaireCount += result.reboundQuestionnaireCount ?? 0;
			deletedQuestionnaireCount += result.deletedQuestionnaireCount ?? 0;
			if (result.snapshot.length > 0) {
				restoreVersionBatches.push({
					templateId,
					versions: result.snapshot,
				});
			}
		};

		try {
			for (const tpl of tplRows) {
				if (tpl.currentVersionId) {
					const result = await bulkDeleteVersions.mutateAsync({
						templateId: tpl.id,
					});
					trackVersionDeleteResult(result, tpl.id);
				} else {
					try {
						const snapshot = await deleteTemplate.mutateAsync(tpl.id);
						deletedTemplateCount += 1;
						deletedVersionCount += snapshot.versions.length;
						restoreTemplateSnapshots.push(snapshot);
					} catch (error) {
						templateErrors.push(
							`«${tpl.name}»: ${apiErrorMessage(error)}`,
						);
					}
				}
			}

			const versionsByTemplate = new Map<string, string[]>();
			for (const row of verRows) {
				if (
					systemCurrentVersionId != null &&
					row.id === systemCurrentVersionId
				) {
					continue;
				}
				const ids = versionsByTemplate.get(row.templateId) ?? [];
				ids.push(row.id);
				versionsByTemplate.set(row.templateId, ids);
			}

			for (const [templateId, versionIds] of versionsByTemplate) {
				if (!versionIds.length) continue;
				const result = await bulkDeleteVersions.mutateAsync({
					templateId,
					versionIds,
				});
				trackVersionDeleteResult(result, templateId);
			}

			setConfirmBulkDeleteOpen(false);
			setSelectedRows([]);
			listRef.current?.clearSelection();

			const notes: string[] = [];
			if (reboundQuestionnaireCount > 0) {
				notes.push(`перепривязано анкет: ${reboundQuestionnaireCount}`);
			}
			if (deletedQuestionnaireCount > 0) {
				notes.push(`удалено анкет: ${deletedQuestionnaireCount}`);
			}
			if (templateErrors.length > 0) {
				notes.push(`схемы не удалены: ${templateErrors.length}`);
			}

			if (deletedVersionCount === 0 && deletedTemplateCount === 0) {
				if (notes.length > 0) {
					toast.error("Ничего не удалено", {
						description: [...notes, ...templateErrors].join("; "),
					});
				} else {
					toast.info(
						"Нечего удалять — актуальная схема системы не затрагивается",
					);
				}
				return;
			}

			const parts: string[] = [];
			if (deletedTemplateCount > 0) {
				parts.push(`схем: ${deletedTemplateCount}`);
			}
			if (deletedVersionCount > 0) {
				parts.push(`версий: ${deletedVersionCount}`);
			}

			const descriptionParts = [
				"Актуальная схема системы сохранена",
				...notes,
			];
			if (templateErrors.length > 0) {
				descriptionParts.push(templateErrors.join("; "));
			}

			toastWithUndo(
				`Удалено ${parts.join(", ")}`,
				async () => {
					for (const snapshot of restoreTemplateSnapshots) {
						await restoreTemplate.mutateAsync(snapshot);
					}
					for (const batch of restoreVersionBatches) {
						await restoreVersions.mutateAsync(batch);
					}
					toast.success("Массовое удаление отменено");
				},
				{
					description: descriptionParts.join(". "),
				},
			);
		} catch (error) {
			toast.error("Не удалось выполнить массовое удаление", {
				description: apiErrorMessage(error),
			});
		}
	}, [
		bulkDeleteVersions,
		deleteTemplate,
		restoreTemplate,
		restoreVersions,
		selectedRows,
		systemCurrentVersionId,
	]);

	return (
		<Flex
			flexDirection="column"
			flexGrow={1}
			minHeight="0"
			height="-webkit-fill-available"
		>
			<Header>
				<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
					<Button
						component={RouterLink}
						to={routes.adminV2Guide.rootPath}
						variant="text"
					>
						Справка
					</Button>
					<Button
						variant="outlined"
						disabled={
							!selectedTemplateId || resetMutation.isPending || !templates?.length
						}
						onClick={() => setConfirmResetOpen(true)}
					>
						Сбросить к заводской схеме
					</Button>
					<Button
						variant="outlined"
						disabled={
							!selectedTemplateId || seedMutation.isPending || !templates?.length
						}
						title="Создать 3 тестовые анкеты по актуальной схеме (черновик, в работе, завершена)"
						onClick={() =>
							seedMutation.mutate(
								{ templateId: selectedTemplateId },
								{
									onSuccess: (result) => {
										toast.success(
											`Создано тестовых анкет: ${result.created.length}`,
										);
									},
									onError: (err) =>
										toast.error("Не удалось создать тестовые анкеты", {
											description: apiErrorMessage(err),
										}),
								},
							)
						}
					>
						{seedMutation.isPending ? "Создание…" : "Сид тестовых анкет"}
					</Button>
					<V2AdminButton onClick={() => setCreateDialogOpen(true)}>
						Добавить схему
					</V2AdminButton>
					<V2AdminButton
						color="error"
						variant="outlined"
						disabled={!selectedRows.length || bulkDeletePending}
						onClick={() => setConfirmBulkDeleteOpen(true)}
					>
						Удалить выбранное
						{selectedRows.length ? ` (${selectedRows.length})` : ""}
					</V2AdminButton>
				</Stack>
			</Header>

			{resetMutation.isError ? (
				<Typography color="error" variant="body2" sx={{ py: 0.5 }}>
					{resetMutation.error?.message ?? "Не удалось выполнить сброс"}
				</Typography>
			) : null}

			<V2TemplateList
				ref={listRef}
				onSelectionChange={setSelectedRows}
			/>

			<V2SchemaCreateDialog
				open={createDialogOpen}
				onClose={() => setCreateDialogOpen(false)}
			/>

			<Dialog
				open={confirmBulkDeleteOpen}
				onClose={() => setConfirmBulkDeleteOpen(false)}
			>
				<DialogTitle>Массовое удаление схем и версий</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Будет обработано выбранных строк: {selectedRows.length}.
						{selectedTemplates.length > 0 ? (
							<>
								{" "}
								Схем: {selectedTemplates.length}
								{selectedTemplates.some((t) => t.currentVersionId)
									? " — у схем с актуальной версией удалятся только прочие версии (анкеты перепривяжутся)"
									: " — схемы без актуальной версии будут удалены целиком вместе с анкетами"}
							</>
						) : null}
						{versionsWithoutSelectedTemplate.length > 0 ? (
							<>
								{" "}
								Отдельно выбранных версий:{" "}
								{versionsWithoutSelectedTemplate.length}.
							</>
						) : null}{" "}
						Полное удаление схемы из реестра — через контекстное меню
						«Удалить шаблон» (связанные анкеты удаляются вместе со схемой).
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmBulkDeleteOpen(false)}>
						Отмена
					</Button>
					<Button
						onClick={() => void runBulkDelete()}
						color="error"
						variant="contained"
						disabled={!selectedRows.length || bulkDeletePending}
					>
						Удалить
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={confirmResetOpen} onClose={() => setConfirmResetOpen(false)}>
				<DialogTitle>Сброс к заводской схеме</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Будет создана и опубликована новая версия шаблона «
						{selectedTemplate?.name ?? "…"}» с встроенным эталоном (базовая анкета, по
						мотивам v1). Текущая опубликованная версия будет заменена.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmResetOpen(false)}>Отмена</Button>
					<Button
						onClick={() => {
							if (!selectedTemplateId) return;
							resetMutation.mutate(selectedTemplateId, {
								onSuccess: () => setConfirmResetOpen(false),
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
