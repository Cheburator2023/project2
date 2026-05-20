import AddIcon from "@mui/icons-material/Add";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LoopIcon from "@mui/icons-material/Loop";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { V2LogicRuleDto } from "@smart-anketa/api-contract";
import { useMemo, useState } from "react";
import { RULE_KIND_OPTIONS, ruleKindLabel } from "../../constants";
import type { FieldPathHint } from "../../types";
import {
	groupRulesBySection,
	isRuleInCycle,
	ruleHelperText,
	ruleMatchesFilter,
	rulePrimaryLabel,
	validateRule,
} from "./helpers";

type Props = {
	rules: V2LogicRuleDto[];
	fieldPathHints: FieldPathHint[];
	selectedRuleId: string | undefined;
	onSelect: (id: string) => void;
	onAddRule: () => void;
	onAddRuleWithKind?: (kind: V2LogicRuleDto["kind"]) => void;
	onDuplicate?: (rule: V2LogicRuleDto) => void;
	cycles: string[];
};

export function LogicRulesSidebar({
	rules,
	fieldPathHints,
	selectedRuleId,
	onSelect,
	onAddRule,
	onAddRuleWithKind,
	onDuplicate,
	cycles,
}: Props) {
	const [search, setSearch] = useState("");
	const [kindFilter, setKindFilter] = useState<string>("all");
	const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
	const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);

	const filteredRules = useMemo(
		() =>
			rules.filter((r) =>
				ruleMatchesFilter(r, fieldPathHints, search, kindFilter),
			),
		[rules, fieldPathHints, search, kindFilter],
	);

	const groups = useMemo(
		() => groupRulesBySection(filteredRules, fieldPathHints),
		[filteredRules, fieldPathHints],
	);

	return (
		<Card
			variant="outlined"
			sx={{
				minWidth: 0,
				height: "100%",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
			}}
		>
			<CardContent
				sx={{
					p: 2,
					flex: 1,
					minHeight: 0,
					display: "flex",
					flexDirection: "column",
					"&:last-child": { pb: 2 },
				}}
			>
				<Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
					<Box>
						<Typography variant="subtitle2">Список правил</Typography>
						<Typography variant="caption" color="text.secondary">
							{rules.length === 0
								? "Создайте первое правило (N)."
								: `Всего: ${rules.length}. Группы — по разделам схемы.`}
						</Typography>
					</Box>

					{onAddRuleWithKind ? (
						<>
							<Button
								size="small"
								variant="outlined"
								startIcon={<AddIcon />}
								endIcon={<ArrowDropDownIcon />}
								onClick={(e) => setAddMenuAnchor(e.currentTarget)}
								fullWidth
							>
								Новое правило
							</Button>
							<Menu
								anchorEl={addMenuAnchor}
								open={Boolean(addMenuAnchor)}
								onClose={() => setAddMenuAnchor(null)}
							>
								<MenuItem
									onClick={() => {
										onAddRuleWithKind("visibility");
										setAddMenuAnchor(null);
									}}
								>
									Видимость
								</MenuItem>
								<MenuItem
									onClick={() => {
										onAddRuleWithKind("required");
										setAddMenuAnchor(null);
									}}
								>
									Обязательность
								</MenuItem>
								<MenuItem
									onClick={() => {
										onAddRuleWithKind("computed");
										setAddMenuAnchor(null);
									}}
								>
									Расчёт
								</MenuItem>
								<MenuItem
									onClick={() => {
										onAddRuleWithKind("task_trigger");
										setAddMenuAnchor(null);
									}}
								>
									Триггер работы
								</MenuItem>
								<MenuItem
									onClick={() => {
										setAddMenuAnchor(null);
										onAddRule();
									}}
								>
									Пустое правило…
								</MenuItem>
							</Menu>
						</>
					) : (
						<Button
							size="small"
							variant="outlined"
							startIcon={<AddIcon />}
							onClick={onAddRule}
							fullWidth
						>
							Новое правило
						</Button>
					)}

					{rules.length > 0 ? (
						<>
							<TextField
								size="small"
								placeholder="Поиск по полю или названию (⌘K)…"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								fullWidth
								inputProps={{ "data-logic-search": "true" }}
							/>
							<Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap>
								<Chip
									size="small"
									label="Все"
									color={kindFilter === "all" ? "primary" : "default"}
									onClick={() => setKindFilter("all")}
									variant={kindFilter === "all" ? "filled" : "outlined"}
								/>
								{RULE_KIND_OPTIONS.map((opt) => (
									<Chip
										key={opt.key}
										size="small"
										label={opt.label}
										color={kindFilter === opt.key ? "primary" : "default"}
										onClick={() => setKindFilter(opt.key)}
										variant={kindFilter === opt.key ? "filled" : "outlined"}
									/>
								))}
							</Stack>
						</>
					) : null}

					<Box sx={{ flex: 1, minHeight: 0, overflow: "auto", pr: 0.25 }}>
						{rules.length === 0 ? (
							<Alert severity="info">
								Правил нет. Нажмите «Новое правило» или выберите поле на холсте
								и создайте правило для него.
							</Alert>
						) : groups.length === 0 ? (
							<Typography variant="body2" color="text.secondary">
								Ничего не найдено. Измените фильтр или поиск.
							</Typography>
						) : (
							<Stack spacing={1.25}>
								{groups.map((group) => {
									const isCollapsed = collapsed[group.section] ?? false;
									return (
										<Box key={group.section || "_root"}>
											<Stack
												direction="row"
												spacing={0.5}
												alignItems="center"
												sx={{ mb: 0.5 }}
											>
												<IconButton
													size="small"
													onClick={() =>
														setCollapsed((prev) => ({
															...prev,
															[group.section]: !isCollapsed,
														}))
													}
													aria-label={
														isCollapsed ? "Развернуть" : "Свернуть"
													}
												>
													{isCollapsed ? (
														<ExpandMoreIcon fontSize="small" />
													) : (
														<ExpandLessIcon fontSize="small" />
													)}
												</IconButton>
												<Typography
													variant="overline"
													sx={{ flex: 1, lineHeight: 1.5 }}
												>
													{group.sectionTitle}
												</Typography>
												<Chip
													size="small"
													label={group.rules.length}
													variant="outlined"
												/>
											</Stack>

											<Collapse in={!isCollapsed} unmountOnExit>
												<Stack spacing={1}>
													{group.rules.map((rule) => (
														<RuleCard
															key={rule.id}
															rule={rule}
															fieldPathHints={fieldPathHints}
															selected={selectedRuleId === rule.id}
															onSelect={onSelect}
															onDuplicate={onDuplicate}
															inCycle={isRuleInCycle(rule, cycles)}
														/>
													))}
												</Stack>
											</Collapse>
										</Box>
									);
								})}
							</Stack>
						)}
					</Box>
				</Stack>
			</CardContent>
		</Card>
	);
}

