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
	invalidateV2TemplatesList,
	invalidateV2TemplateVersions,
	removeV2TemplateFromCache,
	useResetV2TemplateToDefault,
	useRestoreV2Template,
	useRestoreV2TemplateVersions,
	useUpdateV2FactorySnapshotSetting,
	useV2FactorySnapshotSetting,
	useV2TemplateRegistry,
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
import { useQueryClient } from "@tanstack/react-query";

export function AdminV2SchemasPage() {
	const queryClient = useQueryClient();
	const resetMutation = useResetV2TemplateToDefault();
	const seedMutation = useSeedV2TestQuestionnaires();
	const bulkDeleteVersions = useBulkDeleteV2TemplateVersions();
	const deleteTemplate = useDeleteV2Template();
	const restoreTemplate = useRestoreV2Template();
	const restoreVersions = useRestoreV2TemplateVersions();
	const { data: registry } = useV2TemplateRegistry();
	const templates = registry?.items;
	const { data: factorySetting } = useV2FactorySnapshotSetting();
	const setFactorySnapshot = useUpdateV2FactorySnapshotSetting();
	const listRef = useRef<V2TemplateListHandle>(null);

	const [selectedTemplateId, setSelectedTemplateId] = useState("");
	const [confirmResetOpen, setConfirmResetOpen] = useState(false);
	const [confirmSetFactoryOpen, setConfirmSetFactoryOpen] = useState(false);
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [selectedRows, setSelectedRows] = useState<V2SchemaGridRow[]>([]);
	const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

	const systemCurrentVersionId = useMemo(() => {
		const holder = templates?.find((t) => t.currentVersionId);
		return holder?.currentVersionId ?? null;
	}, [templates]);

	const { templates: selectedTemplates, versionsWithoutSelectedTemplate } =
		useMemo(() => splitSelectedSchemaRows(selectedRows), [selectedRows]);

	const bulkDeletePending =
		bulkDeleteVersions.isPending || deleteTemplate.isPending;

	useEffect(() => {
		if (!selectedTemplateId && templates?.length) {
			const withCurrent = templates.find((t) => t.currentVersionId);
			setSelectedTemplateId(withCurrent?.id ?? templates[0].id);
		}
	}, [templates, selectedTemplateId]);

	const actionTargetTemplate = useMemo(() => {
		if (selectedTemplates.length === 1) {
			return selectedTemplates[0];
		}
		return (
			templates?.find((t) => t.id === selectedTemplateId) ??
			templates?.find((t) => t.currentVersionId) ??
			templates?.[0]
		);
	}, [selectedTemplates, selectedTemplateId, templates]);

	const selectedTemplate = actionTargetTemplate;

	const factoryTarget = useMemo(() => {
		if (versionsWithoutSelectedTemplate.length === 1) {
			const version = versionsWithoutSelectedTemplate[0];
			return { templateId: version.templateId, versionId: version.id };
		}
		if (
			selectedTemplates.length === 1 &&
			versionsWithoutSelectedTemplate.length === 0
		) {
			const template = selectedTemplates[0];
			if (!template.currentVersionId) return null;
			return { templateId: template.id, versionId: template.currentVersionId };
		}
		return null;
	}, [selectedTemplates, versionsWithoutSelectedTemplate]);

	const factorySettingLabel = useMemo(() => {
		if (!factorySetting) return "…";
		if (factorySetting.source === "builtin") {
			return "встроенный JSON-снимок";
		}
		if (factorySetting.templateName) {
			const version =
				factorySetting.versionNumber != null
					? ` v${factorySetting.versionNumber}`
					: "";
			return `«${factorySetting.templateName}»${version}`;
		}
		return "схема из БД";
	}, [factorySetting]);

	const handleGridSelectionChange = useCallback((rows: V2SchemaGridRow[]) => {
		setSelectedRows(rows);
		const { templates: tplRows } = splitSelectedSchemaRows(rows);
		if (tplRows.length === 1) {
			setSelectedTemplateId(tplRows[0].id);
		}
	}, []);

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
		const affectedTemplateIds = new Set<string>();
		const deletedTemplateIds = new Set<string>();

		const trackVersionDeleteResult = (
			result: {
				deletedVersionIds: string[];
				reboundQuestionnaireCount?: number;
				deletedQuestionnaireCount?: number;
				snapshot: V2TemplateVersionDto[];
			},
			templateId: string,
		) => {
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
						skipCacheRefresh: true,
					});
					affectedTemplateIds.add(tpl.id);
					trackVersionDeleteResult(result, tpl.id);
				} else {
					try {
						const snapshot = await deleteTemplate.mutateAsync({
							id: tpl.id,
							skipCacheRefresh: true,
						});
						deletedTemplateCount += 1;
						deletedVersionCount += snapshot.versions.length;
						deletedTemplateIds.add(tpl.id);
						affectedTemplateIds.add(tpl.id);
						restoreTemplateSnapshots.push(snapshot);
					} catch (error) {
						templateErrors.push(`«${tpl.name}»: ${apiErrorMessage(error)}`);
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
					skipCacheRefresh: true,
				});
				affectedTemplateIds.add(templateId);
				trackVersionDeleteResult(result, templateId);
			}

			void invalidateV2TemplatesList(queryClient);
			for (const templateId of affectedTemplateIds) {
				if (deletedTemplateIds.has(templateId)) {
					void removeV2TemplateFromCache(queryClient, templateId);
				} else {
					void invalidateV2TemplateVersions(queryClient, templateId);
					void queryClient.invalidateQueries({
						queryKey: ["v2-templates", templateId],
						exact: true,
					});
				}
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

			const descriptionParts = ["Актуальная схема системы сохранена", ...notes];
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
		queryClient,
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
				<Stack
					direction="row"
					spacing={1}
					alignItems="center"
					flexWrap="wrap"
					useFlexGap
				>
					<Button
						component={RouterLink}
						to={routes.adminV2Guide.rootPath}
						variant="text"
					>
						Справка
					</Button>
					<Button
						variant="outlined"
						disabled={!factoryTarget || setFactorySnapshot.isPending}
						onClick={() => setConfirmSetFactoryOpen(true)}
						title={
							factoryTarget
								? "Новые схемы и сброс к заводской будут брать снимок выбранной версии"
								: "Выберите одну схему с актуальной версией или одну версию в таблице"
						}
					>
						Назначить заводским эталоном
					</Button>
					<Button
						variant="outlined"
						disabled={
							!actionTargetTemplate?.id ||
							resetMutation.isPending ||
							!templates?.length
						}
						onClick={() => setConfirmResetOpen(true)}
					>
						Сбросить к заводской схеме
					</Button>
					<Button
						variant="outlined"
						disabled={
							!actionTargetTemplate?.id ||
							seedMutation.isPending ||
							!templates?.length
						}
						title={
							actionTargetTemplate
								? `Создать 3 тестовые анкеты по схеме «${actionTargetTemplate.name}» (нужна опубликованная версия)`
								: "Выберите схему в таблице"
						}
						onClick={() =>
							seedMutation.mutate(
								{ templateId: actionTargetTemplate!.id },
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
					<V2AdminButton
						onClick={() => setCreateDialogOpen(true)}
						data-test-id="admin-btn-add-schema"
					>
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
				factorySnapshot={factorySetting ?? null}
				onSelectionChange={handleGridSelectionChange}
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
						Полное удаление схемы из реестра — через контекстное меню «Удалить
						шаблон» (связанные анкеты удаляются вместе со схемой).
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

			<Dialog
				open={confirmResetOpen}
				onClose={() => setConfirmResetOpen(false)}
			>
				<DialogTitle>Сброс к заводской схеме</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Будет создана и опубликована новая версия шаблона «
						{selectedTemplate?.name ?? "…"}» из текущего заводского эталона (
						{factorySettingLabel}). Текущая опубликованная версия будет
						заменена.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmResetOpen(false)}>Отмена</Button>
					<Button
						onClick={() => {
							if (!actionTargetTemplate?.id) return;
							resetMutation.mutate(actionTargetTemplate.id, {
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

			<Dialog
				open={confirmSetFactoryOpen}
				onClose={() => setConfirmSetFactoryOpen(false)}
			>
				<DialogTitle>Назначить заводским эталоном</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Новые схемы (режим «Заводская схема») и сброс к заводской будут
						копировать выбранную версию. Встроенный JSON-снимок в репозитории
						останется — его можно вернуть в Настройках.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmSetFactoryOpen(false)}>
						Отмена
					</Button>
					<Button
						variant="contained"
						disabled={!factoryTarget || setFactorySnapshot.isPending}
						onClick={() => {
							if (!factoryTarget) return;
							setFactorySnapshot.mutate(
								{
									source: "template",
									templateId: factoryTarget.templateId,
									versionId: factoryTarget.versionId,
								},
								{
									onSuccess: () => {
										setConfirmSetFactoryOpen(false);
										toast.success("Заводской эталон обновлён");
									},
									onError: (err) =>
										toast.error("Не удалось назначить эталон", {
											description: apiErrorMessage(err),
										}),
								},
							);
						}}
					>
						Назначить
					</Button>
				</DialogActions>
			</Dialog>
		</Flex>
	);
}
