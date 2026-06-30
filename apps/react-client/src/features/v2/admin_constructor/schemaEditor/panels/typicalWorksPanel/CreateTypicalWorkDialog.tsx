import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { SelectWithPlaceholder } from "@react-client/common/muiCustom/SelectWithPlaceholder";
import { DEFAULT_WORK_STREAMS } from "./typicalWorksUi";
import { WORK_ARCH_COMPONENT_TYPES } from "./typicalWorkPatchErrors";

export type CreateTypicalWorkDialogPayload = {
	name: string;
	archComponentType: string;
	streamExecutor?: string;
	starterNormValue?: number;
};

type CreateTypicalWorkDialogProps = {
	open: boolean;
	pending: boolean;
	mode?: "create" | "edit";
	defaultArchComponentType?: string;
	defaultStreamExecutor?: string | null;
	onClose: () => void;
	onSubmit: (payload: CreateTypicalWorkDialogPayload) => void;
};

export function CreateTypicalWorkDialog({
	open,
	pending,
	mode = "create",
	defaultArchComponentType,
	defaultStreamExecutor,
	onClose,
	onSubmit,
}: CreateTypicalWorkDialogProps) {
	const isCreate = mode === "create";
	const [name, setName] = useState("");
	const [archComponentType, setArchComponentType] = useState<string>(
		defaultArchComponentType ?? WORK_ARCH_COMPONENT_TYPES[0],
	);
	const [streamExecutor, setStreamExecutor] = useState<string>(
		defaultStreamExecutor ?? DEFAULT_WORK_STREAMS[0],
	);
	const [starterNorm, setStarterNorm] = useState("1.00");

	useEffect(() => {
		if (!open) {
			setName("");
			setArchComponentType(
				defaultArchComponentType ?? WORK_ARCH_COMPONENT_TYPES[0],
			);
			setStreamExecutor(defaultStreamExecutor ?? DEFAULT_WORK_STREAMS[0]);
			setStarterNorm("1.00");
		}
	}, [defaultArchComponentType, defaultStreamExecutor, open]);

	const trimmed = name.trim();
	const normValue = Number(starterNorm.replace(",", "."));
	const canSubmit =
		trimmed.length > 0 &&
		trimmed.length <= 255 &&
		archComponentType.length > 0 &&
		(!isCreate || streamExecutor.length > 0) &&
		(!isCreate || (Number.isFinite(normValue) && normValue >= 0));

	return (
		<Dialog open={open} onClose={pending ? undefined : onClose} maxWidth="sm" fullWidth>
			<DialogTitle>
				{isCreate ? "Новая типовая работа" : "Изменить типовую работу"}
			</DialogTitle>
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
				{isCreate ? (
					<>
						<FormControl fullWidth>
							<SelectWithPlaceholder
								placeholder="Стрим-исполнитель"
								value={streamExecutor}
								onChange={(e) => setStreamExecutor(String(e.target.value))}
							>
								{DEFAULT_WORK_STREAMS.map((stream) => (
									<MenuItem key={stream} value={stream}>
										{stream}
									</MenuItem>
								))}
							</SelectWithPlaceholder>
						</FormControl>
						{!streamExecutor ? (
							<Typography sx={{ fontSize: 12, color: "#b5791f" }}>
								Выберите стрим-исполнитель для первого назначения
							</Typography>
						) : null}
						<TextField
							label="Стартовый норматив, чел.-дн."
							value={starterNorm}
							onChange={(e) => setStarterNorm(e.target.value)}
							helperText="По умолчанию 1.00"
						/>
					</>
				) : (
					<Typography sx={{ fontSize: 12, color: "#6b7484" }}>
						Стрим-исполнитель (рекомендация): {defaultStreamExecutor ?? "—"}
					</Typography>
				)}
			</DialogContent>
			<DialogActions sx={{ flexDirection: "column", alignItems: "stretch", px: 3, pb: 2 }}>
				<BoxActions pending={pending} canSubmit={canSubmit} isCreate={isCreate} onClose={onClose} onSubmit={() =>
					onSubmit({
						name: trimmed,
						archComponentType,
						streamExecutor: isCreate ? streamExecutor : undefined,
						starterNormValue: isCreate ? normValue : undefined,
					})
				} />
				<Typography sx={{ fontSize: 11.5, color: "#8a93a3", mt: 1, textAlign: "center" }}>
					{isCreate
						? "Работа добавится в выбранный архитектурный компонент"
						: "Изменения применяются сразу к справочнику"}
				</Typography>
			</DialogActions>
		</Dialog>
	);
}

function BoxActions({
	pending,
	canSubmit,
	isCreate,
	onClose,
	onSubmit,
}: {
	pending: boolean;
	canSubmit: boolean;
	isCreate: boolean;
	onClose: () => void;
	onSubmit: () => void;
}) {
	return (
		<div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
			<Button onClick={onClose} disabled={pending}>
				Отмена
			</Button>
			<Button variant="contained" disabled={!canSubmit || pending} onClick={onSubmit}>
				{isCreate ? "Создать работу" : "Сохранить"}
			</Button>
		</div>
	);
}
