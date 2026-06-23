import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { V2TypicalWorkNormDto } from "@smart-anketa/api-contract";
import { validateNormInputs } from "@smart-anketa/api-contract";
import { useMemo, useState } from "react";
import { streamDisplayLabel } from "./typicalWorksAreas";
import {
	normPeriodStatus,
	normStatusColors,
	normStatusLabel,
} from "./typicalWorksUi";

type TypicalWorkNormsSectionProps = {
	norms: V2TypicalWorkNormDto[];
	streamExecutor: string;
	onChange: (norms: V2TypicalWorkNormDto[]) => void;
	formatDate: (value: string | null) => string;
	parseDateInput: (value: string) => string;
};

function isoDateValue(value: string | null): string {
	if (!value) return "";
	const day = value.slice(0, 10);
	return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "";
}

function normIssuesByLocalIndex(
	issues: Array<{ path: string; message: string }>,
	streamNormIndices: number[],
): Map<number, Map<string, string>> {
	const map = new Map<number, Map<string, string>>();
	for (const issue of issues) {
		const match = issue.path.match(/^norms\[(\d+)\]\.?(.*)$/);
		if (!match) continue;
		const streamIndex = streamNormIndices[Number(match[1])];
		if (streamIndex === undefined) continue;
		const field = match[2] || "_row";
		const row = map.get(streamIndex) ?? new Map<string, string>();
		row.set(field, issue.message);
		map.set(streamIndex, row);
	}
	return map;
}

