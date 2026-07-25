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
	V2_IMPLEMENTATION_STREAM,
	V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE,
	V2_MODEL_STREAM_EXECUTOR,
	isV2ModelStreamUmbrellaLabel,
	isValidImplementationStreamCodeFormat,
} from "@smart-anketa/api-contract";
import { useV2ImplementationStreamCatalog } from "@react-client/common/api/queries/v2-streams";
import { SelectWithPlaceholder } from "@react-client/common/muiCustom/SelectWithPlaceholder";
import {
	WORK_ARCH_COMPONENT_TYPES,
	DEFAULT_WORK_ARCH_COMPONENT_TYPE,
} from "./typicalWorkPatchErrors";
import {
	ExecutorStreamPresenceHint,
	ExecutorStreamPresenceLabel,
} from "./ExecutorStreamPresenceLabel";
import {
	buildExecutorStreamPickerRows,
	streamDisplayLabel,
} from "./typicalWorksAreas";

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
	onCreateStreamBlock?: (stream: string) => void;
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
	const { codes: streamCodes, labelByCode, catalog, umbrellaCatalog } =
		useV2ImplementationStreamCatalog();
	const [name, setName] = useState("");
	const [archComponentType, setArchComponentType] = useState<string>(
		defaultArchComponentType ?? DEFAULT_WORK_ARCH_COMPONENT_TYPE,
	);
	const [streamExecutor, setStreamExecutor] = useState<string>(
		defaultStreamExecutor ?? V2_IMPLEMENTATION_STREAM.IDSRC,
	);
	const [starterNorm, setStarterNorm] = useState("1.00");

	const pickerRows = useMemo(
		() =>
			buildExecutorStreamPickerRows(
				streamCodes,
				umbrellaCatalog.length > 0
					? umbrellaCatalog.map((entry) => ({
							value: entry.payload.dbNames[0] ?? entry.label,
							label: `${entry.label} (зонтик)`,
						}))
					: undefined,
			),
		[streamCodes, umbrellaCatalog],
	);

	useEffect(() => {
		if (!open) {
			setName("");
			setArchComponentType(
				defaultArchComponentType ?? WORK_ARCH_COMPONENT_TYPES[0],
			);
			setStreamExecutor(
				defaultStreamExecutor ?? V2_IMPLEMENTATION_STREAM.IDSRC,
			);
			setStarterNorm("1.00");
		}
	}, [defaultArchComponentType, defaultStreamExecutor, open]);

	useEffect(() => {
		if (!open || !isCreate) return;
		if (streamCodes.length === 0) return;
		const allowed =
			streamCodes.includes(streamExecutor) ||
			isV2ModelStreamUmbrellaLabel(streamExecutor);
		if (!allowed) {
			setStreamExecutor(
				defaultStreamExecutor &&
					(streamCodes.includes(defaultStreamExecutor) ||
						isV2ModelStreamUmbrellaLabel(defaultStreamExecutor))
					? defaultStreamExecutor
					: (streamCodes[0] ?? V2_IMPLEMENTATION_STREAM.IDSRC),
			);
		}
	}, [open, isCreate, streamCodes, streamExecutor, defaultStreamExecutor]);

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

	const canCreateStreamBlock =
		isV2ModelStreamUmbrellaLabel(streamExecutor) ||
		isValidImplementationStreamCodeFormat(streamExecutor);

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
							helperText={`Справочник ${V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE}. Зонтик «${V2_MODEL_STREAM_EXECUTOR}» — общий каталог для дочерних модельных стримов.`}
						>
							{pickerRows.map((row) => {
								const value = row.value;
								const label =
									row.kind === "umbrella"
										? row.label
										: (labelByCode[value] ?? value);
								return (
									<MenuItem
										key={
											row.kind === "umbrella"
												? `umbrella:${value}`
												: value
										}
										value={value}
										sx={{
											pl: row.kind === "stream" && row.nested ? 3.5 : 1.5,
										}}
									>
										<Box
											sx={{
												display: "flex",
												alignItems: "center",
												gap: 1,
												width: "100%",
											}}
										>
											<Typography sx={{ flex: 1 }}>{label}</Typography>
											<ExecutorStreamPresenceLabel
												present={
													isStreamPresentInSchema?.(value) ?? false
												}
											/>
										</Box>
									</MenuItem>
								);
							})}
						</TextField>
						<ExecutorStreamPresenceHint present={streamPresent} />
						{!streamPresent && onCreateStreamBlock ? (
							<Button
								size="small"
								variant="outlined"
								onClick={() => onCreateStreamBlock(streamExecutor)}
								disabled={!canCreateStreamBlock}
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
						Стрим-исполнитель (рекомендация):{" "}
						{defaultStreamExecutor
							? streamDisplayLabel(defaultStreamExecutor, catalog)
							: "—"}
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
			<Button
				variant="contained"
				onClick={onSubmit}
				disabled={pending || !canSubmit}
			>
				{isCreate ? "Создать работу" : "Сохранить"}
			</Button>
		</div>
	);
}
