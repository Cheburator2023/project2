import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type {
	V2CalculationResultDto,
	V2LogicGraphDto,
} from "@smart-anketa/api-contract";
import { useDebouncedV2Calculation } from "../hooks/useDebouncedV2Calculation";

function formatNum(value: number | null): string {
	if (value === null || !Number.isFinite(value)) return "—";
	return Math.abs(value) >= 100
		? value.toFixed(0)
		: Number.isInteger(value)
			? String(value)
			: value.toFixed(2);
}

type Props = {
	templateId: string;
	versionId?: string;
	formData: Record<string, unknown>;
	/** Опциональный override логики (например, draft из редактора). */
	rulesOverride?: V2LogicGraphDto;
	debounceMs?: number;
	/** Если родитель уже запрашивает calculate — не дублировать HTTP. */
	result?: V2CalculationResultDto | null;
	isLoading?: boolean;
	error?: string | null;
};

/**
 * Сводка калькуляций по бекенду: показывает items из `V2CalculationService.evaluate`
 * для текущей `formData`. Запрос дебаунсится, чтобы не дёргать сервер на каждый keypress.
 */
export function V2BackendCalculationSummary({
	templateId,
	versionId,
	formData,
	rulesOverride,
	debounceMs = 350,
	result: resultProp,
	isLoading: isLoadingProp,
	error: errorProp,
}: Props) {
	const useInternalFetch = resultProp === undefined;
	const internal = useDebouncedV2Calculation({
		templateId,
		versionId,
		formData,
		rulesOverride,
		debounceMs,
		enabled: useInternalFetch && Boolean(versionId),
	});

	const result = resultProp ?? internal.result;
	const isLoading = useInternalFetch ? internal.isLoading : (isLoadingProp ?? false);
	const error = useInternalFetch ? internal.error : (errorProp ?? null);

	if (error) {
		return (
			<Alert severity="error" sx={{ mt: 2 }}>
				Ошибка калькуляции на сервере: {error}
			</Alert>
		);
	}

	if (!result) {
		return (
			<Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
				<CircularProgress size={14} />
				<Typography variant="caption" color="text.secondary">
					Расчёт по бекенду…
				</Typography>
			</Box>
		);
	}

	const grand = result.items.find((i) => i.role === "grand_total");
	const typicalTotal = result.items.find((i) => i.role === "typical_total");
	const atypicalTotal = result.items.find((i) => i.role === "atypical_total");
	const hasComputed = result.items.length > 0;
	const hasRowOnly =
		!hasComputed &&
		result.taskTriggers.length === 0 &&
		JSON.stringify(result.formData) !== JSON.stringify(formData);

	return (
		<Box sx={{ mt: 2, p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
				<Typography variant="subtitle2">Калькуляция (backend)</Typography>
				{isLoading ? <CircularProgress size={12} /> : null}
				<Box sx={{ flex: 1 }} />
				{result.cycles.length > 0 ? (
					<Chip
						size="small"
						color="warning"
						label={`Циклы: ${result.cycles.length}`}
						title={result.cycles.join("\n")}
					/>
				) : null}
			</Box>

			<Stack spacing={0.75}>
				{!hasComputed && !hasRowOnly && result.taskTriggers.length === 0 ? (
					<Typography variant="caption" color="text.secondary">
						Правила computed / row_computed / task_trigger для этого шаблона не
						настроены.
					</Typography>
				) : null}

				{hasRowOnly ? (
					<Typography variant="caption" color="text.secondary">
						Есть правила row_computed — значения строк обновлены в данных формы;
						агрегаты computed не заданы.
					</Typography>
				) : null}

				{result.items.map((item) => (
					<Box
						key={item.ruleId}
						sx={{
							display: "flex",
							alignItems: "center",
							gap: 1,
							px: 1,
							py: 0.5,
							borderRadius: 0.5,
							bgcolor:
								item.role === "grand_total" ? "action.selected" : "transparent",
						}}
					>
						<Typography
							variant="body2"
							fontWeight={item.role === "grand_total" ? 700 : 500}
							sx={{ flex: 1, minWidth: 0 }}
							noWrap
							title={item.label}
						>
							{item.label}
						</Typography>
						<Typography
							variant="body2"
							fontWeight={item.role === "grand_total" ? 700 : 500}
							color={item.error ? "error.main" : "text.primary"}
							sx={{ minWidth: 60, textAlign: "right" }}
						>
							{formatNum(item.value)}
						</Typography>
						<IconButton
							size="small"
							aria-label="Подсказка"
							title={[
								item.formulaHint,
								item.weightSourceLabel
									? `Источник: ${item.weightSourceLabel}`
									: null,
								item.operands.length
									? `Операнды: ${item.operands
											.map(
												(o) =>
													`${o.varPath || "?"}=${formatNum(o.value)}`,
											)
											.join("; ")}`
									: null,
								item.error ? `Ошибка: ${item.error}` : null,
							]
								.filter(Boolean)
								.join("\n")}
						>
							<InfoOutlinedIcon sx={{ fontSize: 14 }} />
						</IconButton>
					</Box>
				))}

				{result.taskTriggers.length > 0 ? (
					<Box sx={{ mt: 1 }}>
						<Typography variant="caption" fontWeight={700} display="block">
							Типовые работы
						</Typography>
						<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
							{result.taskTriggers.map((t) => (
								<Chip
									key={t.ruleId}
									size="small"
									variant="outlined"
									color={t.passes ? "success" : "default"}
									label={`${t.taskCode} · ${t.label}`}
									title={t.hint}
								/>
							))}
						</Stack>
					</Box>
				) : null}

				{grand && typicalTotal ? (
					<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
						База: {formatNum(typicalTotal.value)}
						{atypicalTotal
							? ` · Нетиповые: ${formatNum(atypicalTotal.value)}`
							: ""}
						· Итог: {formatNum(grand.value)}
					</Typography>
				) : null}
			</Stack>
		</Box>
	);
}