function RuleCard({
	rule,
	fieldPathHints,
	selected,
	onSelect,
	onDuplicate,
	inCycle,
}: {
	rule: V2LogicRuleDto;
	fieldPathHints: FieldPathHint[];
	selected: boolean;
	onSelect: (id: string) => void;
	onDuplicate?: (rule: V2LogicRuleDto) => void;
	inCycle: boolean;
}) {
	const issues = useMemo(
		() => validateRule(rule, fieldPathHints),
		[rule, fieldPathHints],
	);
	const errors = issues.filter((i) => i.severity === "error").length;
	const warnings = issues.filter((i) => i.severity === "warning").length;
	const depsCount = rule.dependencies?.length ?? 0;

	return (
		<Box
			sx={{
				width: "100%",
				p: 1,
				border: 1,
				borderColor: selected
					? "primary.main"
					: errors > 0
						? "error.light"
						: "divider",
				borderRadius: 1,
				bgcolor: selected ? "action.selected" : "background.paper",
				"&:hover": { bgcolor: "action.hover" },
				cursor: "pointer",
				position: "relative",
			}}
			onClick={() => onSelect(rule.id)}
		>
			<Stack spacing={0.75}>
				<Stack
					direction="row"
					spacing={0.5}
					alignItems="center"
					flexWrap="wrap"
					useFlexGap
				>
					<Chip
						size="small"
						color={selected ? "primary" : "default"}
						label={ruleKindLabel(rule.kind)}
					/>
					{depsCount > 0 ? (
						<Chip
							size="small"
							variant="outlined"
							label={`${depsCount} завис.`}
						/>
					) : null}
					{inCycle ? (
						<Chip
							size="small"
							color="warning"
							icon={<LoopIcon sx={{ fontSize: 14 }} />}
							label="цикл"
						/>
					) : null}
					{errors > 0 ? (
						<Chip
							size="small"
							color="error"
							icon={<ErrorOutlineIcon sx={{ fontSize: 14 }} />}
							label={errors}
							title={issues
								.filter((i) => i.severity === "error")
								.map((i) => i.message)
								.join("\n")}
						/>
					) : null}
					{warnings > 0 ? (
						<Chip
							size="small"
							color="warning"
							variant="outlined"
							icon={<WarningAmberIcon sx={{ fontSize: 14 }} />}
							label={warnings}
							title={issues
								.filter((i) => i.severity === "warning")
								.map((i) => i.message)
								.join("\n")}
						/>
					) : null}
					<Box sx={{ flex: 1 }} />
					{onDuplicate ? (
						<IconButton
							size="small"
							title="Дублировать правило"
							aria-label="Дублировать правило"
							onClick={(e) => {
								e.stopPropagation();
								onDuplicate(rule);
							}}
						>
							<ContentCopyIcon sx={{ fontSize: 16 }} />
						</IconButton>
					) : null}
				</Stack>
				<Typography
					variant="body2"
					fontWeight={selected ? 700 : 500}
					title={rulePrimaryLabel(rule, fieldPathHints)}
					sx={{
						display: "-webkit-box",
						WebkitLineClamp: 2,
						WebkitBoxOrient: "vertical",
						overflow: "hidden",
					}}
				>
					{rulePrimaryLabel(rule, fieldPathHints)}
				</Typography>
				<Typography variant="caption" color="text.secondary">
					{ruleHelperText(rule)}
				</Typography>
			</Stack>
		</Box>
	);
}
