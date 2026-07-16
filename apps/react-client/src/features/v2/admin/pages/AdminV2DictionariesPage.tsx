import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Flex } from "@react-client/common/primitives/Flex";
import {
	useBulkDeleteV2Dictionaries,
	useBulkResetV2Dictionaries,
} from "@react-client/common/api/queries/v2-templates";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { V2AdminButton } from "@react-client/features/v2/admin/atoms/V2AdminButton";
import { V2DictionaryBulkResultDialog } from "@react-client/features/v2/admin/organisms/V2DictionaryBulkResultDialog";
import { V2DictionaryCreateDialog } from "@react-client/features/v2/admin/organisms/V2DictionaryCreateDialog";
import type { V2DictionaryHeaderState } from "@react-client/features/v2/admin/organisms/V2DictionaryDetail";
import { V2DictionaryWorkspace } from "@react-client/features/v2/admin/organisms/V2DictionaryWorkspace";
import {
	canDeleteV2Dictionary,
	canResetV2Dictionary,
} from "@react-client/features/v2/admin/organisms/V2DictionaryList";
import { commonRoutes as routes } from "@react-client/routing/common/routes";
import type {
	BulkDeleteV2DictionariesResultDto,
	BulkResetV2DictionariesResultDto,
	V2DictionaryDto,
} from "@smart-anketa/api-contract";
import { useCallback, useState } from "react";

type PendingBulk = { kind: "delete" | "reset"; rows: V2DictionaryDto[] };

type BulkResultState =
	| {
			kind: "delete";
			result: BulkDeleteV2DictionariesResultDto;
	  }
	| {
			kind: "reset";
			result: BulkResetV2DictionariesResultDto;
	  };