export function TypicalWorkNormsSection({
	norms,
	streamExecutor,
	onChange,
}: TypicalWorkNormsSectionProps) {
	const today = new Date().toISOString().slice(0, 10);
	const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
	const streamNorms = norms.filter((n) => n.streamExecutor === streamExecutor);
	const streamNormIndices = streamNorms.map((norm) => norms.indexOf(norm));

	const validationIssues = useMemo(
		() =>
			validateNormInputs(
				streamNorms.map((norm) => ({
					normValue: norm.normValue,
					validFrom: norm.validFrom,
					validTo: norm.validTo,
				})),
				streamExecutor,
				{ coverageDate: today },
			),
		[streamExecutor, streamNorms, today],
	);

	const coverageError = useMemo(
		() => validationIssues.find((issue) => issue.path === "norms")?.message ?? null,
		[validationIssues],
	);

	const issuesByIndex = useMemo(
		() => normIssuesByLocalIndex(validationIssues, streamNormIndices),
		[streamNormIndices, validationIssues],
	);

	const deleteTarget =
		deleteIndex == null ? null : (norms[deleteIndex] ?? null);

	const requestDeleteNorm = (index: number) => {
		const norm = norms[index];
		if (!norm) return;
		if (String(norm.id).startsWith("new-")) {
			onChange(norms.filter((_, i) => i !== index));
			return;
		}
		setDeleteIndex(index);
	};

	const confirmDeleteNorm = () => {
		if (deleteIndex == null) return;
		onChange(norms.filter((_, i) => i !== deleteIndex));
		setDeleteIndex(null);
	};

	return (
		<>
			<Box
				sx={{
					bgcolor: "#fff",
					border: "1px solid #e6e8ee",
					borderRadius: "12px",
					p: "15px 17px",
					mb: 1.5,
				}}
			>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 1.1,
					mb: 0.6,
					flexWrap: "wrap",
				}}
			>
				<Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#1d2435" }}>
					Нормы трудозатрат
				</Typography>
				<Typography sx={{ fontSize: 11, color: "#8a93a3" }}>
					— для стрима «{streamDisplayLabel(streamExecutor)}», с историчностью
				</Typography>
				<Button
					size="small"
					onClick={() =>
						onChange([
							...norms,
							{
								id: `new-${Date.now()}`,
								streamExecutor,
								normValue: 1,
								validFrom: today,
								validTo: null,
							},
						])
					}
					sx={{
						ml: "auto",
						textTransform: "none",
						height: 28,
						border: "1px solid #dfe2ea",
						borderRadius: "7px",
						color: "#384152",
					}}
				>
					+ Норма
				</Button>
			</Box>
			<Typography sx={{ fontSize: 11.5, color: "#8a93a3", mb: 1.5 }}>
				На дату расчёта выбирается норма из действующего периода. Активная на
				сегодня — подсвечена и используется как N в формуле.
			</Typography>
			{coverageError ? (
				<Typography sx={{ fontSize: 11.5, color: "#c2554c", mb: 1 }}>
					{coverageError}
				</Typography>
			) : null}

			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: "120px 1fr 1fr 90px 30px",
					gap: 1.25,
					px: 0.25,
					pb: 0.9,
					fontSize: 10.5,
					fontWeight: 700,
					color: "#aab1c0",
					textTransform: "uppercase",
					letterSpacing: "0.03em",
				}}
			>
				<span>Норма, чел.-дн.</span>
				<span>Дата начала</span>
				<span>Дата окончания</span>
				<span>Статус</span>
				<span />
			</Box>

			{streamNorms.length === 0 ? (
				<Typography sx={{ fontSize: 12.5, color: "#8a93a3", py: 1 }}>
					Нормы для выбранного стрима не заданы.
				</Typography>
			) : (
				streamNorms.map((norm) => {
					const index = norms.indexOf(norm);
					const status = normPeriodStatus(norm.validFrom, norm.validTo, today);
					const colors = normStatusColors(status);
					const rowIssues = issuesByIndex.get(index);
					const rowError = rowIssues?.get("_row");
					return (
						<Box key={norm.id ?? index}>
							<Box
								sx={{
									display: "grid",
									gridTemplateColumns: "120px 1fr 1fr 90px 30px",
									gap: 1.25,
									alignItems: "start",
									py: 0.9,
									px: 0.25,
									borderTop: "1px solid #f0f1f5",
									borderRadius: "7px",
									bgcolor: colors.rowBg,
								}}
							>
								<TextField
									size="small"
									type="number"
									value={norm.normValue}
									error={rowIssues?.has("normValue")}
									helperText={rowIssues?.get("normValue") ?? " "}
									FormHelperTextProps={{ sx: { m: 0, minHeight: 16 } }}
									onChange={(e) => {
										const next = [...norms];
										next[index] = {
											...norm,
											normValue: Number(e.target.value.replace(",", ".")),
										};
										onChange(next);
									}}
									inputProps={{
										min: 0,
										step: 0.01,
										style: { textAlign: "right", fontWeight: 700 },
									}}
									sx={{
										"& .MuiInputBase-input": {
											fontFamily: "monospace",
											fontSize: 13,
										},
									}}
								/>
								<TextField
									size="small"
									type="date"
									value={isoDateValue(norm.validFrom)}
									error={rowIssues?.has("validFrom")}
									helperText={rowIssues?.get("validFrom") ?? " "}
									FormHelperTextProps={{ sx: { m: 0, minHeight: 16 } }}
									onChange={(e) => {
										const next = [...norms];
										next[index] = {
											...norm,
											validFrom: e.target.value,
										};
										onChange(next);
									}}
									InputLabelProps={{ shrink: true }}
									sx={{ "& .MuiInputBase-input": { fontFamily: "monospace" } }}
								/>
								<TextField
									size="small"
									type="date"
									value={isoDateValue(norm.validTo)}
									error={rowIssues?.has("validTo")}
									helperText={rowIssues?.get("validTo") ?? " "}
									FormHelperTextProps={{ sx: { m: 0, minHeight: 16 } }}
									onChange={(e) => {
										const next = [...norms];
										next[index] = {
											...norm,
											validTo: e.target.value.trim() ? e.target.value : null,
										};
										onChange(next);
									}}
									InputLabelProps={{ shrink: true }}
									sx={{ "& .MuiInputBase-input": { fontFamily: "monospace" } }}
								/>
								<Box
									sx={{
										display: "inline-flex",
										alignItems: "center",
										height: 21,
										px: 1,
										borderRadius: "6px",
										bgcolor: colors.bg,
										color: colors.color,
										fontSize: 10.5,
										fontWeight: 700,
										width: "fit-content",
										mt: 1,
									}}
								>
									{normStatusLabel(status)}
								</Box>
								<IconButton
									size="small"
									aria-label="Удалить норму"
									onClick={() => requestDeleteNorm(index)}
									sx={{ color: "#c2554c", mt: 0.5 }}
								>
									<DeleteOutlineIcon fontSize="small" />
								</IconButton>
							</Box>
							{rowError ? (
								<Typography
									sx={{ fontSize: 11, color: "#c2554c", px: 0.25, pb: 0.5 }}
								>
									{rowError}
								</Typography>
							) : null}
						</Box>
					);
				})
			)}
			</Box>
			<Dialog
				open={deleteTarget != null}
				onClose={() => setDeleteIndex(null)}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>Удалить норму трудозатрат?</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Норма могла использоваться в уже сохранённых версиях анкеты. После
						удаления расчёт для периода{" "}
						<b>
							{deleteTarget?.validFrom}
							{deleteTarget?.validTo ? ` — ${deleteTarget.validTo}` : " — без даты окончания"}
						</b>{" "}
						будет выполняться без этой записи.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteIndex(null)} sx={{ textTransform: "none" }}>
						Отмена
					</Button>
					<Button
						color="error"
						variant="contained"
						onClick={confirmDeleteNorm}
						sx={{ textTransform: "none" }}
					>
						Удалить
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
