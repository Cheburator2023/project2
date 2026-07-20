import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type {
	V2TypicalWorkCardDto,
	V2TypicalWorkRuleDto,
	V2WorkRuleOperator,
} from "@smart-anketa/api-contract";
import { resolveActiveNormOnDate } from "@smart-anketa/api-contract";
import { SelectWithPlaceholder } from "@react-client/common/muiCustom/SelectWithPlaceholder";
import { WorkFormulaEditor } from "./WorkFormulaEditor";
import { triggerStatusColors } from "./typicalWorksUi";

type TypicalWorkCardViewProps = {
	card: V2TypicalWorkCardDto | undefined;
	loading: boolean;
	error: string | null;
	availableStreams: string[];
	streamExecutor: string | null;
	onStreamChange: (stream: string) => void;
	/** Без дублирования заголовка (имя, чипы) — для встраивания в реестр. */
	hideHeader?: boolean;
	/** Убрать внешние отступы контейнера. */
	embedded?: boolean;
	/** В реестре показываем факт настройки, а не runtime-статус превью. */
	readOnlyRegistry?: boolean;
};

const OPERATOR_LABELS: Record<V2WorkRuleOperator, string> = {
	"=": "=",
	"!=": "≠",
	">=": "≥",
	"<=": "≤",
	">": ">",
	"<": "<",
	in: "∈",
	not_in: "∉",
};

function formatDate(value: string | null): string {
	if (!value) return "—";
	const [y, m, d] = value.slice(0, 10).split("-");
	if (!y || !m || !d) return value;
	return `${d}.${m}.${y}`;
}

function formatRuleValue(rule: V2TypicalWorkRuleDto): string {
	if (rule.values?.length) {
		return rule.values
			.map((value) => value.label ?? value.code)
			.filter(Boolean)
			.join(", ");
	}
	return rule.valueLabel ?? rule.valueCode ?? "—";
}

function LaborParamGroupView({
	group,
}: {
	group: V2TypicalWorkCardDto["laborParams"][number];
}) {
	if (group.kind === "any_of" && group.anyOf) {
		const labels =
			group.anyOf.valueLabels?.filter(Boolean) ??
			group.anyOf.valueCodes ??
			[];
		return (
			<Box sx={{ mb: 1.5 }}>
				<Typography variant="body2" fontWeight={600} gutterBottom>
					{group.paramName ?? group.paramCode}
				</Typography>
				<Typography variant="body2" color="text.secondary">
					Any-of: {labels.length > 0 ? labels.join(", ") : "—"}
				</Typography>
				<Typography variant="caption" color="text.secondary" display="block">
					Коэфф. при выполнении: {group.anyOf.coeffOn ?? 1} · при невыполнении:{" "}
					{group.anyOf.coeffOff ?? 1}
				</Typography>
			</Box>
		);
	}

	return (
		<Box sx={{ mb: 1.5 }}>
			<Typography variant="body2" fontWeight={600} gutterBottom>
				{group.paramName ?? group.paramCode}
			</Typography>
			{group.coefficients.length === 0 ? (
				<Typography variant="body2" color="text.secondary">
					Коэффициенты не заданы.
				</Typography>
			) : (
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
								<TableCell>{row.valueLabel ?? row.valueCode ?? "—"}</TableCell>
								<TableCell>{row.coefficient}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</Box>
	);
}

export function TypicalWorkCardView({
	card,
	loading,
	error,
	availableStreams,
	streamExecutor,
	onStreamChange,
	hideHeader = false,
	embedded = false,
	readOnlyRegistry = false,
}: TypicalWorkCardViewProps) {
	if (loading) {
		return (
			<Box sx={{ p: embedded ? 2 : 4, display: "flex", justifyContent: "center" }}>
				<CircularProgress size={28} />
			</Box>
		);
	}

	if (error) {
		return (
			<Alert severity="error" sx={{ m: embedded ? 0 : 2 }}>
				{error}
			</Alert>
		);
	}

	if (!card) {
		return (
			<Alert severity="info" sx={{ m: embedded ? 0 : 2 }}>
				Выберите работу в списке слева.
			</Alert>
		);
	}

	const statusColors = triggerStatusColors(card.triggerStatus);

	return (
		<Box sx={{ flex: 1, overflow: "auto", p: embedded ? 0 : 2 }}>
			{!hideHeader ? (
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
						<SelectWithPlaceholder
							placeholder="Стрим-исполнитель"
							value={streamExecutor ?? ""}
							onChange={(e) => onStreamChange(String(e.target.value))}
						>
							{availableStreams.map((stream) => (
								<MenuItem key={stream} value={stream}>
									{stream}
								</MenuItem>
							))}
						</SelectWithPlaceholder>
					</FormControl>
				</Box>
			) : (
				<FormControl size="small" sx={{ minWidth: 220, mb: 2 }}>
					<SelectWithPlaceholder
						placeholder="Стрим-исполнитель"
						value={streamExecutor ?? ""}
						onChange={(e) => onStreamChange(String(e.target.value))}
					>
						{availableStreams.map((stream) => (
							<MenuItem key={stream} value={stream}>
								{stream}
							</MenuItem>
						))}
					</SelectWithPlaceholder>
				</FormControl>
			)}

			{!streamExecutor ? (
				<Alert severity="info">
					Выберите стрим-исполнителя, чтобы просмотреть условия, параметры и
					формулу.
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
								readOnlyRegistry
									? card.rules.length === 0
										? "Условия появления не заданы"
										: `Настроено ${card.rules.length} ${card.rules.length === 1 ? "условие" : card.rules.length < 5 ? "условия" : "условий"}`
									: card.triggerStatus === "appears"
										? `Условия настроены (${card.rules.length})`
										: card.triggerStatus === "hidden"
											? `Условия настроены (${card.rules.length})`
											: card.triggerStatus === "invalid"
												? "Условие невалидно — работа не появится"
												: "Без условий появления — работа не появится в анкете"
							}
							sx={{
								mb: 1,
								bgcolor: readOnlyRegistry
									? card.rules.length > 0
										? "#eef4ff"
										: "#eef1f6"
									: statusColors.bg,
								color: readOnlyRegistry
									? card.rules.length > 0
										? "#2f6bd8"
										: "#5b6577"
									: statusColors.color,
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
											<TableCell>
												{OPERATOR_LABELS[rule.operator] ?? rule.operator}
											</TableCell>
											<TableCell>{formatRuleValue(rule)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
						<Typography
							variant="caption"
							color="text.secondary"
							sx={{ mt: 1, display: "block" }}
						>
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
								<LaborParamGroupView key={group.paramCode} group={group} />
							))
						)}
					</Paper>

					<Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px" }}>
						<Typography variant="subtitle2" fontWeight={700} gutterBottom>
							Формула
						</Typography>
						<WorkFormulaEditor
							formula={card.formula}
							rounding={card.rounding}
							laborParams={card.laborParams}
							normValue={resolveActiveNormOnDate(
								card.norms,
								card.streamExecutor,
								new Date().toISOString().slice(0, 10),
							)}
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
