import { useEffect, useRef, useState } from "react";
import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	LinearProgress,
	Typography,
} from "@mui/material";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { downloadBlob } from "@react-client/common/api/queries/kanban-board";
import {
	v2QuestionnairesExportJobDownload,
	v2QuestionnairesStartExportJob,
} from "@react-client/common/api/queries/v2-questionnaires";
import { waitForV2ExportJob } from "@react-client/features/v2/anketaCRUD/utils/v2EditLockSocket";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { toast } from "@react-client/common/toasts";
import type { V2QuestionnaireExportJobStatusDto } from "@smart-anketa/api-contract";

type Props = {
	open: boolean;
	ids?: string[];
	onClose: () => void;
};

export function V2QuestionnaireExportProgressDialog({
	open,
	ids,
	onClose,
}: Props) {
	const [status, setStatus] = useState<V2QuestionnaireExportJobStatusDto | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);
	const startedForOpen = useRef(false);
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	useEffect(() => {
		if (!open) {
			startedForOpen.current = false;
			setStatus(null);
			setError(null);
			return;
		}
		if (startedForOpen.current) return;
		startedForOpen.current = true;
		const ac = new AbortController();
		void (async () => {
			try {
				const started = await v2QuestionnairesStartExportJob({
					ids,
					signal: ac.signal,
				});
				const current = await waitForV2ExportJob(started.jobId, {
					signal: ac.signal,
					onStatus: setStatus,
				});
				if (ac.signal.aborted) return;
				setStatus(current);
				if (current.status === "failed") {
					setError(current.error || "Экспорт завершился с ошибкой");
					return;
				}
				const blob = await v2QuestionnairesExportJobDownload(
					started.jobId,
					ac.signal,
				);
				downloadBlob(
					blob,
					current.filename || `v2-questionnaires-${started.jobId}.xlsx`,
				);
				toast.success(
					current.total
						? `Экспортировано анкет: ${current.total}`
						: "Экспорт завершён",
				);
				onCloseRef.current();
			} catch (err) {
				if (ac.signal.aborted) return;
				setError(apiErrorMessage(err));
			}
		})();
		return () => ac.abort();
	}, [open, ids]);

	const total = status?.total ?? 0;
	const progress = status?.progress ?? 0;
	const percent = total > 0 ? Math.min(100, Math.round((progress / total) * 100)) : 0;
	const stuckWithoutTotal =
		status?.status === "processing" && status.total == null;
	const phase =
		status?.status === "pending"
			? "В очереди…"
			: stuckWithoutTotal
				? "Готовим список анкет…"
				: status?.status === "processing"
					? "Собираем файл…"
					: status?.status === "done"
						? "Готово"
						: error
							? "Ошибка"
							: "Запускаем выгрузку…";

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Выгрузка Excel</DialogTitle>
			<DialogContent>
				<Flex flexDirection="column" gap={8}>
					<Typography variant="body2">{phase}</Typography>
					<LinearProgress
						variant={total > 0 ? "determinate" : "indeterminate"}
						value={percent}
					/>
					<Typography variant="caption" color="text.secondary">
						{total > 0
							? `${progress} из ${total} анкет (${percent}%)`
							: "Сервер готовит выгрузку. Если закрыть окно, файл всё равно соберётся — нажмите «Экспорт» ещё раз, чтобы скачать."}
					</Typography>
					{error ? (
						<>
							<Spacer space={4} />
							<Typography variant="body2" color="error">
								{error}
							</Typography>
						</>
					) : null}
				</Flex>
			</DialogContent>
			<DialogActions>
				<Button
					onClick={onClose}
					title={
						error
							? "Закрыть"
							: "Закрыть окно. Выгрузка продолжится на сервере"
					}
				>
					{error ? "Закрыть" : "Свернуть"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
