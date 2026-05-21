import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
	useCreateV2Template,
	useCreateV2TemplateVersion,
	useCreateV2TemplateVersionFromDefault,
} from "@react-client/common/api/queries/v2-templates";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { toast } from "@react-client/common/toasts";
import { EMPTY_JSON_SCHEMA } from "@react-client/features/v2/admin_constructor/utils/coerceV2TemplateSnapshot";
import { pathForAdminV2Template } from "@react-client/routing/common/pathHelpers";
import { useState } from "react";
import { useNavigate } from "react-router";

export type V2SchemaInitialKind = "empty" | "default";

type Props = {
	open: boolean;
	onClose: () => void;
};

export function V2SchemaCreateDialog({ open, onClose }: Props) {
	const navigate = useNavigate();
	const createTemplate = useCreateV2Template();
	const createVersion = useCreateV2TemplateVersion();
	const createFromDefault = useCreateV2TemplateVersionFromDefault();

	const [name, setName] = useState("Новая схема");
	const [description, setDescription] = useState("Краткое описание для админки");
	const [initialKind, setInitialKind] = useState<V2SchemaInitialKind>("default");

	const pending =
		createTemplate.isPending ||
		createVersion.isPending ||
		createFromDefault.isPending;

	const reset = () => {
		setName("Новая схема");
		setDescription("Краткое описание для админки");
		setInitialKind("default");
	};

	const handleClose = () => {
		if (pending) return;
		reset();
		onClose();
	};

	const handleSubmit = async () => {
		const trimmedName = name.trim();
		if (!trimmedName) return;

		try {
			const created = await createTemplate.mutateAsync({
				code: `schema-${Date.now()}`,
				name: trimmedName,
				description: description.trim() || null,
			});

			if (initialKind === "empty") {
				await createVersion.mutateAsync({
					templateId: created.id,
					dto: {
						jsonSchema: structuredClone(EMPTY_JSON_SCHEMA),
						uiSchema: {},
						logic: { rules: [] },
						dictionariesSnapshot: { referencedDictionaryCodes: [] },
						releaseNotes: "Пустой черновик",
					},
				});
			} else {
				await createFromDefault.mutateAsync(created.id);
			}

			toast.success(
				initialKind === "empty"
					? "Схема создана с пустым черновиком"
					: "Схема создана из заводского эталона",
			);
			reset();
			onClose();
			navigate(pathForAdminV2Template(created.id));
		} catch (error) {
			toast.error("Не удалось создать схему", {
				description: apiErrorMessage(error),
			});
		}
	};

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
			<DialogTitle>Новая схема</DialogTitle>
			<DialogContent>
				<Flex flexDirection="column">
					<TextField
						autoFocus
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
					<Spacer />
					<FormControl component="fieldset" margin="dense">
						<FormLabel component="legend">Начальное содержимое</FormLabel>
						<RadioGroup
							value={initialKind}
							onChange={(e) =>
								setInitialKind(e.target.value as V2SchemaInitialKind)
							}
						>
							<FormControlLabel
								value="default"
								control={<Radio />}
								label={
									<Flex flexDirection="column" gap={0.25}>
										<Typography variant="body2" fontWeight={600}>
											Заводская схема
										</Typography>
										<Typography variant="caption" color="text.secondary">
											Эталон анкеты калькуляции (поля и UI из встроенного
											снимка). Создаётся черновик для редактирования.
										</Typography>
									</Flex>
								}
								sx={{ alignItems: "flex-start", ml: 0, mr: 0 }}
							/>
							<FormControlLabel
								value="empty"
								control={<Radio />}
								label={
									<Flex flexDirection="column" gap={0.25}>
										<Typography variant="body2" fontWeight={600}>
											Пустая схема
										</Typography>
										<Typography variant="caption" color="text.secondary">
											Минимальный JSON Schema с пустым объектом и пустым
											черновиком.
										</Typography>
									</Flex>
								}
								sx={{ alignItems: "flex-start", ml: 0, mr: 0 }}
							/>
						</RadioGroup>
					</FormControl>
				</Flex>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose} disabled={pending}>
					Отмена
				</Button>
				<Button
					variant="contained"
					disabled={pending || !name.trim()}
					onClick={() => void handleSubmit()}
				>
					Создать
				</Button>
			</DialogActions>
		</Dialog>
	);
}
