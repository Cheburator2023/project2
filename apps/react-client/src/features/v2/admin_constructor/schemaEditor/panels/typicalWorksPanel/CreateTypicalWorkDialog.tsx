import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { SelectWithPlaceholder } from "@react-client/common/muiCustom/SelectWithPlaceholder";
import { WORK_ARCH_COMPONENT_TYPES } from "./typicalWorkPatchErrors";

type CreateTypicalWorkDialogProps = {
	open: boolean;
	pending: boolean;
	onClose: () => void;
	onSubmit: (payload: { name: string; archComponentType: string }) => void;
};

export function CreateTypicalWorkDialog({
	open,
	pending,
	onClose,
	onSubmit,
}: CreateTypicalWorkDialogProps) {
	const [name, setName] = useState("");
	const [archComponentType, setArchComponentType] = useState<string>(
		WORK_ARCH_COMPONENT_TYPES[0],
	);

	useEffect(() => {
		if (!open) {
			setName("");
			setArchComponentType(WORK_ARCH_COMPONENT_TYPES[0]);
		}
	}, [open]);

	const trimmed = name.trim();
	const canSubmit =
		trimmed.length > 0 && trimmed.length <= 255 && archComponentType.length > 0;

	return (
		<Dialog open={open} onClose={pending ? undefined : onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Новая типовая работа</DialogTitle>
			<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
				<TextField
					autoFocus
					label="Название работы"
					value={name}
					onChange={(e) => setName(e.target.value)}
					helperText="1–255 символов"
				/>
				<FormControl fullWidth>
					<SelectWithPlaceholder
						placeholder="Тип арх. компонента"
						value={archComponentType}
						onChange={(e) => setArchComponentType(String(e.target.value))}
					>
						{WORK_ARCH_COMPONENT_TYPES.map((type) => (
							<MenuItem key={type} value={type}>
								{type}
							</MenuItem>
						))}
					</SelectWithPlaceholder>
				</FormControl>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={pending}>
					Отмена
				</Button>
				<Button
					variant="contained"
					disabled={!canSubmit || pending}
					onClick={() => onSubmit({ name: trimmed, archComponentType })}
				>
					Создать
				</Button>
			</DialogActions>
		</Dialog>
	);
}
