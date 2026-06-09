import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { Flex } from "@react-client/common/primitives/Flex";
import {
	useBulkDeleteV2Dictionaries,
	useBulkResetV2Dictionaries,
} from "@react-client/common/api/queries/v2-templates";
import { V2AdminButton } from "@react-client/features/v2/admin/atoms/V2AdminButton";
import { V2DictionaryBulkResultDialog } from "@react-client/features/v2/admin/organisms/V2DictionaryBulkResultDialog";
import { V2DictionaryCreateDialog } from "@react-client/features/v2/admin/organisms/V2DictionaryCreateDialog";
import {
	canDeleteV2Dictionary,
	canResetV2Dictionary,
	V2DictionaryList,
} from "@react-client/features/v2/admin/organisms/V2DictionaryList";
import { Header } from "@react-client/common/navigation/organisms/Header";
import type {
	BulkDeleteV2DictionariesResultDto,
	BulkResetV2DictionariesResultDto,
	V2DictionaryDto,
} from "@smart-anketa/api-contract";
import { useCallback, useMemo, useState } from "react";
import { Spacer } from "@react-client/common/primitives/Spacer";

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
	const [selected, setSelected] = useState<V2DictionaryDto[]>([]);
	const [pending, setPending] = useState<PendingBulk | null>(null);
	const [bulkResult, setBulkResult] = useState<BulkResultState | null>(null);
	const [quickFilter, setQuickFilter] = useState("");

	const bulkDelete = useBulkDeleteV2Dictionaries();
	const bulkReset = useBulkResetV2Dictionaries();

	const resettableSelected = useMemo(
		() => selected.filter(canResetV2Dictionary),
		[selected],
	);
	const deletableCount = useMemo(
		() => selected.filter(canDeleteV2Dictionary).length,
		[selected],
	);

	const runBulkDelete = useCallback(
		(rows: V2DictionaryDto[]) => {
			if (!rows.length) return;
			bulkDelete.mutate(
				rows.map((r) => r.id),
				{
					onSuccess: (result) => {
						setPending(null);
						setBulkResult({ kind: "delete", result });
						setSelected([]);
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

	return (
		<Flex flexDirection="column" flexGrow={1} minHeight="0">
			<Header>
				<Flex gap={1} wrap="wrap" alignItems="center">
					<TextField
						size="small"
						placeholder="Поиск по коду, названию, категории…"
						value={quickFilter}
						onChange={(e) => setQuickFilter(e.target.value)}
						sx={{
							width: { xs: "100%", sm: 320 },
							maxWidth: 420,
							flexShrink: 0,
						}}
						inputProps={{ "aria-label": "Поиск справочников" }}
					/>
					<Spacer />
					<V2AdminButton onClick={() => setCreateOpen(true)}>
						Создать справочник
					</V2AdminButton>
					<Button
						variant="outlined"
						color="warning"
						disabled={
							!resettableSelected.length ||
							bulkReset.isPending ||
							bulkDelete.isPending
						}
						onClick={() => setPending({ kind: "reset", rows: selected })}
					>
						Сбросить по умолчанию
						{resettableSelected.length ? ` (${resettableSelected.length})` : ""}
					</Button>
					<V2AdminButton
						color="error"
						variant="outlined"
						disabled={
							!selected.length || bulkDelete.isPending || bulkReset.isPending
						}
						onClick={() => setPending({ kind: "delete", rows: selected })}
					>
						Удалить выбранные
						{selected.length ? ` (${selected.length})` : ""}
					</V2AdminButton>
				</Flex>
			</Header>
			<V2DictionaryList
				quickFilter={quickFilter}
				onSelectionChange={setSelected}
				onDeleteRequest={(rows: V2DictionaryDto[]) =>
					setPending({ kind: "delete", rows })
				}
				onResetRequest={(rows: V2DictionaryDto[]) =>
					setPending({ kind: "reset", rows })
				}
			/>
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
								Сброс для {resettableSelected.length} заводских из{" "}
								{pending?.rows.length ?? 0} выбранных. Элементы вернутся к
								эталонным значениям; остальные будут пропущены.
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
