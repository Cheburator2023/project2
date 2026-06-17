import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { V2TypicalWorkCardDto } from "@smart-anketa/api-contract";
import { previewWorkFormula, resolveActiveNormOnDate } from "@smart-anketa/api-contract";
import { apiClient } from "@react-client/common/api/helpers/apiClient";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { useCreateV2TemplateVersion } from "@react-client/common/api/queries/v2-templates";
import {
	usePreviewV2TypicalWork,
	useV2WorkParametersCatalog,
} from "@react-client/common/api/queries/v2-works";
import {
	coerceJsonSchema,
	coerceLogicGraph,
	coerceUiSchema,
} from "../../../utils/coerceV2TemplateSnapshot";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@react-client/common/toasts";
import { TypicalWorkFormulaLockedDialog } from "./TypicalWorkFormulaLockedDialog";
import { WorkFormulaEditor } from "./WorkFormulaEditor";
import { computeTriggerStatus } from "./typicalWorkPatchErrors";
import { triggerStatusColors, triggerStatusLabel } from "./typicalWorksUi";
import {
	cardToPatchDto,
	useDebouncedTypicalWorkSave,
	type SaveStatus,
} from "./useDebouncedTypicalWorkSave";

type TypicalWorkEditableCardProps = {
	card: V2TypicalWorkCardDto | undefined;
	loading: boolean;
	error: string | null;
	availableStreams: string[];
	streamExecutor: string | null;
	templateId: string;
	templateVersionId: string | null;
	onStreamChange: (stream: string) => void;
	onVersionChange: (versionId: string) => void;
};

function saveStatusLabel(status: SaveStatus): string {
	switch (status) {
		case "saving":
			return "Сохранение…";
		case "saved":
			return "Сохранено";
		case "error":
			return "Ошибка сохранения";
		case "dirty":
			return "Есть несохранённые изменения…";
		default:
			return "";
	}
}

function formatDate(value: string | null): string {
	if (!value) return "";
	const [y, m, d] = value.slice(0, 10).split("-");
	if (!y || !m || !d) return value;
	return `${d}.${m}.${y}`;
}

function parseDateInput(value: string): string {
	const trimmed = value.trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
	const m = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
	if (m) return `${m[3]}-${m[2]}-${m[1]}`;
	return trimmed;
}

