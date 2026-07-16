import { FuzzyAutocomplete } from "@react-client/common/muiCustom/FuzzyAutocomplete";
import { selectDisableTypeaheadMenuProps } from "@react-client/common/muiCustom/selectDisableTypeahead";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import {
	mergeParamDependencyRulesIntoLogic,
	parseParamDependencyGraphFromLogic,
} from "@smart-anketa/api-contract";
import { useV2WorkParametersCatalog } from "@react-client/common/api/queries/v2-works";
import { V2_TEMPLATE_VERSION_QUERY } from "@react-client/routing/common/pathHelpers";
import { useParams, useSearchParams } from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSchemaEditor } from "../../SchemaEditorContext";
import { buildSchemaWorkParameters } from "./schemaWorkParameters";
import {
	evaluateTargetVisible,
	isDependentTarget,
	readParameterDependencyDraft,
	rulesForTarget,
	writeParameterDependencyDraft,
	type ParameterDependencyDraft,
	type ParameterDependencyRule,
} from "./parameterDependenciesStorage";
import {
	buildParamFieldBindings,
	countUnmappedDependencyTargets,
	draftToGraph,
	graphToDraft,
} from "./parameterDependenciesLogic";

const SAVE_DEBOUNCE_MS = 600;

export function ParameterDependenciesPanel() {
	const { templateId = "" } = useParams<{ templateId: string }>();
	const [searchParams] = useSearchParams();
	const templateVersionId = searchParams.get(V2_TEMPLATE_VERSION_QUERY);
	const { data: catalog, isLoading, error } = useV2WorkParametersCatalog();
	const {
		logic,
		setLogic,
		fieldPathHints,
		recordDraftHistory,
		jsonSchema,
		uiSchema,
		enumMapByCode,
	} = useSchemaEditor();

	const params = useMemo(
		() => (catalog?.items ?? []).filter((p) => p.values.length > 0 || p.numeric),
		[catalog?.items],
	);

	const schemaParams = useMemo(
		() =>
			buildSchemaWorkParameters({
				fieldPathHints,
				uiSchema: uiSchema as Record<string, unknown>,
				jsonSchema,
				enumMapByCode,
			}),
		[enumMapByCode, fieldPathHints, jsonSchema, uiSchema],
	);

	const bindings = useMemo(
		() => buildParamFieldBindings(params, fieldPathHints, schemaParams),
		[params, fieldPathHints, schemaParams],
	);

	const [draft, setDraft] = useState<ParameterDependencyDraft>({ targets: [] });
	const [selectedCode, setSelectedCode] = useState<string | null>(null);
	const [previewAnswers, setPreviewAnswers] = useState<Record<string, string>>({});
	const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
	const hydratedRef = useRef(false);
	const skipSaveRef = useRef(true);
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		hydratedRef.current = false;
		skipSaveRef.current = true;
	}, [templateVersionId]);

	useEffect(() => {
		if (hydratedRef.current || !templateId || !params.length) return;

		const fromLogic = graphToDraft(
			parseParamDependencyGraphFromLogic(logic.rules),
		);
		const hasLogicDeps = fromLogic.targets.some((t) => t.rules.length > 0);

		if (hasLogicDeps) {
			setDraft(fromLogic);
		} else {
			const sessionDraft = readParameterDependencyDraft(templateId);
			if (sessionDraft.targets.some((t) => t.rules.length > 0)) {
				setDraft(sessionDraft);
				skipSaveRef.current = false;
			}
		}

		hydratedRef.current = true;
	}, [logic.rules, params.length, templateId]);

	useEffect(() => {
		if (!params.length) return;
		setSelectedCode((prev) =>
			prev && params.some((p) => p.code === prev) ? prev : params[0]?.code ?? null,
		);
		const initial: Record<string, string> = {};
		for (const p of params) {
			initial[p.code] = p.values[0]?.code ?? "";
		}
		setPreviewAnswers(initial);
	}, [params]);

	useEffect(() => {
		if (!templateId || !hydratedRef.current) return;
		writeParameterDependencyDraft(templateId, draft);
	}, [draft, templateId]);

	useEffect(() => {
		if (!hydratedRef.current) return;
		if (skipSaveRef.current) {
			skipSaveRef.current = false;
			return;
		}

		if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
		setSaveState("saving");

		saveTimerRef.current = setTimeout(() => {
			const graph = draftToGraph(draft);
			setLogic((prev) => ({
				rules: mergeParamDependencyRulesIntoLogic(
					prev.rules,
					graph,
					bindings,
				),
			}));
			recordDraftHistory();
			setSaveState("saved");
		}, SAVE_DEBOUNCE_MS);

		return () => {
			if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
		};
	}, [bindings, draft, recordDraftHistory, setLogic]);

	const selected = params.find((p) => p.code === selectedCode) ?? null;
	const selectedRules = selected ? rulesForTarget(draft, selected.code) : [];
	const dependentCount = draft.targets.filter((t) => t.rules.length > 0).length;
	const unmappedCount = countUnmappedDependencyTargets(draftToGraph(draft), bindings);

	const commitRules = (rules: ParameterDependencyRule[]) => {
		if (!selected) return;
		setDraft((prev) => {
			const others = prev.targets.filter(
				(t) => t.targetParamCode !== selected.code,
			);
			if (!rules.length) return { targets: others };
			return {
				targets: [...others, { targetParamCode: selected.code, rules }],
			};
		});
		setSaveState("saving");
	};

	const addRule = () => {
		if (!selected) return;
		const source = params.find((p) => p.code !== selected.code) ?? params[0];
		if (!source) return;
		const value = source.values[0];
		commitRules([
			...selectedRules,
			{
				id: `rule-${Date.now()}`,
				sourceParamCode: source.code,
				operator: "=",
				valueCode: value?.code ?? "",
				valueLabel: value?.label ?? "",
			},
		]);
	};

	const visiblePreview = params.filter((p) =>
		evaluateTargetVisible(rulesForTarget(draft, p.code), previewAnswers),
	);

	if (isLoading) {
		return (
			<Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
				<CircularProgress size={28} />
			</Box>
		);
	}

	if (error) {
		return (
			<Alert severity="error" sx={{ m: 2 }}>
				Не удалось загрузить каталог параметров.
			</Alert>
		);
	}

	return (
		<Box sx={{ display: "flex", height: "100%", minHeight: 0 }}>
			<Box
				sx={{
					width: 290,
					flexShrink: 0,
					borderRight: "1px solid #e6e8ee",
					bgcolor: "#fff",
					display: "flex",
					flexDirection: "column",
					minHeight: 0,
				}}
			>
				<Box sx={{ p: "12px 15px", borderBottom: "1px solid #eef0f4" }}>
					<Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1d2435" }}>
						Параметры схемы
					</Typography>
					<Typography sx={{ fontSize: 11.5, color: "#8a93a3", mt: 0.4 }}>
						{params.length} полей · {dependentCount} зависимых
						{saveState === "saved" ? " · сохранено" : null}
						{saveState === "saving" ? " · сохранение…" : null}
					</Typography>
				</Box>
				<Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>
					{params.map((param) => {
						const selectedRow = param.code === selectedCode;
						const dependent = isDependentTarget(draft, param.code);
						return (
							<Box
								key={param.code}
								onClick={() => setSelectedCode(param.code)}
								sx={{
									p: "9px 11px",
									my: 0.25,
									borderRadius: "9px",
									cursor: "pointer",
									bgcolor: selectedRow ? "#eef4ff" : "#fff",
									border: `1px solid ${selectedRow ? "#bcd3f5" : "transparent"}`,
								}}
							>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Typography
										sx={{
											flex: 1,
											fontSize: 12.5,
											color: "#28303f",
											lineHeight: 1.3,
										}}
									>
										{param.name}
									</Typography>
									{dependent ? (
										<Box
											sx={{
												height: 18,
												px: 0.9,
												borderRadius: "5px",
												bgcolor: "#eef4ff",
												color: "#2f6bd8",
												fontSize: 10,
												fontWeight: 700,
											}}
										>
											зависимое
										</Box>
									) : null}
								</Box>
							</Box>
						);
					})}
				</Box>
			</Box>

			<Box sx={{ flex: 1, overflowY: "auto", p: "18px 20px 30px", minWidth: 0 }}>
				{unmappedCount > 0 ? (
					<Alert severity="warning" sx={{ mb: 2 }}>
						{unmappedCount} зависимых параметров не найдены в схеме по заголовку
						поля — правила сохранены в логике, но visibility не применится, пока
						поле не появится в JSON Schema.
					</Alert>
				) : null}

				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2.25 }}>
					<Box sx={{ flex: "1 1 360px", minWidth: 310 }}>
						<Typography sx={{ fontSize: 11.5, color: "#8a93a3", mb: 0.4 }}>
							Поле анкеты
						</Typography>
						<Typography
							sx={{ fontSize: 18, fontWeight: 800, color: "#1d2435", mb: 2 }}
						>
							{selected?.name ?? "—"}
						</Typography>

						{selectedRules.length > 0 ? (
							<Box
								sx={{
									bgcolor: "#fff",
									border: "1px solid #e6e8ee",
									borderRadius: "12px",
									p: "16px 18px",
									mb: 1.75,
								}}
							>
								<Typography sx={{ fontSize: 13.5, fontWeight: 700, mb: 0.6 }}>
									Показывать поле, когда выполнены ВСЕ условия
								</Typography>
								<Typography sx={{ fontSize: 11.5, color: "#8a93a3", mb: 1.75 }}>
									Любое условие перестаёт выполняться — поле скрывается и не
									участвует в расчёте.
								</Typography>
								{selectedRules.map((rule, index) => {
									const source = params.find(
										(p) => p.code === rule.sourceParamCode,
									);
									return (
										<Box
											key={rule.id}
											sx={{
												display: "flex",
												alignItems: "center",
												gap: 1,
												flexWrap: "wrap",
												mb: 1.1,
											}}
										>
											<Typography sx={{ fontSize: 11, color: "#aab1c0", width: 16 }}>
												{index + 1}.
											</Typography>
											<Box sx={{ minWidth: 180, flex: "1 1 180px" }}>
												<FuzzyAutocomplete
													size="small"
													allowEmpty={false}
													options={params.filter(
														(p) => p.code !== selected?.code,
													)}
												value={
													params.find(
														(p) => p.code === rule.sourceParamCode,
													) ?? null
												}
												onChange={(p) => {
													if (!p) return;
													const v = p.values[0];
													commitRules(
														selectedRules.map((r) =>
															r.id === rule.id
																? {
																		...r,
																		sourceParamCode: p.code,
																		valueCode: v?.code ?? "",
																		valueLabel: v?.label ?? "",
																	}
																: r,
														),
													);
												}}
												getOptionLabel={(p) => p.name}
												getOptionValue={(p) => p.code}
												searchPlaceholder="Поиск параметра…"
												/>
											</Box>
											<Select
												size="small"
												value={rule.operator}
												MenuProps={selectDisableTypeaheadMenuProps()}
												onChange={(e) =>
													commitRules(
														selectedRules.map((r) =>
															r.id === rule.id
																? {
																		...r,
																		operator: e.target
																			.value as ParameterDependencyRule["operator"],
																	}
																: r,
														),
													)
												}
											>
												<MenuItem value="=">=</MenuItem>
												<MenuItem value="!=">≠</MenuItem>
											</Select>
											<Box sx={{ minWidth: 120, flex: "1 1 120px" }}>
												<FuzzyAutocomplete
													size="small"
													allowEmpty={false}
													options={source?.values ?? []}
												value={
													source?.values.find(
														(v) => v.code === rule.valueCode,
													) ?? null
												}
												onChange={(v) => {
													if (!v) return;
													commitRules(
														selectedRules.map((r) =>
															r.id === rule.id
																? {
																		...r,
																		valueCode: v.code,
																		valueLabel: v.label ?? v.code,
																	}
																: r,
														),
													);
												}}
												getOptionLabel={(v) => v.label}
												getOptionValue={(v) => v.code}
												searchPlaceholder="Поиск значения…"
												/>
											</Box>
											<Button
												size="small"
												color="error"
												onClick={() =>
													commitRules(
														selectedRules.filter((r) => r.id !== rule.id),
													)
												}
											>
												✕
											</Button>
										</Box>
									);
								})}
								<Button
									onClick={addRule}
									sx={{
										mt: 0.5,
										textTransform: "none",
										height: 34,
										border: "1px dashed #cfd6e2",
										borderRadius: "9px",
										color: "#5b6577",
									}}
								>
									+ Добавить условие (И)
								</Button>
							</Box>
						) : (
							<Box
								sx={{
									bgcolor: "#fff",
									border: "1px solid #e6e8ee",
									borderRadius: "12px",
									p: "16px 18px",
									mb: 1.75,
								}}
							>
								<Typography sx={{ fontSize: 13, color: "#6b7484", lineHeight: 1.5 }}>
									Поле показывается всегда. Добавьте условие, чтобы оно
									управлялось ответом на другой параметр.
								</Typography>
								<Button
									onClick={addRule}
									sx={{
										mt: 1.5,
										textTransform: "none",
										height: 34,
										border: "1px dashed #cfd6e2",
										borderRadius: "9px",
										color: "#5b6577",
									}}
								>
									+ Сделать зависимым
								</Button>
							</Box>
						)}

						<Box
							sx={{
								bgcolor: "#f4f7fc",
								border: "1px solid #e1e9f6",
								borderRadius: "11px",
								p: "13px 15px",
							}}
						>
							<Typography sx={{ fontSize: 12, color: "#3a4252", lineHeight: 1.55 }}>
								Правила записываются в{" "}
								<span style={{ fontFamily: "monospace", color: "#2f6bd8" }}>
									logic.rules
								</span>{" "}
								как visibility с меткой{" "}
								<span style={{ fontFamily: "monospace", color: "#2f6bd8" }}>
									paramDependency
								</span>
								. Скрытое поле не участвует в превью и валидации анкеты.
							</Typography>
						</Box>
					</Box>

					<Box
						sx={{
							flex: "1 1 300px",
							minWidth: 285,
							bgcolor: "#fafbfd",
							border: "1px solid #e6e8ee",
							borderRadius: "12px",
							p: "15px 16px",
						}}
					>
						<Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1d2435", mb: 0.5 }}>
							Предпросмотр · живой
						</Typography>
						<Typography sx={{ fontSize: 11.5, color: "#8a93a3", mb: 1.6 }}>
							Отвечайте — зависимые поля появляются и скрываются. Видно{" "}
							{visiblePreview.length} из {params.length}.
						</Typography>
						{visiblePreview.map((param) => {
							const dependent = isDependentTarget(draft, param.code);
							const current = previewAnswers[param.code] ?? "";
							return (
								<Box
									key={param.code}
									sx={{
										bgcolor: "#fff",
										border: `1px solid ${dependent ? "#cfe3d3" : "#e6e8ee"}`,
										borderRadius: "10px",
										p: "11px 12px",
										mb: 1.1,
									}}
								>
									<Box
										sx={{
											display: "flex",
											alignItems: "center",
											gap: 0.9,
											mb: 1,
										}}
									>
										<Typography
											sx={{
												flex: 1,
												fontSize: 12.5,
												fontWeight: 600,
												color: "#3a4252",
											}}
										>
											{param.name}
										</Typography>
										{dependent ? (
											<Box
												sx={{
													height: 17,
													px: 0.9,
													borderRadius: "5px",
													bgcolor: "#e7f6ec",
													color: "#1f8a4d",
													fontSize: 9.5,
													fontWeight: 700,
												}}
											>
												появилось
											</Box>
										) : null}
									</Box>
									<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6 }}>
										{param.values.map((value) => {
											const on = value.code === current;
											return (
												<Box
													key={value.code}
													component="button"
													type="button"
													onClick={() =>
														setPreviewAnswers((prev) => ({
															...prev,
															[param.code]: value.code,
														}))
													}
													sx={{
														height: 25,
														px: 1.1,
														borderRadius: "7px",
														border: `1px solid ${on ? "#2f6bd8" : "#dfe2ea"}`,
														bgcolor: on ? "#2f6bd8" : "#fff",
														color: on ? "#fff" : "#5b6577",
														fontSize: 11.5,
														fontWeight: on ? 700 : 500,
														cursor: "pointer",
														fontFamily: "inherit",
													}}
												>
													{value.label}
												</Box>
											);
										})}
									</Box>
								</Box>
							);
						})}
						{visiblePreview.length < params.length ? (
							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 1,
									p: "10px 12px",
									border: "1px dashed #d8dde6",
									borderRadius: "10px",
									color: "#aab1c0",
									fontSize: 11.5,
								}}
							>
								Скрыто полей: {params.length - visiblePreview.length} — условия не
								выполнены
							</Box>
						) : null}
					</Box>
				</Box>
			</Box>
		</Box>
	);
}
