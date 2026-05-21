import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import type { V2TemplateStatus } from "@smart-anketa/api-contract";
import { useEffect, useState } from "react";

import { V2_TEMPLATE_VERSION_STATUS_RU } from "../utils/v2TemplateVersionLabels";

type Props = {
	open: boolean;
	onClose: () => void;
	versionNumber: number;
	versionStatus: V2TemplateStatus;
	isSystemCurrent: boolean;
	savePending: boolean;
	onSaveAsNewVersion: (releaseNotes: string) => void | Promise<void>;
	onSaveInPlace: () => void | Promise<void>;
};

export function V2TemplateSaveDialog({
	open,
	onClose,
	versionNumber,
	versionStatus,
	isSystemCurrent,
	savePending,
	onSaveAsNewVersion,
	onSaveInPlace,
}: Props) {
	const [releaseNotes, setReleaseNotes] = useState("");
	const [confirmInPlaceOpen, setConfirmInPlaceOpen] = useState(false);

	const canSaveInPlace = versionStatus === "draft";

	useEffect(() => {
		if (!open) {
			setReleaseNotes("");
			setConfirmInPlaceOpen(false);
		}
	}, [open]);

	const handleSaveInPlaceClick = () => {
		if (!canSaveInPlace) return;
		if (isSystemCurrent) {
			setConfirmInPlaceOpen(true);
			return;
		}
		void onSaveInPlace();
	};

	const handleConfirmInPlace = () => {
		setConfirmInPlaceOpen(false);
		void onSaveInPlace();
	};

	return (
		<>
			<Dialog open={open && !confirmInPlaceOpen} onClose={onClose} maxWidth="sm" fullWidth>
				<DialogTitle>Сохранение схемы</DialogTitle>
				<DialogContent>
					<DialogContentText sx={{ mb: 2 }}>
						Версия v{versionNumber} (
						{V2_TEMPLATE_VERSION_STATUS_RU[versionStatus] ?? versionStatus}
						). Выберите способ сохранения изменений.
					</DialogContentText>
					<Flex flexDirection="column" gap={2}>
						<TextField
							label="Комментарий к новой версии"
							placeholder="Необязательно"
							fullWidth
							multiline
							minRows={2}
							value={releaseNotes}
							onChange={(e) => setReleaseNotes(e.target.value)}
							helperText="Используется при создании новой версии-черновика"
						/>
					</Flex>
				</DialogContent>
				<DialogActions sx={{ flexDirection: "column", alignItems: "stretch", px: 3, pb: 2 }}>
					<Flex gap={6} justifyContent="flex-end">
					<Button onClick={onClose} disabled={savePending}>
						Отмена
					</Button>

					<Button
						variant="outlined"
						disabled={savePending || !canSaveInPlace}
						onClick={handleSaveInPlaceClick}
					>
						Сохранить в этой версии
					</Button>

					<Button
						variant="contained"
						disabled={savePending}
						onClick={() => void onSaveAsNewVersion(releaseNotes.trim())}
					>
						Новая версия (черновик)
					</Button>

					{!canSaveInPlace ? (
						<DialogContentText variant="caption" color="text.secondary" sx={{ mt: 1 }}>
							Опубликованную или архивную версию можно изменить только через создание
							нового черновика.
						</DialogContentText>
					) : null}
					</Flex>
				</DialogActions>
			</Dialog>

			<Dialog
				open={confirmInPlaceOpen}
				onClose={() => setConfirmInPlaceOpen(false)}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle>Перезаписать актуальную версию?</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Версия v{versionNumber} является актуальной схемой системы. Сохранение
						перезапишет её содержимое без публикации новой версии. Продолжить?
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmInPlaceOpen(false)} disabled={savePending}>
						Отмена
					</Button>
					<Button
						variant="contained"
						color="warning"
						disabled={savePending}
						onClick={handleConfirmInPlace}
					>
						Сохранить в этой версии
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
