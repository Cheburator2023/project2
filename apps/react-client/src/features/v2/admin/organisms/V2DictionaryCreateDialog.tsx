import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import { useCreateV2Dictionary } from "@react-client/common/api/queries/v2-templates";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { pathForAdminV2Dictionary } from "@react-client/routing/version/v1/routing/routes";
import { useState } from "react";
import { useNavigate } from "react-router";

type Props = {
	open: boolean;
	onClose: () => void;
};

export function V2DictionaryCreateDialog({ open, onClose }: Props) {
	const navigate = useNavigate();
	const createDictionary = useCreateV2Dictionary();

	const [code, setCode] = useState("");
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");

	const reset = () => {
		setCode("");
		setName("");
		setDescription("");
	};

	const handleClose = () => {
		reset();
		onClose();
	};

	const handleSubmit = async () => {
		const trimmedCode = code.trim();
		const trimmedName = name.trim();
		if (!trimmedCode || !trimmedName) return;

		const created = await createDictionary.mutateAsync({
			code: trimmedCode,
			name: trimmedName,
			description: description.trim() || null,
		});

		handleClose();
		navigate(pathForAdminV2Dictionary(created.id));
	};

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
			<DialogTitle>Новый справочник</DialogTitle>
			<DialogContent>
				<Flex flexDirection="column">
					<TextField
						autoFocus
						margin="dense"
						label="Код"
						helperText="Уникальный идентификатор, например v2.generalInfo.complexity"
						fullWidth
						value={code}
						onChange={(e) => setCode(e.target.value)}
					/>
					<Spacer />
					<TextField
						margin="dense"
						label="Название"
						fullWidth
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
					<Spacer />
					<TextField
						margin="dense"
						label="Описание"
						fullWidth
						multiline
						minRows={2}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
					/>
				</Flex>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose}>Отмена</Button>
				<Button
					variant="contained"
					disabled={createDictionary.isPending || !code.trim() || !name.trim()}
					onClick={() => void handleSubmit()}
				>
					Создать
				</Button>
			</DialogActions>
		</Dialog>
	);
}
