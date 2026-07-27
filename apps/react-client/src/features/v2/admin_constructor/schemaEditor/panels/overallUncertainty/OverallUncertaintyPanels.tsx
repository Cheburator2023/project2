import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import type {
	V2OverallUncertaintyCalcBreakdown,
	V2OverallUncertaintyConfig,
	V2OverallUncertaintyPreviewState,
	V2UncertaintyRiskCountRange,
} from "@smart-anketa/api-contract";
import { resizeUncertaintyMatrix } from "@smart-anketa/api-contract";

/** Card по умолчанию ставит maxHeight:100% — ломает скролл колонок. */
const PANEL_CARD_PROPS = {
	padding: "12px",
	overflow: "visible",
	maxHeight: "none",
} as const;

const ADD_BTN_SX = {
	mt: 0.5,
	textTransform: "none",
	borderStyle: "dashed",
} as const;

const COL_HDR_SX = {
	fontSize: 11,
	fontWeight: 600,
	color: "text.secondary",
	textTransform: "uppercase",
	letterSpacing: 0.4,
} as const;

const SEVERITY_FIELD_LABELS = [
	{ key: "timelineLabel" as const, label: "Сроки" },
	{ key: "costLabel" as const, label: "Стоимость" },
	{ key: "goalsLabel" as const, label: "Цели" },
];

function parseNum(raw: string): number | null {
	const n = Number(String(raw).replace(",", ".").trim());
	return Number.isFinite(n) ? n : null;
}

