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
	useV2FactorySnapshotSetting,
} from "@react-client/common/api/queries/v2-templates";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { toast } from "@react-client/common/toasts";
import { buildEmptyV2AnketaTemplateSnapshot } from "@smart-anketa/api-contract";
import {
	coerceJsonSchema,
	coerceUiSchema,
} from "@react-client/features/v2/admin_constructor/utils/coerceV2TemplateSnapshot";
import { pathForAdminV2Template } from "@react-client/routing/common/pathHelpers";
import { useUserStore } from "@react-client/common/store/userStore";
import { format } from "date-fns/esm";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

export function buildDefaultV2SchemaName(
	username: string | null | undefined,
	at: Date = new Date(),
): string {
	const dateLabel = format(at, "dd.MM.yyyy");
	const trimmedUser = username?.trim();
	return trimmedUser
		? `Схема ${trimmedUser} ${dateLabel}`
		: `Схема ${dateLabel}`;
}

export type V2SchemaInitialKind = "empty" | "default" | "defaultWithoutTypicalWorks";

type Props = {
	open: boolean;
	onClose: () => void;
};

export function V2SchemaCreateDialog({ open, onClose }: Props) {
	const navigate = useNavigate();
	const username = useUserStore((state) => state.username);
	const createTemplate = useCreateV2Template();
	const createVersion = useCreateV2TemplateVersion();
	const createFromDefault = useCreateV2TemplateVersionFromDefault();
	const { data: factorySetting } = useV2FactorySnapshotSetting();

	const factorySourceHint =
		factorySetting?.source === "template" && factorySetting.templateName
			? `схема «${factorySetting.templateName}»${
					factorySetting.versionNumber != null
						? ` v${factorySetting.versionNumber}`
						: ""
				}`
			: "встроенный JSON-снимок";

	const [name, setName] = useState(() => buildDefaultV2SchemaName(null));
	const [description, setDescription] = useState("Краткое описание для админки");
	const [initialKind, setInitialKind] = useState<V2SchemaInitialKind>("default");

	const reset = useCallback(() => {
		setName(buildDefaultV2SchemaName(username));
		setDescription("Краткое описание для админки");
		setInitialKind("default");
	}, [username]);

	useEffect(() => {
		if (open) {
			setName(buildDefaultV2SchemaName(username));
		}
	}, [open, username]);

	const pending =
		createTemplate.isPending ||
		createVersion.isPending ||
		createFromDefault.isPending;

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
				const emptySnapshot = buildEmptyV2AnketaTemplateSnapshot();
				await createVersion.mutateAsync({
					templateId: created.id,
					dto: {
						jsonSchema: coerceJsonSchema(emptySnapshot.jsonSchema),
						uiSchema: coerceUiSchema(emptySnapshot.uiSchema),
						logic: { rules: [] },
						dictionariesSnapshot: { referencedDictionaryCodes: [] },
						releaseNotes: "Пустой черновик",
					},
				});
			} else {
				await createFromDefault.mutateAsync({
					templateId: created.id,
					withoutTypicalWorks: initialKind === "defaultWithoutTypicalWorks",
				});
			}

			toast.success(
				initialKind === "empty"
					? "Схема создана с пустым черновиком"
					: initialKind === "defaultWithoutTypicalWorks"
						? "Схема создана из эталона без типовых работ"
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
											Эталон анкеты ({factorySourceHint}). Создаётся
											черновик для редактирования.
										</Typography>
									</Flex>
								}
								sx={{ alignItems: "flex-start", ml: 0, mr: 0 }}
							/>
							<FormControlLabel
								value="defaultWithoutTypicalWorks"
								control={<Radio />}
								label={
									<Flex flexDirection="column" gap={0.25}>
										<Typography variant="body2" fontWeight={600}>
											Заводская схема без типовых работ
										</Typography>
										<Typography variant="caption" color="text.secondary">
											Структура эталона ({factorySourceHint}) без сида
											типовых работ и без их JsonLogic-правил.
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
