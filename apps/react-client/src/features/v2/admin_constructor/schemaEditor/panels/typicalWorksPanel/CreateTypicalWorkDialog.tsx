import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
	V2_EXECUTOR_STREAM_LABELS,
	V2_SOURCE_STREAM,
	type V2ExecutorStreamLabel,
} from "@smart-anketa/api-contract";
import { SelectWithPlaceholder } from "@react-client/common/muiCustom/SelectWithPlaceholder";
import {
	WORK_ARCH_COMPONENT_TYPES,
	DEFAULT_WORK_ARCH_COMPONENT_TYPE,
} from "./typicalWorkPatchErrors";
import {
	ExecutorStreamPresenceHint,
	ExecutorStreamPresenceLabel,
} from "./ExecutorStreamPresenceLabel";

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
	isStreamPresentInSchema?: (stream: string) => boolean;
	onCreateStreamBlock?: (stream: V2ExecutorStreamLabel) => void;
	onClose: () => void;
	onSubmit: (payload: CreateTypicalWorkDialogPayload) => void;
};

export function CreateTypicalWorkDialog({
	open,
	pending,
	mode = "create",
	defaultArchComponentType,
	defaultStreamExecutor,
	isStreamPresentInSchema,
	onCreateStreamBlock,
	onClose,
	onSubmit,
}: CreateTypicalWorkDialogProps) {
	const isCreate = mode === "create";
	const [name, setName] = useState("");
	const [archComponentType, setArchComponentType] = useState<string>(
		defaultArchComponentType ?? DEFAULT_WORK_ARCH_COMPONENT_TYPE,
	);
	const [streamExecutor, setStreamExecutor] = useState<string>(
		defaultStreamExecutor ?? V2_SOURCE_STREAM,
	);
	const [starterNorm, setStarterNorm] = useState("1.00");

	useEffect(() => {
		if (!open) {
			setName("");
			setArchComponentType(
				defaultArchComponentType ?? WORK_ARCH_COMPONENT_TYPES[0],
			);
			setStreamExecutor(defaultStreamExecutor ?? V2_SOURCE_STREAM);
			setStarterNorm("1.00");
		}
	}, [defaultArchComponentType, defaultStreamExecutor, open]);

	const streamPresent = useMemo(
		() => isStreamPresentInSchema?.(streamExecutor) ?? false,
		[isStreamPresentInSchema, streamExecutor],
	);

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
						<TextField
							select
							label="Стрим-исполнитель"
							value={streamExecutor}
							onChange={(e) => setStreamExecutor(String(e.target.value))}
							helperText="Назначение создаётся сразу; блок стрима в конструкторе нужен для полей и localParams."
						>
							{V2_EXECUTOR_STREAM_LABELS.map((stream) => (
								<MenuItem key={stream} value={stream}>
									<Box
										sx={{
											display: "flex",
											alignItems: "center",
											gap: 1,
											width: "100%",
										}}
									>
										<Typography sx={{ flex: 1 }}>{stream}</Typography>
										<ExecutorStreamPresenceLabel
											present={isStreamPresentInSchema?.(stream) ?? false}
										/>
									</Box>
								</MenuItem>
							))}
						</TextField>
						<ExecutorStreamPresenceHint present={streamPresent} />
						{!streamPresent && onCreateStreamBlock ? (
							<Button
								size="small"
								variant="outlined"
								onClick={() =>
									onCreateStreamBlock(streamExecutor as V2ExecutorStreamLabel)
								}
								disabled={
									!V2_EXECUTOR_STREAM_LABELS.includes(
										streamExecutor as V2ExecutorStreamLabel,
									)
								}
							>
								Создать стримовый блок в конструкторе
							</Button>
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
				<BoxActions
					pending={pending}
					canSubmit={canSubmit}
					isCreate={isCreate}
					onClose={onClose}
					onSubmit={() =>
						onSubmit({
							name: trimmed,
							archComponentType,
							streamExecutor: isCreate ? streamExecutor : undefined,
							starterNormValue: isCreate ? normValue : undefined,
						})
					}
				/>
				<Typography sx={{ fontSize: 11.5, color: "#8a93a3", mt: 1, textAlign: "center" }}>
					{isCreate
						? "Работа и назначение на стрим создаются сразу в справочнике"
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