export function AdminV2DictionariesPage() {
	const [createOpen, setCreateOpen] = useState(false);
	const [pending, setPending] = useState<PendingBulk | null>(null);
	const [bulkResult, setBulkResult] = useState<BulkResultState | null>(null);
	const [checkedDictionaries, setCheckedDictionaries] = useState<
		V2DictionaryDto[]
	>([]);
	const [selectionResetKey, setSelectionResetKey] = useState(0);
	const [detailHeader, setDetailHeader] = useState<V2DictionaryHeaderState | null>(
		null,
	);

	const bulkDelete = useBulkDeleteV2Dictionaries();
	const bulkReset = useBulkResetV2Dictionaries();

	const runBulkDelete = useCallback(
		(rows: V2DictionaryDto[]) => {
			if (!rows.length) return;
			bulkDelete.mutate(
				rows.map((r) => r.id),
				{
					onSuccess: (result) => {
						setPending(null);
						setCheckedDictionaries([]);
						setSelectionResetKey((key) => key + 1);
						setBulkResult({ kind: "delete", result });
					},
				},
			);
		},
		[bulkDelete],
	);

	const runBulkReset = useCallback(
		(rows: V2DictionaryDto[]) => {
			if (!rows.length) return;
			bulkReset.mutate(
				rows.map((r) => r.id),
				{
					onSuccess: (result) => {
						setPending(null);
						setCheckedDictionaries([]);
						setSelectionResetKey((key) => key + 1);
						setBulkResult({ kind: "reset", result });
					},
				},
			);
		},
		[bulkReset],
	);

	const confirmPending = useCallback(() => {
		if (!pending) return;
		if (pending.kind === "delete") runBulkDelete(pending.rows);
		else runBulkReset(pending.rows);
	}, [pending, runBulkDelete, runBulkReset]);

	const deletableCount = pending
		? pending.rows.filter(canDeleteV2Dictionary).length
		: 0;
	const resettableCount = pending
		? pending.rows.filter(canResetV2Dictionary).length
		: 0;

	const deletableChecked = checkedDictionaries.filter(canDeleteV2Dictionary);
	const resettableChecked = checkedDictionaries.filter(canResetV2Dictionary);

	return (
		<Flex
			flexDirection="column"
			flexGrow={1}
			minHeight="0"
			sx={{ height: "100%" }}
		>
			<Header
				title={detailHeader?.title ?? routes.adminV2Dictionaries.name}
				leadingAccessory={
					detailHeader ? (
						<Typography
							component="span"
							variant="caption"
							sx={{ fontFamily: "monospace", color: "text.secondary" }}
						>
							{detailHeader.code}
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
					{detailHeader ? (
						<>
							{!detailHeader.isEditing ? (
								<Button
									variant="outlined"
									onClick={detailHeader.onStartEdit}
								>
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
							)}
						</>
					) : null}
					<V2AdminButton onClick={() => setCreateOpen(true)}>
						Создать справочник
					</V2AdminButton>
					<Button
						variant="outlined"
						color="warning"
						disabled={checkedDictionaries.length === 0 || bulkReset.isPending}
						title={
							checkedDictionaries.length > 0 && resettableChecked.length === 0
								? "Сброс доступен только для заводских справочников"
								: undefined
						}
						onClick={() =>
							checkedDictionaries.length > 0 &&
							setPending({ kind: "reset", rows: checkedDictionaries })
						}
					>
						{checkedDictionaries.length > 0
							? `Сбросить (${checkedDictionaries.length})`
							: "Сбросить к заводским"}
					</Button>
					<div
						title={
							checkedDictionaries.length > 0 && deletableChecked.length === 0
								? "Нельзя удалить заводской или используемый в схемах справочник"
								: undefined
						}
					>
						<V2AdminButton
							color="error"
							variant="outlined"
							disabled={checkedDictionaries.length === 0 || bulkDelete.isPending}
							onClick={() =>
								checkedDictionaries.length > 0 &&
								setPending({ kind: "delete", rows: checkedDictionaries })
							}
						>
							{checkedDictionaries.length > 0
								? `Удалить (${checkedDictionaries.length})`
								: "Удалить"}
						</V2AdminButton>
					</div>
				</Stack>
			</Header>

			{bulkDelete.isError ? (
				<Typography color="error" variant="body2" sx={{ py: 0.5 }}>
					{bulkDelete.error?.message ?? "Не удалось удалить справочники"}
				</Typography>
			) : null}
			{bulkReset.isError ? (
				<Typography color="error" variant="body2" sx={{ py: 0.5 }}>
					{bulkReset.error?.message ?? "Не удалось сбросить справочники"}
				</Typography>
			) : null}

			<Flex flexDirection="column" flexGrow={1} minHeight="0" sx={{ overflow: "hidden" }}>
				<V2DictionaryWorkspace
					showListCreateButton={false}
					onCreateRequest={() => setCreateOpen(true)}
					onCheckedDictionariesChange={setCheckedDictionaries}
					selectionResetKey={selectionResetKey}
					onHeaderChange={setDetailHeader}
				/>
			</Flex>

			<V2DictionaryCreateDialog
				open={createOpen}
				onClose={() => setCreateOpen(false)}
			/>

			<Dialog open={pending !== null} onClose={() => setPending(null)}>
				<DialogTitle>
					{pending?.kind === "delete"
						? "Удаление справочников"
						: "Сброс к заводским значениям"}
				</DialogTitle>
				<DialogContent>
					<DialogContentText>
						{pending?.kind === "delete" ? (
							<>
								Попытка удалить {pending.rows.length} справочник(ов). Заводские
								и привязанные к схемам шаблонов не удаляются
								{deletableCount < pending.rows.length
									? ` (к удалению допускается ${deletableCount})`
									: ""}
								.
							</>
						) : (
							<>
								Сброс для {resettableCount} заводских из{" "}
								{pending?.rows.length ?? 0} выбранных.
							</>
						)}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setPending(null)}>Отмена</Button>
					<Button
						onClick={confirmPending}
						color={pending?.kind === "delete" ? "error" : "warning"}
						variant="contained"
						disabled={
							!pending?.rows.length ||
							bulkDelete.isPending ||
							bulkReset.isPending
						}
					>
						{pending?.kind === "delete" ? "Удалить" : "Сбросить"}
					</Button>
				</DialogActions>
			</Dialog>

			{bulkResult?.kind === "delete" ? (
				<V2DictionaryBulkResultDialog
					open
					title="Результат удаления"
					successCount={bulkResult.result.deletedIds.length}
					successLabel="Удалено"
					failed={bulkResult.result.failed}
					onClose={() => setBulkResult(null)}
				/>
			) : null}
			{bulkResult?.kind === "reset" ? (
				<V2DictionaryBulkResultDialog
					open
					title="Результат сброса"
					successCount={bulkResult.result.resetIds.length}
					successLabel="Сброшено"
					failed={bulkResult.result.failed}
					onClose={() => setBulkResult(null)}
				/>
			) : null}
		</Flex>
	);
}
