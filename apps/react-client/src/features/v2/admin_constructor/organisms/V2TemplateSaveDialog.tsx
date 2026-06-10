import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import { Flex } from "@react-client/common/primitives/Flex";
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

	const handleClose = () => {
		if (savePending) return;
		onClose();
	};

	return (
		<>
			<Dialog
				open={open && !confirmInPlaceOpen}
				onClose={handleClose}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>Сохранение схемы</DialogTitle>
				<DialogContent sx={{ position: "relative" }}>
					{savePending ? (
						<Box
							sx={{
								position: "absolute",
								inset: 0,
								zIndex: 1,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								bgcolor: "rgba(255, 255, 255, 0.72)",
							}}
						>
							<CircularProgress size={36} />
						</Box>
					) : null}
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
				<DialogActions
					sx={{ flexDirection: "column", alignItems: "stretch", px: 3, pb: 2 }}
				>
					<Flex gap={6} justifyContent="flex-end">
						<Button onClick={handleClose} disabled={savePending}>
							Отмена
						</Button>

						<Button
							variant="outlined"
							disabled={savePending || !canSaveInPlace}
							onClick={handleSaveInPlaceClick}
							startIcon={
								savePending ? (
									<CircularProgress size={16} color="inherit" />
								) : undefined
							}
						>
							{savePending ? "Сохранение…" : "Сохранить в этой версии"}
						</Button>

						<Button
							variant="contained"
							disabled={savePending}
							onClick={() => void onSaveAsNewVersion(releaseNotes.trim())}
							startIcon={
								savePending ? (
									<CircularProgress size={16} color="inherit" />
								) : undefined
							}
						>
							{savePending ? "Сохранение…" : "Новая версия (черновик)"}
						</Button>
					</Flex>
				</DialogActions>
			</Dialog>

			<Dialog
				open={confirmInPlaceOpen}
				onClose={() => {
					if (savePending) return;
					setConfirmInPlaceOpen(false);
				}}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle>Перезаписать актуальную версию?</DialogTitle>
				<DialogContent sx={{ position: "relative" }}>
					{savePending ? (
						<Box
							sx={{
								position: "absolute",
								inset: 0,
								zIndex: 1,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								bgcolor: "rgba(255, 255, 255, 0.72)",
							}}
						>
							<CircularProgress size={32} />
						</Box>
					) : null}
					<DialogContentText>
						Версия v{versionNumber} является актуальной схемой системы.
						Сохранение перезапишет её содержимое без публикации новой версии.
						Продолжить?
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => setConfirmInPlaceOpen(false)}
						disabled={savePending}
					>
						Отмена
					</Button>
					<Button
						variant="contained"
						color="warning"
						disabled={savePending}
						onClick={handleConfirmInPlace}
						startIcon={
							savePending ? (
								<CircularProgress size={16} color="inherit" />
							) : undefined
						}
					>
						{savePending ? "Сохранение…" : "Сохранить в этой версии"}
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