export function TypicalWorkEditableCard({
	card,
	loading,
	error,
	availableStreams,
	streamExecutor,
	templateId,
	templateVersionId,
	onStreamChange,
	onVersionChange,
}: TypicalWorkEditableCardProps) {
	const { data: paramCatalog } = useV2WorkParametersCatalog();
	const previewMutation = usePreviewV2TypicalWork();
	const createVersion = useCreateV2TemplateVersion();
	const [draft, setDraft] = useState<V2TypicalWorkCardDto | null>(null);
	const [formulaLockedOpen, setFormulaLockedOpen] = useState(false);
	const [addParamCode, setAddParamCode] = useState("");
	const pendingRetryRef = useRef(false);
	const {
		status,
		errorMessage,
		bufferedRestore,
		scheduleSave,
		retry,
		discardBuffer,
		flushPending,
	} = useDebouncedTypicalWorkSave(card?.id ?? null, templateVersionId, {
		onFormulaLocked: () => setFormulaLockedOpen(true),
	});

	useEffect(() => {
		if (card) setDraft(structuredClone(card));
	}, [card]);

	useEffect(() => {
		if (pendingRetryRef.current && templateVersionId) {
			pendingRetryRef.current = false;
			void flushPending();
		}
	}, [flushPending, templateVersionId]);

	const paramOptions = paramCatalog?.items ?? [];
	const unusedLaborParams = paramOptions.filter(
		(p) => !draft?.laborParams.some((g) => g.paramCode === p.code),
	);

	const previewLocal = useMemo(() => {
		if (!draft || !streamExecutor) return null;
		const today = new Date().toISOString().slice(0, 10);
		const norm = resolveActiveNormOnDate(draft.norms, streamExecutor, today);
		if (norm == null) return { error: "На текущую дату не задана действующая норма", value: null };
		const coeffs: Record<string, number> = {};
		for (const group of draft.laborParams) {
			const first = group.coefficients[0];
			if (first) coeffs[group.paramCode] = first.coefficient;
		}
		const result = previewWorkFormula(draft.formula, draft.rounding, {
			norm,
			paramCoefficients: coeffs,
		});
		return { error: result.error, value: result.value, expanded: result.expanded };
	}, [draft, streamExecutor]);

	const commitDraft = (next: V2TypicalWorkCardDto) => {
		const withStatus = {
			...next,
			triggerStatus: computeTriggerStatus(next.rules),
		};
		setDraft(withStatus);
		scheduleSave(cardToPatchDto(withStatus, templateVersionId));
	};

	const handleCreateDraftForFormula = async () => {
		if (!templateId || !templateVersionId) return;
		try {
			const version = await apiClient<{
				jsonSchema: unknown;
				uiSchema: unknown;
				logic: unknown;
				dictionariesSnapshot: Record<string, unknown> | null;
				versionNumber: number;
			}>({
				url: `/v2/templates/${templateId}/versions/${templateVersionId}`,
				method: "GET",
			});
			const created = await createVersion.mutateAsync({
				templateId,
				dto: {
					jsonSchema: coerceJsonSchema(version.jsonSchema),
					uiSchema: coerceUiSchema(version.uiSchema),
					logic: coerceLogicGraph(version.logic),
					dictionariesSnapshot: version.dictionariesSnapshot,
					releaseNotes: `Черновик для редактирования формулы работ (из v${version.versionNumber})`,
					parentVersionId: templateVersionId,
				},
			});
			setFormulaLockedOpen(false);
			pendingRetryRef.current = true;
			onVersionChange(created.id);
			toast.success("Черновик создан — повторяем сохранение формулы");
		} catch (err) {
			toast.error("Не удалось создать черновик", {
				description: apiErrorMessage(err),
			});
		}
	};

	if (loading) {
		return (
			<Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
				<CircularProgress size={28} />
			</Box>
		);
	}

	if (error) {
		return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
	}

	if (!draft) {
		return <Alert severity="info" sx={{ m: 2 }}>Выберите работу в дереве слева.</Alert>;
	}

	const statusColors = triggerStatusColors(draft.triggerStatus);

	return (
		<Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
			<TypicalWorkFormulaLockedDialog
				open={formulaLockedOpen}
				pending={createVersion.isPending}
				onClose={() => setFormulaLockedOpen(false)}
				onCreateDraft={() => void handleCreateDraftForFormula()}
			/>
			<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 2 }}>
				<Box sx={{ flex: 1, minWidth: 240 }}>
					<TextField
						size="small"
						fullWidth
						label="Название работы"
						value={draft.name}
						onChange={(e) => commitDraft({ ...draft, name: e.target.value })}
					/>
					<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.75 }}>
						<Chip size="small" label={draft.archComponentType} />
						{draft.workType ? <Chip size="small" variant="outlined" label={draft.workType} /> : null}
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
							<MenuItem key={stream} value={stream}>{stream}</MenuItem>
						))}
					</Select>
				</FormControl>
				<Typography variant="caption" color={status === "error" ? "error.main" : "text.secondary"}>
					{saveStatusLabel(status)}
				</Typography>
				{status === "error" ? (
					<Button size="small" onClick={retry}>Повторить</Button>
				) : null}
			</Box>

			{errorMessage ? <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert> : null}
			{bufferedRestore ? (
				<Alert
					severity="warning"
					sx={{ mb: 2 }}
					action={
						<Box sx={{ display: "flex", gap: 1 }}>
							<Button size="small" onClick={() => void discardBuffer()}>
								Отменить
							</Button>
							<Button size="small" variant="outlined" onClick={retry}>
								Повторить
							</Button>
						</Box>
					}
				>
					Есть несохранённые изменения из предыдущей сессии (офлайн-буфер).
				</Alert>
			) : null}

			{!streamExecutor ? (
				<Alert severity="info">
					Выберите стрим-исполнителя, чтобы задать условия, коэффициенты и нормы.
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
								draft.triggerStatus === "appears"
									? `Работа появляется (${draft.rules.length} условий, И)`
									: triggerStatusLabel(draft.triggerStatus)
							}
							sx={{ mb: 1, bgcolor: statusColors.bg, color: statusColors.color, fontWeight: 600 }}
						/>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Параметр</TableCell>
									<TableCell>Оператор</TableCell>
									<TableCell>Значение</TableCell>
									<TableCell width={48} />
								</TableRow>
							</TableHead>
							<TableBody>
								{draft.rules.map((rule, index) => {
									const param = paramOptions.find((p) => p.code === rule.paramCode);
									return (
										<TableRow key={rule.id ?? index}>
											<TableCell>
												<Select
													size="small"
													fullWidth
													value={rule.paramCode}
													onChange={(e) => {
														const code = String(e.target.value);
														const picked = paramOptions.find((p) => p.code === code);
														const nextRules = [...draft.rules];
														nextRules[index] = {
															...rule,
															paramCode: code,
															paramName: picked?.name ?? code,
															valueLabel: null,
															valueCode: null,
														};
														commitDraft({ ...draft, rules: nextRules });
													}}
												>
													{paramOptions.map((p) => (
														<MenuItem key={p.code} value={p.code}>{p.name}</MenuItem>
													))}
												</Select>
											</TableCell>
											<TableCell>
												<Select
													size="small"
													value={rule.operator}
													onChange={(e) => {
														const nextRules = [...draft.rules];
														nextRules[index] = { ...rule, operator: e.target.value as typeof rule.operator };
														commitDraft({ ...draft, rules: nextRules });
													}}
												>
													<MenuItem value="=">=</MenuItem>
													<MenuItem value="!=">≠</MenuItem>
												</Select>
											</TableCell>
											<TableCell>
												<Select
													size="small"
													fullWidth
													value={rule.valueCode ?? ""}
													onChange={(e) => {
														const code = String(e.target.value);
														const value = param?.values.find((v) => v.code === code);
														const nextRules = [...draft.rules];
														nextRules[index] = {
															...rule,
															valueCode: code,
															valueLabel: value?.label ?? code,
														};
														commitDraft({ ...draft, rules: nextRules });
													}}
												>
													{(param?.values ?? []).map((v) => (
														<MenuItem key={v.code} value={v.code}>{v.label}</MenuItem>
													))}
												</Select>
											</TableCell>
											<TableCell>
												<IconButton
													size="small"
													aria-label="Удалить условие"
													onClick={() =>
														commitDraft({
															...draft,
															rules: draft.rules.filter((_, i) => i !== index),
														})
													}
												>
													<DeleteOutlineIcon fontSize="small" />
												</IconButton>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
						<Button
							size="small"
							sx={{ mt: 1 }}
							onClick={() =>
								commitDraft({
									...draft,
									rules: [
										...draft.rules,
										{
											id: `new-${Date.now()}`,
											streamExecutor: draft.streamExecutor,
											paramCode: paramOptions[0]?.code ?? "",
											paramName: paramOptions[0]?.name ?? null,
											operator: "=",
											valueCode: null,
											valueLabel: null,
										},
									],
								})
							}
						>
							+ Условие
						</Button>
					</Paper>

					<Paper variant="outlined" sx={{ p: 1.5 }}>
						<Typography variant="subtitle2" fontWeight={700} gutterBottom>Нормы трудозатрат</Typography>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Норма</TableCell>
									<TableCell>Начало</TableCell>
									<TableCell>Окончание</TableCell>
									<TableCell width={48} />
								</TableRow>
							</TableHead>
							<TableBody>
								{draft.norms.map((norm, index) => (
									<TableRow key={norm.id ?? index}>
										<TableCell>
											<TextField
												size="small"
												type="number"
												value={norm.normValue}
												onChange={(e) => {
													const next = [...draft.norms];
													next[index] = { ...norm, normValue: Number(e.target.value.replace(",", ".")) };
													commitDraft({ ...draft, norms: next });
												}}
											/>
										</TableCell>
										<TableCell>
											<TextField
												size="small"
												placeholder="ДД.ММ.ГГГГ"
												value={formatDate(norm.validFrom)}
												onChange={(e) => {
													const next = [...draft.norms];
													next[index] = { ...norm, validFrom: parseDateInput(e.target.value) };
													commitDraft({ ...draft, norms: next });
												}}
											/>
										</TableCell>
										<TableCell>
											<TextField
												size="small"
												placeholder="ДД.ММ.ГГГГ"
												value={formatDate(norm.validTo)}
												onChange={(e) => {
													const next = [...draft.norms];
													next[index] = {
														...norm,
														validTo: e.target.value.trim() ? parseDateInput(e.target.value) : null,
													};
													commitDraft({ ...draft, norms: next });
												}}
											/>
										</TableCell>
										<TableCell>
											<IconButton
												size="small"
												aria-label="Удалить норму"
												onClick={() =>
													commitDraft({ ...draft, norms: draft.norms.filter((_, i) => i !== index) })
												}
											>
												<DeleteOutlineIcon fontSize="small" />
											</IconButton>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
						<Button
							size="small"
							sx={{ mt: 1 }}
							onClick={() =>
								commitDraft({
									...draft,
									norms: [
										...draft.norms,
										{
											id: `new-${Date.now()}`,
											streamExecutor: draft.streamExecutor,
											normValue: 1,
											validFrom: new Date().toISOString().slice(0, 10),
											validTo: null,
										},
									],
								})
							}
						>
							+ Норма
						</Button>
					</Paper>

					<Paper variant="outlined" sx={{ p: 1.5 }}>
						<Typography variant="subtitle2" fontWeight={700} gutterBottom>
							Параметры трудоёмкости
						</Typography>
						{draft.laborParams.length === 0 ? (
							<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
								Параметры трудоёмкости не заданы — норма используется как есть.
							</Typography>
						) : (
							draft.laborParams.map((group) => (
								<Box key={group.paramCode} sx={{ mb: 1.5 }}>
									<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
										<Typography variant="body2" fontWeight={600}>
											{group.paramName ?? group.paramCode}
										</Typography>
										<IconButton
											size="small"
											aria-label="Удалить параметр"
											title="Удалить параметр"
											onClick={() =>
												commitDraft({
													...draft,
													laborParams: draft.laborParams.filter(
														(g) => g.paramCode !== group.paramCode,
													),
												})
											}
										>
											<DeleteOutlineIcon fontSize="small" />
										</IconButton>
									</Box>
									<Table size="small">
										<TableBody>
											{group.coefficients.map((row, index) => (
												<TableRow key={row.id ?? index}>
													<TableCell>{row.valueLabel ?? "—"}</TableCell>
													<TableCell>
														<TextField
															size="small"
															type="number"
															value={row.coefficient}
															onChange={(e) => {
																const nextGroups = draft.laborParams.map((g) => {
																	if (g.paramCode !== group.paramCode) return g;
																	const coeffs = [...g.coefficients];
																	coeffs[index] = {
																		...row,
																		coefficient: Number(
																			e.target.value.replace(",", "."),
																		),
																	};
																	return { ...g, coefficients: coeffs };
																});
																commitDraft({ ...draft, laborParams: nextGroups });
															}}
														/>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</Box>
							))
						)}
						{unusedLaborParams.length > 0 ? (
							<Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1 }}>
								<FormControl size="small" sx={{ minWidth: 220 }}>
									<InputLabel id="add-labor-param-label">Параметр</InputLabel>
									<Select
										labelId="add-labor-param-label"
										label="Параметр"
										value={addParamCode}
										onChange={(e) => setAddParamCode(String(e.target.value))}
									>
										{unusedLaborParams.map((p) => (
											<MenuItem key={p.code} value={p.code}>
												{p.name}
											</MenuItem>
										))}
									</Select>
								</FormControl>
								<Button
									size="small"
									disabled={!addParamCode}
									onClick={() => {
										const picked = unusedLaborParams.find(
											(p) => p.code === addParamCode,
										);
										if (!picked) return;
										const newGroup = {
											paramCode: picked.code,
											paramName: picked.name,
											coefficients: picked.values.map((v) => ({
												id: `new-${Date.now()}-${v.code}`,
												streamExecutor: draft.streamExecutor,
												paramCode: picked.code,
												paramName: picked.name,
												valueCode: v.code,
												valueLabel: v.label,
												coefficient: 1,
											})),
										};
										commitDraft({
											...draft,
											laborParams: [...draft.laborParams, newGroup],
										});
										setAddParamCode("");
									}}
								>
									+ Параметр
								</Button>
							</Box>
						) : null}
					</Paper>

					<Paper variant="outlined" sx={{ p: 1.5 }}>
						<Typography variant="subtitle2" fontWeight={700} gutterBottom>Конструктор формулы</Typography>
						<WorkFormulaEditor
							formula={draft.formula}
							rounding={draft.rounding}
							laborParams={draft.laborParams}
							onFormulaChange={(formula) => commitDraft({ ...draft, formula })}
							onRoundingChange={(rounding) => commitDraft({ ...draft, rounding })}
						/>
					</Paper>

					<Paper variant="outlined" sx={{ p: 1.5, bgcolor: "#f8fafc" }}>
						<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<Typography variant="subtitle2" fontWeight={700}>Превью результата</Typography>
							<Button
								size="small"
								variant="outlined"
								disabled={previewMutation.isPending}
								onClick={() => {
									if (!draft.id || !streamExecutor) return;
									previewMutation.mutate({
										workId: draft.id,
										dto: { streamExecutor },
									});
								}}
							>
								Сверить с сервером
							</Button>
						</Box>
						<Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, mt: 1 }}>
							<Typography variant="body2" color="text.secondary">
								{previewLocal?.expanded ?? draft.formula.text}
								{previewLocal?.error ? ` · ${previewLocal.error}` : ""}
							</Typography>
							<Typography variant="h6" fontWeight={800} sx={{ fontFamily: "monospace" }}>
								{previewMutation.data?.result ?? previewLocal?.value ?? "—"}
							</Typography>
						</Box>
						{previewMutation.data && previewLocal?.value != null &&
						previewMutation.data.result != null &&
						Math.abs(previewMutation.data.result - previewLocal.value) > 0.0001 ? (
							<Alert severity="warning" sx={{ mt: 1 }}>
								Расхождение клиент/сервер: {previewLocal.value} vs {previewMutation.data.result}
							</Alert>
						) : null}
					</Paper>
				</Box>
			)}
		</Box>
	);
}
