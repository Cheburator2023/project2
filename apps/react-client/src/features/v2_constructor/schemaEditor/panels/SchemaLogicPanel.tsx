import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { V2LogicRuleDto } from "@smart-anketa/api-contract";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import JsonLogicBuilder, {
	type JsonLogicValue,
	rule as jsonRule,
} from "react-json-logic";
import { RULE_KIND_OPTIONS, ruleKindLabel } from "../constants";
import { useSchemaEditor } from "../SchemaEditorContext";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import { PanelChrome } from "../components/PanelChrome";
import { StyledJsonLogicShell } from "../../styles/styledJsonLogicShell";

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
		selectedRuleId,
		setSelectedRuleId,
		depsDraft,
		setDepsDraft,
		handleDepsBlur,
		updateRulePatch,
		removeSelectedRule,
		previewEvalNote,
	} = useSchemaEditor();

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
				В <code>var</code> используйте точечные пути (<code>block.field</code>), не JSON Pointer.
				Для справочников в данных — <strong>code</strong> элемента.
			</Alert>

			<Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2, mb: 2 }}>
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
							<code style={{ fontSize: 12 }}>{logicPathFieldHint.varPath || "—"}</code>
						</Flex>
						{logicPathFieldHint.dictionaryCode ? (
							<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
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
								updateRulePatch({ condition: { var: logicPathFieldHint.varPath } });
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
							<Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
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
									size="small"
									label="Цель (JSON Pointer)"
									fullWidth
									value={selectedRule.targetPath}
									onChange={(e) => updateRulePatch({ targetPath: e.target.value })}
								/>
								<TextField
									size="small"
									label="Зависимости"
									fullWidth
									value={depsDraft}
									onChange={(e) => setDepsDraft(e.target.value)}
									onBlur={handleDepsBlur}
								/>
								<TextField
									size="small"
									label="Комментарий"
									fullWidth
									value={selectedRule.description ?? ""}
									onChange={(e) => updateRulePatch({ description: e.target.value })}
								/>
								<Flex gap={1}>
									<Button
										size="small"
										variant="outlined"
										onClick={() =>
											updateRulePatch({
												condition: jsonRule.looseEq(jsonRule.var("example"), ""),
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
