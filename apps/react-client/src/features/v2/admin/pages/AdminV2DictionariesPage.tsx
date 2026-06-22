import Button from "@mui/material/Button";
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
import { V2DictionaryBulkResultDialog } from "@react-client/features/v2/admin/organisms/V2DictionaryBulkResultDialog";
import { V2DictionaryCreateDialog } from "@react-client/features/v2/admin/organisms/V2DictionaryCreateDialog";
import { V2DictionaryWorkspace } from "@react-client/features/v2/admin/organisms/V2DictionaryWorkspace";
import {
	canDeleteV2Dictionary,
	canResetV2Dictionary,
} from "@react-client/features/v2/admin/organisms/V2DictionaryList";
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

	return (
		<Flex flexDirection="column" flexGrow={1} minHeight="0" sx={{ height: "100%" }}>
			<V2DictionaryWorkspace onCreateRequest={() => setCreateOpen(true)} />
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
								Сброс для {resettableCount} заводских из {pending?.rows.length ?? 0}{" "}
								выбранных.
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
