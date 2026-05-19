import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import type { V2LogicRuleDto } from "@smart-anketa/api-contract";
import { Flex } from "@react-client/common/primitives/Flex";
import JsonLogicBuilder, {
	type JsonLogicValue,
	rule as jsonRule,
} from "react-json-logic";
import {
	COMPUTED_FORMULA_OPTIONS,
	COMPUTED_ROLE_OPTIONS,
	type ComputedFormulaKind,
	type ComputedRulePayload,
	type ComputedRuleRole,
} from "../../utils/calculationEngine";
import { normalizeJsonPointer } from "../../utils/schemaPaths";
import { RULE_KIND_OPTIONS, ruleKindLabel } from "../constants";
import { useSchemaEditor } from "../SchemaEditorContext";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import { PanelChrome } from "../components/PanelChrome";
import { StyledJsonLogicShell } from "../../styles/styledJsonLogicShell";

function readComputedPayload(rule: V2LogicRuleDto): ComputedRulePayload {
	const raw = rule.payload;
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
	return raw as ComputedRulePayload;
}

export function SchemaLogicPanel({ embedded = false }: { embedded?: boolean }) {
	const {
		logic,
		formData,
		addRule,
		fieldPathHints,
		logicPathPick,
		setLogicPathPick,
		logicPathFieldHint,
		dictionaryEnumsLoading,
		cycles,
		selectedRule,
		setSelectedRuleId,
		updateRulePatch,
		removeSelectedRule,
		previewEvalNote,
	} = useSchemaEditor();

	const computedPayload = selectedRule
		? readComputedPayload(selectedRule)
		: {};
	const computedMode: "preset" | "expert" =
		computedPayload.mode === "preset" || computedPayload.kind
			? "preset"
			: "expert";

	const applyComputedPayloadPatch = (patch: Partial<ComputedRulePayload>) => {
		if (!selectedRule) return;
		const next: ComputedRulePayload = { ...computedPayload, ...patch };
		updateRulePatch({ payload: next as Record<string, unknown> });
	};

	return (
		<PanelChrome
			embedded={embedded}
			dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.logicEditor}
			title="Логика (JSON Logic)"
			description="Цель — JSON Pointer; условие — по данным превью (точечные пути в var)."
			actions={
				<Button size="small" variant="outlined" onClick={() => void addRule()}>
					Добавить правило
				</Button>
			}
		>
			<Alert severity="info" sx={{ mb: 2 }}>
				В <code>var</code> используйте точечные пути (<code>block.field</code>),
				не JSON Pointer. Для справочников в данных — <strong>code</strong>{" "}
				элемента.
			</Alert>

			<Box
				sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2, mb: 2 }}
			>
				<TextField
					select
					fullWidth
					size="small"
					label="Поле схемы"
					value={logicPathPick}
					onChange={(e) => setLogicPathPick(e.target.value)}
				>
					<MenuItem value="">
						<em>Выберите поле…</em>
					</MenuItem>
					{fieldPathHints.map((h) => (
						<MenuItem key={h.pointer} value={h.pointer}>
							{h.pointer}
							{h.title ? ` — ${h.title}` : ""}
							{h.dictionaryCode ? ` · ${h.dictionaryCode}` : ""}
						</MenuItem>
					))}
				</TextField>

				{logicPathFieldHint ? (
					<Box sx={{ mt: 1.5 }}>
						<Flex alignItems="center" gap={0.5} wrap="wrap" sx={{ mb: 0.5 }}>
							<Typography variant="caption" color="text.secondary">
								JSON Pointer:
							</Typography>
							<code style={{ fontSize: 12 }}>{logicPathFieldHint.pointer}</code>
							<IconButton
								size="small"
								title="Копировать"
								aria-label="Копировать"
								onClick={() =>
									void navigator.clipboard.writeText(logicPathFieldHint.pointer)
								}
							>
								<ContentCopyIcon sx={{ fontSize: 16 }} />
							</IconButton>
						</Flex>
						<Flex alignItems="center" gap={0.5} wrap="wrap" sx={{ mb: 0.5 }}>
							<Typography variant="caption" color="text.secondary">
								var:
							</Typography>
							<code style={{ fontSize: 12 }}>
								{logicPathFieldHint.varPath || "—"}
							</code>
						</Flex>
						{logicPathFieldHint.dictionaryCode ? (
							<Typography
								variant="caption"
								color="text.secondary"
								display="block"
								sx={{ mb: 1 }}
							>
								Справочник {logicPathFieldHint.dictionaryCode}: коды —{" "}
								{logicPathFieldHint.codesPreview?.join(", ") ??
									(dictionaryEnumsLoading ? "…" : "нет")}
							</Typography>
						) : null}
						<Button
							size="small"
							variant="outlined"
							disabled={!selectedRule || !logicPathFieldHint.varPath}
							onClick={() => {
								if (!logicPathFieldHint.varPath) return;
								updateRulePatch({
									condition: { var: logicPathFieldHint.varPath },
								});
							}}
						>
							Подставить var
						</Button>
					</Box>
				) : null}
			</Box>

			{cycles.length > 0 ? (
				<Alert severity="warning" sx={{ mb: 2 }}>
					Циклы зависимостей: {cycles.slice(0, 3).join(" · ")}
				</Alert>
			) : null}

			{logic.rules.length === 0 ? (
				<Typography variant="body2">Правила не созданы.</Typography>
			) : (
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: { xs: "1fr", lg: "260px 1fr" },
						gap: 2,
					}}
				>
					<Box>
						<Select
							fullWidth
							size="small"
							displayEmpty
							value={selectedRule?.id ?? ""}
							onChange={(e) => setSelectedRuleId(String(e.target.value))}
						>
							{logic.rules.map((r) => (
								<MenuItem key={r.id} value={r.id}>
									{ruleKindLabel(r.kind)} → {r.targetPath}
								</MenuItem>
							))}
						</Select>

						{selectedRule ? (
							<Box
								sx={{
									mt: 1.5,
									display: "flex",
									flexDirection: "column",
									gap: 1,
								}}
							>
								<TextField
									select
									size="small"
									label="Тип"
									value={selectedRule.kind}
									onChange={(e) =>
										updateRulePatch({
											kind: e.target.value as V2LogicRuleDto["kind"],
										})
									}
									fullWidth
								>
									{RULE_KIND_OPTIONS.map((rk) => (
										<MenuItem key={rk.key} value={rk.key}>
											{rk.label}
										</MenuItem>
									))}
								</TextField>
								<TextField
									select
									size="small"
									label="Цель (поле схемы)"
									fullWidth
									value={selectedRule.targetPath}
									onChange={(e) =>
										updateRulePatch({
											targetPath: normalizeJsonPointer(e.target.value),
										})
									}
								>
									{fieldPathHints.map((h) => (
										<MenuItem key={h.pointer} value={h.pointer}>
											{h.pointer}
											{h.title ? ` — ${h.title}` : ""}
										</MenuItem>
									))}
								</TextField>
								<Autocomplete
									multiple
									size="small"
									options={fieldPathHints.map((h) => h.pointer)}
									value={selectedRule.dependencies.map((d) =>
										normalizeJsonPointer(d),
									)}
									onChange={(_e, val) => {
										updateRulePatch({
											dependencies: [...new Set(val.map(normalizeJsonPointer))],
										});
									}}
									getOptionLabel={(opt) => {
										const hint = fieldPathHints.find((h) => h.pointer === opt);
										return hint?.title ? `${opt} — ${hint.title}` : opt;
									}}
									renderInput={(params) => (
										<TextField
											{...params}
											label="Зависимости (поля-источники)"
											placeholder="Выберите поле…"
										/>
									)}
								/>
								<TextField
									size="small"
									label="Комментарий"
									fullWidth
									value={selectedRule.description ?? ""}
									onChange={(e) =>
										updateRulePatch({ description: e.target.value })
									}
								/>

								{selectedRule.kind === "computed" ? (
									<>
										<Divider sx={{ my: 0.5 }}>Расчёт</Divider>
										<TextField
											select
											size="small"
											label="Роль в калькуляции"
											fullWidth
											value={computedPayload.role ?? "other"}
											onChange={(e) =>
												applyComputedPayloadPatch({
													role: e.target.value as ComputedRuleRole,
												})
											}
										>
											{COMPUTED_ROLE_OPTIONS.map((r) => (
												<MenuItem key={r.key} value={r.key}>
													{r.label}
												</MenuItem>
											))}
										</TextField>
										<TextField
											size="small"
											label="Подпись в панели Калькуляции"
											fullWidth
											value={computedPayload.label ?? ""}
											onChange={(e) =>
												applyComputedPayloadPatch({ label: e.target.value })
											}
										/>
										<TextField
											size="small"
											label="Источник веса / формулы (для tooltip)"
											fullWidth
											value={computedPayload.weightSourceLabel ?? ""}
											onChange={(e) =>
												applyComputedPayloadPatch({
													weightSourceLabel: e.target.value,
												})
											}
											helperText="Напр. 'Справочник complexity_weights v3 от 19.05'"
										/>
										<ToggleButtonGroup
											size="small"
											exclusive
											value={computedMode}
											onChange={(_e, val) => {
												if (val !== "preset" && val !== "expert") return;
												applyComputedPayloadPatch({
													mode: val,
													...(val === "expert" ? { kind: undefined } : {}),
												});
											}}
										>
											<ToggleButton value="preset">Пресет</ToggleButton>
											<ToggleButton value="expert">Эксперт (JsonLogic)</ToggleButton>
										</ToggleButtonGroup>
										{computedMode === "preset" ? (
											<>
												<TextField
													select
													size="small"
													label="Формула"
													fullWidth
													value={computedPayload.kind ?? "sum"}
													onChange={(e) =>
														applyComputedPayloadPatch({
															kind: e.target.value as ComputedFormulaKind,
														})
													}
													helperText={
														COMPUTED_FORMULA_OPTIONS.find(
															(f) => f.key === (computedPayload.kind ?? "sum"),
														)?.description
													}
												>
													{COMPUTED_FORMULA_OPTIONS.map((f) => (
														<MenuItem key={f.key} value={f.key}>
															{f.label}
														</MenuItem>
													))}
												</TextField>
												<Autocomplete
													multiple
													size="small"
													options={fieldPathHints.map((h) => h.varPath)}
													value={computedPayload.operands ?? []}
													onChange={(_e, val) =>
														applyComputedPayloadPatch({
															operands: val.filter(Boolean),
														})
													}
													getOptionLabel={(opt) => {
														const hint = fieldPathHints.find(
															(h) => h.varPath === opt,
														);
														return hint?.title ? `${opt} — ${hint.title}` : opt;
													}}
													renderInput={(params) => (
														<TextField
															{...params}
															label="Операнды (var)"
															placeholder="Выберите поле…"
														/>
													)}
												/>
											</>
										) : null}
										<TextField
											size="small"
											label="Описание формулы (tooltip)"
											fullWidth
											value={computedPayload.formulaHint ?? ""}
											onChange={(e) =>
												applyComputedPayloadPatch({ formulaHint: e.target.value })
											}
										/>
									</>
								) : null}

								{selectedRule.kind === "row_computed" ? (
									<>
										<Divider sx={{ my: 0.5 }}>Строка массива</Divider>
										<TextField
											select
											size="small"
											label="Массив (var)"
											fullWidth
											value={
												((selectedRule.payload as Record<string, unknown> | undefined)
													?.arrayPath as string | undefined) ?? ""
											}
											onChange={(e) =>
												updateRulePatch({
													payload: {
														...(selectedRule.payload ?? {}),
														arrayPath: e.target.value,
													},
												})
											}
											helperText="Поле-массив, по строкам которого пишется результат"
										>
											{fieldPathHints
												.filter((h) => h.varPath)
												.map((h) => (
													<MenuItem key={h.pointer} value={h.varPath}>
														{h.varPath}
														{h.title ? ` — ${h.title}` : ""}
													</MenuItem>
												))}
										</TextField>
										<TextField
											size="small"
											label="Поле строки (имя, например 'total')"
											fullWidth
											value={
												((selectedRule.payload as Record<string, unknown> | undefined)
													?.fieldVar as string | undefined) ?? ""
											}
											onChange={(e) =>
												updateRulePatch({
													payload: {
														...(selectedRule.payload ?? {}),
														fieldVar: e.target.value,
													},
												})
											}
											helperText="В JsonLogic поля строки доступны как { var: 'fieldName' } (контекст _row)"
										/>
									</>
								) : null}

								{selectedRule.kind === "task_trigger" ? (
									<>
										<Divider sx={{ my: 0.5 }}>Типовая работа</Divider>
										<TextField
											size="small"
											label="Код типовой работы"
											fullWidth
											value={
												(selectedRule.payload as Record<string, unknown> | undefined)
													?.taskCode as string | undefined
											}
											onChange={(e) =>
												updateRulePatch({
													payload: {
														...(selectedRule.payload ?? {}),
														taskCode: e.target.value,
													},
												})
											}
										/>
										<TextField
											size="small"
											label="Название"
											fullWidth
											value={
												(selectedRule.payload as Record<string, unknown> | undefined)
													?.label as string | undefined
											}
											onChange={(e) =>
												updateRulePatch({
													payload: {
														...(selectedRule.payload ?? {}),
														label: e.target.value,
													},
												})
											}
										/>
									</>
								) : null}
								<Flex gap={1}>
									<Button
										size="small"
										variant="outlined"
										onClick={() =>
											updateRulePatch({
												condition: jsonRule.looseEq(
													jsonRule.var("example"),
													"",
												),
											})
										}
									>
										Пример
									</Button>
									<Button
										size="small"
										color="warning"
										onClick={removeSelectedRule}
									>
										Удалить
									</Button>
								</Flex>
							</Box>
						) : null}
					</Box>

					<Box sx={{ minWidth: 0 }}>
						{selectedRule ? (
							<>
								<StyledJsonLogicShell sx={{ maxHeight: 440, mb: 1 }}>
									<JsonLogicBuilder
										value={(selectedRule.condition ?? true) as JsonLogicValue}
										data={formData}
										onChange={(value) =>
											updateRulePatch({
												condition: value as V2LogicRuleDto["condition"],
											})
										}
									/>
								</StyledJsonLogicShell>
								{previewEvalNote}
							</>
						) : null}
					</Box>
				</Box>
			)}
		</PanelChrome>
	);
}