function newLocalId(prefix: string): string {
	return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function truncateLabel(text: string, max = 28): string {
	const t = text.trim();
	if (t.length <= max) return t;
	return `${t.slice(0, max - 1)}…`;
}

type ScalesProps = {
	config: V2OverallUncertaintyConfig;
	onChange: (next: V2OverallUncertaintyConfig) => void;
};

export function OverallUncertaintyScalesPanel({ config, onChange }: ScalesProps) {
	const patch = (next: V2OverallUncertaintyConfig) =>
		onChange(resizeUncertaintyMatrix(next));

	return (
		<Flex flexDirection="column" gap={12}>
			<div>
				<Typography variant="subtitle1" fontWeight={700}>
					Шкалы и веса (сохраняются в схему)
				</Typography>
				<Typography variant="caption" color="text.secondary">
					Методика п.3 Опросника СА: уровни, группы с коэффициентами, матрица,
					каталог рисков. Эти значения пишутся в logic при «Сохранить схему».
				</Typography>
			</div>

			<Card {...PANEL_CARD_PROPS}>
				<Typography variant="subtitle2" fontWeight={700}>
					Уровни серьёзности (Сроки / Стоимость / Цели)
				</Typography>
				<Spacer space={10} />
				{config.severityLevels.map((level, index) => (
					<Flex
						key={level.id}
						flexDirection="column"
						gap={6}
						style={{
							marginBottom: 10,
							paddingBottom: 10,
							borderBottom:
								index < config.severityLevels.length - 1
									? "1px solid #eef0f4"
									: undefined,
						}}
					>
						{SEVERITY_FIELD_LABELS.map(({ key, label }, fieldIdx) => {
							const isLast = fieldIdx === SEVERITY_FIELD_LABELS.length - 1;
							return (
								<Flex key={key} gap={8} alignItems="center">
									<Typography
										variant="caption"
										color="text.secondary"
										sx={{
											width: 78,
											flexShrink: 0,
											lineHeight: 1.2,
										}}
									>
										{label}
									</Typography>
									<TextField
										size="small"
										fullWidth
										value={level[key]}
										onChange={(e) => {
											const severityLevels = config.severityLevels.map(
												(l, i) =>
													i === index ? { ...l, [key]: e.target.value } : l,
											);
											patch({ ...config, severityLevels });
										}}
									/>
									{isLast ? (
										<IconButton
											size="small"
											title="Удалить уровень"
											aria-label="Удалить уровень"
											disabled={config.severityLevels.length <= 1}
											onClick={() =>
												patch({
													...config,
													severityLevels: config.severityLevels.filter(
														(_, i) => i !== index,
													),
												})
											}
											sx={{ color: "error.main", flexShrink: 0 }}
										>
											<CloseIcon fontSize="small" />
										</IconButton>
									) : (
										<span style={{ width: 28, flexShrink: 0 }} />
									)}
								</Flex>
							);
						})}
					</Flex>
				))}
				<Button
					size="small"
					startIcon={<AddIcon />}
					fullWidth
					variant="outlined"
					sx={ADD_BTN_SX}
					onClick={() =>
						patch({
							...config,
							severityLevels: [
								...config.severityLevels,
								{
									id: newLocalId("sev"),
									timelineLabel: "Новый срок",
									costLabel: "Новая стоимость",
									goalsLabel: "Новое влияние",
								},
							],
						})
					}
				>
					Уровень серьёзности
				</Button>
			</Card>

			<Card {...PANEL_CARD_PROPS}>
				<Typography variant="subtitle2" fontWeight={700}>
					Шкала вероятности
				</Typography>
				<Spacer space={10} />
				{config.probabilityLevels.map((level, index) => (
					<Flex
						key={level.id}
						gap={6}
						alignItems="center"
						style={{ marginBottom: 6 }}
					>
						<TextField
							size="small"
							fullWidth
							value={level.label}
							onChange={(e) => {
								const probabilityLevels = config.probabilityLevels.map((l, i) =>
									i === index ? { ...l, label: e.target.value } : l,
								);
								patch({ ...config, probabilityLevels });
							}}
						/>
						<IconButton
							size="small"
							title="Удалить"
							aria-label="Удалить вероятность"
							disabled={config.probabilityLevels.length <= 1}
							onClick={() =>
								patch({
									...config,
									probabilityLevels: config.probabilityLevels.filter(
										(_, i) => i !== index,
									),
								})
							}
							sx={{ color: "error.main" }}
						>
							<CloseIcon fontSize="small" />
						</IconButton>
					</Flex>
				))}
				<Button
					size="small"
					startIcon={<AddIcon />}
					fullWidth
					variant="outlined"
					sx={ADD_BTN_SX}
					onClick={() =>
						patch({
							...config,
							probabilityLevels: [
								...config.probabilityLevels,
								{ id: newLocalId("prob"), label: "Новая вероятность" },
							],
						})
					}
				>
					Значение
				</Button>
			</Card>

			<Card {...PANEL_CARD_PROPS}>
				<Typography variant="subtitle2" fontWeight={700}>
					Группы и поправочный коэффициент
				</Typography>
				<Spacer space={10} />
				<Flex gap={6} style={{ padding: "0 2px 4px" }}>
					<Typography variant="caption" sx={{ ...COL_HDR_SX, flex: 1 }}>
						Группа
					</Typography>
					<Typography
						variant="caption"
						sx={{ ...COL_HDR_SX, width: 88, flexShrink: 0 }}
					>
						Поправка
					</Typography>
					<span style={{ width: 28 }} />
				</Flex>
				{config.groups.map((group, index) => (
					<Flex
						key={group.id}
						gap={6}
						alignItems="center"
						style={{ marginBottom: 6 }}
					>
						<TextField
							size="small"
							fullWidth
							value={group.name}
							onChange={(e) => {
								const groups = config.groups.map((g, i) =>
									i === index ? { ...g, name: e.target.value } : g,
								);
								patch({ ...config, groups });
							}}
						/>
						<TextField
							size="small"
							value={String(group.coef).replace(".", ",")}
							onChange={(e) => {
								const n = parseNum(e.target.value);
								if (n == null) return;
								const groups = config.groups.map((g, i) =>
									i === index ? { ...g, coef: n } : g,
								);
								patch({ ...config, groups });
							}}
							sx={{ width: 88, flexShrink: 0 }}
							inputProps={{ inputMode: "decimal" }}
						/>
						<IconButton
							size="small"
							title="Удалить группу"
							aria-label="Удалить группу"
							disabled={config.groups.length <= 1}
							onClick={() =>
								patch({
									...config,
									groups: config.groups.filter((_, i) => i !== index),
								})
							}
							sx={{ color: "error.main" }}
						>
							<CloseIcon fontSize="small" />
						</IconButton>
					</Flex>
				))}
				<Button
					size="small"
					startIcon={<AddIcon />}
					fullWidth
					variant="outlined"
					sx={ADD_BTN_SX}
					onClick={() =>
						patch({
							...config,
							groups: [
								...config.groups,
								{ id: newLocalId("grp"), name: "Новая группа", coef: 0.05 },
							],
						})
					}
				>
					Группа
				</Button>
			</Card>

			<Card {...PANEL_CARD_PROPS}>
				<Typography variant="subtitle2" fontWeight={700}>
					Коэффициент за количество рисков
				</Typography>
				<Spacer space={10} />
				<Flex gap={6} style={{ padding: "0 2px 4px" }}>
					<Typography variant="caption" sx={{ ...COL_HDR_SX, flex: 1 }}>
						от
					</Typography>
					<Typography variant="caption" sx={{ ...COL_HDR_SX, flex: 1 }}>
						до
					</Typography>
					<Typography variant="caption" sx={{ ...COL_HDR_SX, flex: 1.2 }}>
						× коэфф.
					</Typography>
					<span style={{ width: 28 }} />
				</Flex>
				{config.riskCountRanges.map((range, index) => (
					<Flex
						key={`range-${index}`}
						gap={6}
						alignItems="center"
						style={{ marginBottom: 6 }}
					>
						<TextField
							size="small"
							value={range.minCount}
							onChange={(e) => {
								const n = parseNum(e.target.value);
								if (n == null) return;
								const riskCountRanges = config.riskCountRanges.map((r, i) =>
									i === index
										? { ...r, minCount: Math.max(0, Math.trunc(n)) }
										: r,
								);
								patch({ ...config, riskCountRanges });
							}}
							sx={{ flex: 1, minWidth: 0 }}
						/>
						<TextField
							size="small"
							placeholder="∞"
							value={range.maxCount == null ? "" : range.maxCount}
							onChange={(e) => {
								const raw = e.target.value.trim();
								const riskCountRanges = config.riskCountRanges.map(
									(r, i): V2UncertaintyRiskCountRange => {
										if (i !== index) return r;
										if (!raw) return { ...r, maxCount: null };
										const n = parseNum(raw);
										if (n == null) return r;
										return { ...r, maxCount: Math.max(0, Math.trunc(n)) };
									},
								);
								patch({ ...config, riskCountRanges });
							}}
							sx={{ flex: 1, minWidth: 0 }}
						/>
						<TextField
							size="small"
							value={String(range.coef).replace(".", ",")}
							onChange={(e) => {
								const n = parseNum(e.target.value);
								if (n == null) return;
								const riskCountRanges = config.riskCountRanges.map((r, i) =>
									i === index ? { ...r, coef: n } : r,
								);
								patch({ ...config, riskCountRanges });
							}}
							sx={{ flex: 1.2, minWidth: 0 }}
						/>
						<IconButton
							size="small"
							title="Удалить диапазон"
							aria-label="Удалить диапазон"
							onClick={() =>
								patch({
									...config,
									riskCountRanges: config.riskCountRanges.filter(
										(_, i) => i !== index,
									),
								})
							}
							sx={{ color: "error.main", flexShrink: 0 }}
						>
							<CloseIcon fontSize="small" />
						</IconButton>
					</Flex>
				))}
				<Button
					size="small"
					startIcon={<AddIcon />}
					fullWidth
					variant="outlined"
					sx={ADD_BTN_SX}
					onClick={() =>
						patch({
							...config,
							riskCountRanges: [
								...config.riskCountRanges,
								{ minCount: 1, maxCount: 1, coef: 1 },
							],
						})
					}
				>
					Диапазон
				</Button>
			</Card>

			<Card {...PANEL_CARD_PROPS}>
				<Typography variant="subtitle2" fontWeight={700}>
					Матрица: Серьёзность × Вероятность → Группа
				</Typography>
				<Spacer space={4} />
				<Typography variant="caption" color="text.secondary">
					Строки — сроки, столбцы — вероятность. Ячейка — группа.
				</Typography>
				<Spacer space={10} />
				<div style={{ overflowX: "auto", overflowY: "visible" }}>
					<table
						style={{
							borderCollapse: "collapse",
							width: "max-content",
							minWidth: "100%",
							fontSize: 11,
						}}
					>
						<thead>
							<tr>
								<th
									style={{
										textAlign: "left",
										padding: "4px 6px",
										borderBottom: "1px solid #e6e8ee",
										position: "sticky",
										left: 0,
										background: "#fff",
										zIndex: 1,
										minWidth: 88,
										maxWidth: 110,
									}}
								/>
								{config.probabilityLevels.map((p) => (
									<th
										key={p.id}
										title={p.label}
										style={{
											padding: "4px 4px",
											borderBottom: "1px solid #e6e8ee",
											fontWeight: 600,
											color: "#6b7280",
											minWidth: 108,
											maxWidth: 120,
											verticalAlign: "bottom",
											lineHeight: 1.25,
										}}
									>
										{truncateLabel(p.label, 22)}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{config.severityLevels.map((sev, sevIdx) => (
								<tr key={sev.id}>
									<td
										title={sev.timelineLabel}
										style={{
											padding: "4px 6px",
											borderBottom: "1px solid #f0f2f5",
											fontWeight: 600,
											position: "sticky",
											left: 0,
											background: "#fff",
											zIndex: 1,
											minWidth: 88,
											maxWidth: 110,
											lineHeight: 1.25,
										}}
									>
										{truncateLabel(sev.timelineLabel, 18)}
									</td>
									{config.probabilityLevels.map((prob, probIdx) => (
										<td
											key={`${sev.id}-${prob.id}`}
											style={{
												padding: 2,
												borderBottom: "1px solid #f0f2f5",
												minWidth: 108,
												maxWidth: 120,
											}}
										>
											<TextField
												select
												size="small"
												fullWidth
												value={
													config.matrix[sevIdx]?.[probIdx] ??
													config.groups[0]?.id ??
													""
												}
												onChange={(e) => {
													const matrix = config.matrix.map((row) => [...row]);
													if (!matrix[sevIdx]) {
														matrix[sevIdx] = config.probabilityLevels.map(
															() => config.groups[0]?.id ?? "",
														);
													}
													matrix[sevIdx]![probIdx] = e.target.value;
													patch({ ...config, matrix });
												}}
												SelectProps={{
													renderValue: (selected) => {
														const g = config.groups.find(
															(x) => x.id === selected,
														);
														return g?.name ?? "";
													},
												}}
												sx={{
													"& .MuiSelect-select": {
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap",
														pr: "28px !important",
														fontSize: 12,
													},
												}}
											>
												{config.groups.map((g) => (
													<MenuItem key={g.id} value={g.id}>
														{g.name} ({String(g.coef).replace(".", ",")})
													</MenuItem>
												))}
											</TextField>
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Card>
		</Flex>
	);
}

type CalculatorProps = {
	config: V2OverallUncertaintyConfig;
	preview: V2OverallUncertaintyPreviewState;
	breakdown: V2OverallUncertaintyCalcBreakdown;
	/** Один commit: каталог рисков (config) и/или ответы калькулятора (preview). */
	onCommit: (next: {
		config: V2OverallUncertaintyConfig;
		preview: V2OverallUncertaintyPreviewState;
	}) => void;
};

function SeverityOptionList({
	title,
	labelKey,
	selectedIdx,
	levels,
	onSelect,
}: {
	title: string;
	labelKey: "timelineLabel" | "costLabel";
	selectedIdx: number;
	levels: V2OverallUncertaintyConfig["severityLevels"];
	onSelect: (index: number) => void;
}) {
	return (
		<Card {...PANEL_CARD_PROPS} style={{ flex: 1, minWidth: 240 }}>
			<Typography variant="subtitle2" fontWeight={700}>
				{title}
			</Typography>
			<Spacer space={10} />
			{levels.map((level, index) => {
				const selected = selectedIdx === index;
				return (
					<Flex
						key={level.id}
						alignItems="center"
						gap={8}
						style={{
							marginBottom: 6,
							padding: "8px 10px",
							borderRadius: 8,
							border: `1px solid ${selected ? "#2f6bd8" : "#e8eaef"}`,
							background: selected ? "#eef4ff" : "#fff",
							cursor: "pointer",
						}}
						onClick={() => onSelect(index)}
					>
						<span
							style={{
								width: 10,
								height: 10,
								borderRadius: "50%",
								background: selected ? "#2f6bd8" : "#d2d7e0",
								flexShrink: 0,
							}}
						/>
						<Typography variant="body2">{level[labelKey]}</Typography>
					</Flex>
				);
			})}
		</Card>
	);
}

export function OverallUncertaintyCalculatorPanel({
	config,
	preview,
	breakdown,
	onCommit,
}: CalculatorProps) {
	const patchPreview = (partial: Partial<V2OverallUncertaintyPreviewState>) =>
		onCommit({ config, preview: { ...preview, ...partial } });

	return (
		<Flex flexDirection="column" gap={12}>
			<Flex alignItems="center" justifyContent="space-between" gap={12}>
				<Typography variant="subtitle1" fontWeight={700}>
					Дефолты анкеты (п.3)
				</Typography>
				<FormControlLabel
					control={
						<Switch
							checked={preview.enabled}
							onChange={(_, checked) =>
								patchPreview({
									enabled: checked,
									adjPct: checked ? preview.adjPct : null,
								})
							}
						/>
					}
					label={preview.enabled ? "Заполняется" : "Не применимо"}
				/>
			</Flex>

			{!preview.enabled ? (
				<Typography variant="body2" color="text.secondary">
					По умолчанию раздел выключен (как в шаблоне СА) — поправка 0,
					коэффициент 1. Включите «Заполняется», чтобы задать дефолтные ответы
					для анкеты. Список рисков ниже — каталог вопросов: названия можно
					менять, риски добавлять и удалять.
				</Typography>
			) : (
				<>
			<Flex flexDirection="column" gap={12}>
				<Flex gap={12} wrap="wrap">
					<SeverityOptionList
						title="3.1 Сроки инициативы"
						labelKey="timelineLabel"
						selectedIdx={preview.timelineIdx}
						levels={config.severityLevels}
						onSelect={(timelineIdx) => patchPreview({ timelineIdx })}
					/>
					<SeverityOptionList
						title="3.2 Стоимость инициативы"
						labelKey="costLabel"
						selectedIdx={preview.costIdx}
						levels={config.severityLevels}
						onSelect={(costIdx) => patchPreview({ costIdx })}
					/>
				</Flex>

				<Card {...PANEL_CARD_PROPS}>
					<Flex alignItems="baseline" gap={8} wrap="wrap">
						<Typography variant="subtitle2" fontWeight={700}>
							3.3 Поправка на общую неопределённость
						</Typography>
						<Typography variant="caption" color="text.secondary">
							(опц., 0–30%, перекрывает автосчёт)
						</Typography>
					</Flex>
					<Spacer space={10} />
					<TextField
						size="small"
						value={
							preview.adjPct == null
								? ""
								: String(preview.adjPct).replace(".", ",")
						}
						placeholder={String(
							Math.round(breakdown.autoAdj * 10000) / 100,
						).replace(".", ",")}
						title={
							preview.adjPct == null
								? `Сейчас авто: ${String(Math.round(breakdown.autoAdj * 10000) / 100).replace(".", ",")}%. Введите число, чтобы перекрыть.`
								: "Очистите поле, чтобы вернуться к авторасчёту"
						}
						onChange={(e) => {
							const raw = e.target.value.trim();
							if (!raw) {
								patchPreview({ adjPct: null });
								return;
							}
							const n = parseNum(raw);
							if (n == null) return;
							patchPreview({ adjPct: Math.min(30, Math.max(0, n)) });
						}}
						InputProps={{
							endAdornment: (
								<Typography variant="body2" color="text.secondary">
									%
								</Typography>
							),
						}}
						sx={{ width: 120 }}
					/>
				</Card>

				<Card {...PANEL_CARD_PROPS}>
					<Flex alignItems="center" justifyContent="space-between" gap={8}>
						<Typography variant="subtitle2" fontWeight={700}>
							3.4 Группа рисков
						</Typography>
						<Button
							size="small"
							startIcon={<AddIcon />}
							sx={{ textTransform: "none" }}
							onClick={() => {
								const id = newLocalId("risk");
								onCommit({
									config: {
										...config,
										risks: [...config.risks, { id, name: "Новый риск" }],
									},
									preview: {
										...preview,
										risks: [
											...preview.risks,
											{ id, enabled: false, probIdx: 0, goalsIdx: 0 },
										],
									},
								});
							}}
						>
							Риск
						</Button>
					</Flex>
					<Spacer space={10} />
					{config.risks.map((risk) => {
						const state = preview.risks.find((r) => r.id === risk.id) ?? {
							id: risk.id,
							enabled: false,
							probIdx: 0,
							goalsIdx: 0,
						};
						const contribution = breakdown.riskContributions.find(
							(c) => c.id === risk.id,
						);
						return (
							<Card
								key={risk.id}
								padding="10px"
								overflow="visible"
								maxHeight="none"
								sx={{
									mb: 1,
									borderColor: state.enabled ? "#f0e3d2" : undefined,
									bgcolor: state.enabled ? "#fdf8f1" : undefined,
								}}
							>
								<Flex gap={8} alignItems="flex-start">
									<Checkbox
										checked={state.enabled}
										onChange={(_, checked) => {
											const risks = preview.risks.some((r) => r.id === risk.id)
												? preview.risks.map((r) =>
														r.id === risk.id ? { ...r, enabled: checked } : r,
													)
												: [...preview.risks, { ...state, enabled: checked }];
											patchPreview({ risks });
										}}
									/>
									<Flex flexDirection="column" gap={8} flexGrow={1} minWidth="0">
										<TextField
											size="small"
											fullWidth
											value={risk.name}
											onChange={(e) =>
												onCommit({
													config: {
														...config,
														risks: config.risks.map((r) =>
															r.id === risk.id
																? { ...r, name: e.target.value }
																: r,
														),
													},
													preview,
												})
											}
										/>
										{state.enabled ? (
											<Flex gap={8} wrap="wrap" alignItems="center">
												<TextField
													select
													size="small"
													label="Вероятность"
													value={state.probIdx}
													onChange={(e) => {
														const probIdx = Number(e.target.value);
														patchPreview({
															risks: preview.risks.map((r) =>
																r.id === risk.id ? { ...r, probIdx } : r,
															),
														});
													}}
													sx={{ minWidth: 180 }}
												>
													{config.probabilityLevels.map((p, i) => (
														<MenuItem key={p.id} value={i}>
															{p.label}
														</MenuItem>
													))}
												</TextField>
												<TextField
													select
													size="small"
													label="Влияние на Цели"
													value={state.goalsIdx}
													onChange={(e) => {
														const goalsIdx = Number(e.target.value);
														patchPreview({
															risks: preview.risks.map((r) =>
																r.id === risk.id ? { ...r, goalsIdx } : r,
															),
														});
													}}
													sx={{ minWidth: 180 }}
												>
													{config.severityLevels.map((s, i) => (
														<MenuItem key={s.id} value={i}>
															{s.goalsLabel}
														</MenuItem>
													))}
												</TextField>
												{contribution ? (
													<Typography variant="caption" color="text.secondary">
														→ {contribution.groupName} (
														{String(contribution.coef).replace(".", ",")})
													</Typography>
												) : null}
											</Flex>
										) : null}
									</Flex>
									<IconButton
										size="small"
										title="Удалить риск"
										aria-label="Удалить риск"
										onClick={() => {
											onCommit({
												config: {
													...config,
													risks: config.risks.filter((r) => r.id !== risk.id),
												},
												preview: {
													...preview,
													risks: preview.risks.filter((r) => r.id !== risk.id),
												},
											});
										}}
										sx={{ color: "error.main" }}
									>
										<CloseIcon fontSize="small" />
									</IconButton>
								</Flex>
							</Card>
						);
					})}
				</Card>
			</Flex>

			<Card
				padding="12px"
				overflow="visible"
				maxHeight="none"
				style={{ flexShrink: 0, background: "#1c2333", color: "#fff" }}
			>
				<Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
					Предпросмотр формулы
				</Typography>
				{breakdown.formulaLines.map((line) => (
					<Typography
						key={line}
						variant="body2"
						sx={{
							opacity: 0.92,
							fontFamily: "ui-monospace, monospace",
							fontSize: 12,
							mb: 0.5,
						}}
					>
						{line}
					</Typography>
				))}
				<Flex
					alignItems="center"
					justifyContent="flex-end"
					style={{ marginTop: 8 }}
				>
					<Typography variant="h6" fontWeight={700}>
						{breakdown.coefficient.toFixed(2).replace(".", ",")} коэфф.
					</Typography>
				</Flex>
			</Card>
				</>
			)}
		</Flex>
	);
}
