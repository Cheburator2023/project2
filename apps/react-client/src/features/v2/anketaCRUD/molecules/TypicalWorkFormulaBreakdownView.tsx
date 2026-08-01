import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { TypicalWorkFormulaBreakdownDto } from "@smart-anketa/api-contract";
import { formatTypicalWorkNumberValue } from "../utils/anketaModalArrayTableConfig";

export function readTypicalWorkFormulaBreakdown(
	item: Record<string, unknown>,
): TypicalWorkFormulaBreakdownDto | null {
	const raw = item.formulaBreakdown;
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
	const record = raw as Record<string, unknown>;
	const symbolic =
		typeof record.symbolic === "string" ? record.symbolic.trim() : "";
	const expanded =
		typeof record.expanded === "string" ? record.expanded.trim() : "";
	if (!symbolic && !expanded) return null;
	const factors = Array.isArray(record.factors)
		? record.factors
				.filter(
					(factor): factor is Record<string, unknown> =>
						factor != null &&
						typeof factor === "object" &&
						!Array.isArray(factor),
				)
				.map((factor) => {
					const parts = Array.isArray(factor.parts)
						? factor.parts
								.filter(
									(part): part is Record<string, unknown> =>
										part != null &&
										typeof part === "object" &&
										!Array.isArray(part),
								)
								.map((part) => ({
									sourceLabel:
										typeof part.sourceLabel === "string"
											? part.sourceLabel
											: null,
									answerLabel:
										typeof part.answerLabel === "string"
											? part.answerLabel
											: "—",
									coefficient:
										typeof part.coefficient === "number" &&
										Number.isFinite(part.coefficient)
											? part.coefficient
											: Number.NaN,
								}))
								.filter((part) => Number.isFinite(part.coefficient))
						: undefined;
					return {
						paramCode:
							typeof factor.paramCode === "string" ? factor.paramCode : "",
						paramName:
							typeof factor.paramName === "string"
								? factor.paramName
								: typeof factor.paramCode === "string"
									? factor.paramCode
									: "Параметр",
						value:
							typeof factor.value === "number" && Number.isFinite(factor.value)
								? factor.value
								: Number.NaN,
						valueLabel:
							typeof factor.valueLabel === "string"
								? factor.valueLabel
								: undefined,
						aggregation:
							factor.aggregation === "max" ||
							factor.aggregation === "sum" ||
							factor.aggregation === "single"
								? (factor.aggregation as "max" | "sum" | "single")
								: undefined,
						parts: parts?.length ? parts : undefined,
					};
				})
				.filter((factor) => Number.isFinite(factor.value))
		: [];
	const instanceBreakdown = Array.isArray(record.instanceBreakdown)
		? record.instanceBreakdown
				.filter(
					(row): row is Record<string, unknown> =>
						row != null && typeof row === "object" && !Array.isArray(row),
				)
				.map((row) => ({
					sourceLabel:
						typeof row.sourceLabel === "string" ? row.sourceLabel : "—",
					index:
						typeof row.index === "number" && Number.isFinite(row.index)
							? row.index
							: 0,
					expanded: typeof row.expanded === "string" ? row.expanded : "",
					total:
						typeof row.total === "number" && Number.isFinite(row.total)
							? row.total
							: Number.NaN,
				}))
				.filter((row) => Number.isFinite(row.total))
		: undefined;
	const triggerConditions =
		typeof record.triggerConditions === "string"
			? record.triggerConditions.trim()
			: "";
	return {
		...(triggerConditions ? { triggerConditions } : {}),
		symbolic: symbolic || "N",
		expanded:
			expanded ||
			`${formatTypicalWorkNumberValue(item.estimateHoursPerDay)} × ${formatTypicalWorkNumberValue(item.coefficient)} = ${formatTypicalWorkNumberValue(item.total)}`,
		factors,
		baseNorm:
			typeof record.baseNorm === "number" && Number.isFinite(record.baseNorm)
				? record.baseNorm
				: Number(item.estimateHoursPerDay) || 0,
		coefficient:
			typeof record.coefficient === "number" &&
			Number.isFinite(record.coefficient)
				? record.coefficient
				: Number(item.coefficient) || 1,
		total:
			typeof record.total === "number" && Number.isFinite(record.total)
				? record.total
				: Number(item.total) || 0,
		...(instanceBreakdown?.length ? { instanceBreakdown } : {}),
	};
}

