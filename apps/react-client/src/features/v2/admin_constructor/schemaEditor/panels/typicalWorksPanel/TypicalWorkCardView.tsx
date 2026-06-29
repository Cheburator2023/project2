import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { V2TypicalWorkCardDto } from "@smart-anketa/api-contract";
import { WorkFormulaEditor } from "./WorkFormulaEditor";
import { triggerStatusColors } from "./typicalWorksUi";

type TypicalWorkCardViewProps = {
	card: V2TypicalWorkCardDto | undefined;
	loading: boolean;
	error: string | null;
	availableStreams: string[];
	streamExecutor: string | null;
	onStreamChange: (stream: string) => void;
};

function formatDate(value: string | null): string {
	if (!value) return "—";
	const [y, m, d] = value.slice(0, 10).split("-");
	if (!y || !m || !d) return value;
	return `${d}.${m}.${y}`;
}

export function TypicalWorkCardView({
	card,
	loading,
	error,
	availableStreams,
	streamExecutor,
	onStreamChange,
}: TypicalWorkCardViewProps) {
	if (loading) {
		return (
			<Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
				<CircularProgress size={28} />
			</Box>
		);
	}

	if (error) {
		return (
			<Alert severity="error" sx={{ m: 2 }}>
				{error}
			</Alert>
		);
	}

	if (!card) {
		return (
			<Alert severity="info" sx={{ m: 2 }}>
				Выберите работу в дереве слева.
			</Alert>
		);
	}

	const statusColors = triggerStatusColors(card.triggerStatus);

	return (
		<Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
			<Box
				sx={{
					display: "flex",
					flexWrap: "wrap",
					gap: 2,
					alignItems: "center",
					mb: 2,
				}}
			>
				<Box sx={{ flex: 1, minWidth: 240 }}>
					<Typography variant="h6" fontWeight={700}>
						{card.name}
					</Typography>
					<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.75 }}>
						<Chip size="small" label={card.archComponentType} />
						{card.workType ? (
							<Chip size="small" variant="outlined" label={card.workType} />
						) : null}
					</Box>
				</Box>

				<FormControl size="small" sx={{ minWidth: 220 }}>
					<InputLabel id="work-stream-label">Стрим-исполнитель</InputLabel>
					<Select
						labelId="work-stream-label"
						label="Стрим-исполнитель"
						value={streamExecutor ?? ""}
						onChange={(e) => onStreamChange(String(e.target.value))}
					>
						{availableStreams.map((stream) => (
							<MenuItem key={stream} value={stream}>
								{stream}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			</Box>

			{!streamExecutor ? (
				<Alert severity="info">
					Выберите стрим-исполнителя, чтобы задать условия, коэффициенты и
					нормы.
				</Alert>
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
					<Paper variant="outlined" sx={{ p: 1.5 }}>
						<Typography variant="subtitle2" fontWeight={700} gutterBottom>
							Условия появления работы
						</Typography>
						<Chip
							size="small"
							label={
								card.triggerStatus === "appears"
									? `Работа появляется в анкете, когда выполнены все условия (${card.rules.length})`
									: card.triggerStatus === "invalid"
										? "Условие невалидно — работа не появится"
										: "Без триггеров — работа не появится в анкете"
							}
							sx={{
								mb: 1,
								bgcolor: statusColors.bg,
								color: statusColors.color,
								fontWeight: 600,
							}}
						/>
						{card.rules.length === 0 ? (
							<Typography variant="body2" color="text.secondary">
								Условия не заданы.
							</Typography>
						) : (
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Параметр</TableCell>
										<TableCell>Оператор</TableCell>
										<TableCell>Значение</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{card.rules.map((rule) => (
										<TableRow key={rule.id}>
											<TableCell>{rule.paramName ?? rule.paramCode}</TableCell>
											<TableCell>{rule.operator}</TableCell>
											<TableCell>{rule.valueLabel ?? "—"}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
						<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
							Условия объединяются логическим И — работа появляется, когда
							выполнены все.
						</Typography>
					</Paper>

					<Paper variant="outlined" sx={{ p: 1.5 }}>
						<Typography variant="subtitle2" fontWeight={700} gutterBottom>
							Нормы трудозатрат
						</Typography>
						{card.norms.length === 0 ? (
							<Typography variant="body2" color="text.secondary">
								Нормы не заданы.
							</Typography>
						) : (
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Норма (чел.-д.)</TableCell>
										<TableCell>Дата начала</TableCell>
										<TableCell>Дата окончания</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{card.norms.map((norm) => (
										<TableRow key={norm.id}>
											<TableCell>{norm.normValue}</TableCell>
											<TableCell>{formatDate(norm.validFrom)}</TableCell>
											<TableCell>{formatDate(norm.validTo)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</Paper>

					<Paper variant="outlined" sx={{ p: 1.5 }}>
						<Typography variant="subtitle2" fontWeight={700} gutterBottom>
							Параметры трудоёмкости
						</Typography>
						{card.laborParams.length === 0 ? (
							<Typography variant="body2" color="text.secondary">
								Параметры трудоёмкости не заданы — норма используется как есть.
							</Typography>
						) : (
							card.laborParams.map((group) => (
								<Box key={group.paramCode} sx={{ mb: 1.5 }}>
									<Typography variant="body2" fontWeight={600} gutterBottom>
										{group.paramName ?? group.paramCode}
									</Typography>
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell>Значение</TableCell>
												<TableCell>Коэффициент</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{group.coefficients.map((row) => (
												<TableRow key={row.id}>
													<TableCell>{row.valueLabel ?? "—"}</TableCell>
													<TableCell>{row.coefficient}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</Box>
							))
						)}
					</Paper>

					<Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px" }}>
						<Typography variant="subtitle2" fontWeight={700} gutterBottom>
							Калькулятор формулы
						</Typography>
						<WorkFormulaEditor
							formula={card.formula}
							rounding={card.rounding}
							laborParams={card.laborParams}
							onFormulaChange={() => undefined}
							onRoundingChange={() => undefined}
							readOnly
						/>
					</Paper>
				</Box>
			)}
		</Box>
	);
}