export function buildFallbackTypicalWorkFormulaBreakdown(
	item: Record<string, unknown>,
): TypicalWorkFormulaBreakdownDto {
	const base = formatTypicalWorkNumberValue(item.estimateHoursPerDay);
	const coeff = formatTypicalWorkNumberValue(item.coefficient);
	const total = formatTypicalWorkNumberValue(item.total);
	const coeffDisplay =
		typeof item.coefficientDisplay === "string" &&
		item.coefficientDisplay.trim()
			? item.coefficientDisplay.trim()
			: null;
	return {
		symbolic: "N × коэффициент",
		expanded: coeffDisplay
			? `${base} × ${coeffDisplay} = ${total}`
			: `${base} × ${coeff} = ${total}`,
		factors: [],
		baseNorm: Number(item.estimateHoursPerDay) || 0,
		coefficient: Number(item.coefficient) || 1,
		total: Number(item.total) || 0,
	};
}

type Props = {
	item: Record<string, unknown>;
	/** Если false — только переданный breakdown без fallback. */
	allowFallback?: boolean;
};

/** Разбор формулы типовой работы: экземпляры арх. компонента + сумма. */
export function TypicalWorkFormulaBreakdownView({
	item,
	allowFallback = true,
}: Props) {
	const breakdown =
		readTypicalWorkFormulaBreakdown(item) ??
		(allowFallback ? buildFallbackTypicalWorkFormulaBreakdown(item) : null);
	if (!breakdown) return null;

	const instances = breakdown.instanceBreakdown ?? [];

	return (
		<Box
			sx={{
				width: "100%",
				px: 1.5,
				py: 1.25,
				borderRadius: 1,
				bgcolor: "action.hover",
			}}
		>
			{breakdown.triggerConditions ? (
				<Typography
					variant="caption"
					color="text.secondary"
					display="block"
					sx={{ mb: 0.75, lineHeight: 1.4, wordBreak: "break-word" }}
				>
					<Typography
						component="span"
						variant="caption"
						fontWeight={600}
					>
						Условия появления:{" "}
					</Typography>
					{breakdown.triggerConditions}
				</Typography>
			) : null}
			{breakdown.symbolic ? (
				<Typography
					variant="caption"
					color="text.secondary"
					display="block"
					sx={{ mb: 0.5, lineHeight: 1.4 }}
				>
					{breakdown.symbolic}
				</Typography>
			) : null}
			{instances.length > 1 ? (
				<Stack spacing={0.5} sx={{ mb: 0.75 }}>
					{instances.map((row) => (
						<Typography
							key={`${row.index}-${row.sourceLabel}`}
							variant="body2"
							sx={{
								fontFamily:
									"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
								fontSize: 12.5,
								letterSpacing: 0.1,
								lineHeight: 1.4,
								wordBreak: "break-word",
							}}
						>
							{row.expanded || formatTypicalWorkNumberValue(row.total)}
							<Typography
								component="span"
								variant="caption"
								color="text.secondary"
								sx={{ ml: 0.75 }}
							>
								· {row.sourceLabel}
							</Typography>
						</Typography>
					))}
				</Stack>
			) : null}
			<Typography
				variant="body2"
				fontWeight={600}
				sx={{
					fontFamily:
						"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
					fontSize: 13,
					letterSpacing: 0.15,
					lineHeight: 1.45,
					wordBreak: "break-word",
				}}
			>
				{instances.length > 1
					? `сумма = ${formatTypicalWorkNumberValue(breakdown.total)}`
					: breakdown.expanded}
				{instances.length === 1 ? (
					<Typography
						component="span"
						variant="caption"
						color="text.secondary"
						sx={{ ml: 0.75 }}
					>
						· {instances[0]?.sourceLabel}
					</Typography>
				) : null}
			</Typography>
		</Box>
	);
}
