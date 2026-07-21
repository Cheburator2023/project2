import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import Select from "@mui/material/Select";
import { FuzzyAutocomplete } from "@react-client/common/muiCustom/FuzzyAutocomplete";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type {
	V2TypicalWorkCardDto,
	V2TypicalWorkParameterDto,
} from "@smart-anketa/api-contract";
import {
	isParamUsedInFormula,
	removeIncompatibleLaborKindFormulaTokens,
	syncTermsFromTokenFormula,
	tokensToText,
	computeFormulaBadgeFromTokens,
	resolveActiveNormOnDate,
	isNumericLaborByValueParam,
	resolveNumericLaborPresetRows,
	buildNumericLaborCoefficientRows,
	reconcileFormulaWithLaborArchCounts,
	defaultLaborArchCounts,
	isExecutorStreamPresentInSchema,
} from "@smart-anketa/api-contract";
import { apiClient } from "@react-client/common/api/helpers/apiClient";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { useCreateV2TemplateVersion } from "@react-client/common/api/queries/v2-templates";
import {
	useV2TypicalWorkAssignments,
	useV2WorkParametersCatalog,
} from "@react-client/common/api/queries/v2-works";
import { useSchemaEditor } from "../../SchemaEditorContext";
import {
	buildSchemaWorkParameters,
	findSchemaWorkParameter,
	isSchemaLaborParamCandidate,
	isSchemaLaborParamUsed,
	isSchemaTextualParam,
	resolveEffectiveWorkArchComponentType,
	resolveSchemaParamForTriggerRule,
	resolveWorkParameterOption,
	schemaLaborParamPickerCaption,
	schemaParamRuleName,
	schemaWorkParameterEmptyPickerMessage,
	triggerRuleGroupKey,
} from "./schemaWorkParameters";
import { scrollWorkParamIntoView } from "../../schemaEditorIssueNavigation";
import {
	coerceDictionariesSnapshot,
	coerceJsonSchema,
	coerceLogicGraph,
	coerceUiSchema,
} from "../../../utils/coerceV2TemplateSnapshot";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "@react-client/common/toasts";
import { Flex } from "@react-client/common/primitives/Flex";
import { TypicalWorkFormulaLockedDialog } from "./TypicalWorkFormulaLockedDialog";
import { RemoveLaborParamDialog } from "./RemoveLaborParamDialog";
import { TypicalWorkNormsSection } from "./TypicalWorkNormsSection";
import { TypicalWorkTriggersSection } from "./TypicalWorkTriggersSection";
import { TypicalWorkLaborArchCountSection } from "./TypicalWorkLaborArchCountSection";
import { WorkFormulaEditor } from "./WorkFormulaEditor";
import { ensureFormulaTerms } from "./WorkTermsFormulaEditor";
import {
	analyzeTriggerRules,
	DEFAULT_WORK_ARCH_COMPONENT_TYPE,
	isWorkCoefficientValueAvailable,
	resolveCanonicalWorkArchComponentType,
	WORK_ARCH_COMPONENT_TYPES,
} from "./typicalWorkPatchErrors";
import {
	useTypicalWorkTriggerAnalysis,
} from "./useTypicalWorkTriggerPreview";
import {
	recommendedStreamsForComponent,
	streamColor,
	streamDisplayLabel,
} from "./typicalWorksAreas";
import {
	ExecutorStreamMenuRow,
	ExecutorStreamPresenceHint,
} from "./ExecutorStreamPresenceLabel";
import {
	ARCH_COMPONENT_DOT,
	archComponentShortLabel,
	assignmentStatusLabel,
	formulaBadgeLabel,
	roundingModeLabel,
	triggerStatusLabel,
} from "./typicalWorksUi";
import {
	cardToPatchDto,
	useDebouncedTypicalWorkSave,
} from "./useDebouncedTypicalWorkSave";
import { reconcileStreamNormPeriods } from "./typicalWorkNormPeriods";
import { TypicalWorkValueMatchingInfo } from "./typicalWorkValueMatchingHelp";

type TypicalWorkEditableCardProps = {
	card: V2TypicalWorkCardDto | undefined;
	loading: boolean;
	error: string | null;
	availableStreams: string[];
	streamExecutor: string | null;
	templateId: string;
	templateVersionId: string | null;
	fallbackArchComponentType?: string | null;
	onStreamChange: (stream: string) => void;
	onVersionChange: (versionId: string) => void;
};

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
	fallbackArchComponentType,
	onStreamChange,
	onVersionChange,
}: TypicalWorkEditableCardProps) {
	const {
		fieldPathHints,
		uiSchema,
		jsonSchema,
		enumMapByCode,
		openDesignerAtPointer,
		triggerParamPickId,
		clearTriggerParamPick,
		typicalWorkNavFocus,
		clearTypicalWorkNavFocus,
		requestCalculationRefresh,
		registerTypicalWorkSaveGate,
	} = useSchemaEditor();
	const { data: assignmentsList } = useV2TypicalWorkAssignments({
		templateVersionId,
	});
	const { data: methodologyCatalogData } = useV2WorkParametersCatalog();
	const createVersion = useCreateV2TemplateVersion();
	const [draft, setDraft] = useState<V2TypicalWorkCardDto | null>(null);
	const [formulaLockedOpen, setFormulaLockedOpen] = useState(false);
	const [laborPickerKey, setLaborPickerKey] = useState(0);
	const [laborDeleteTarget, setLaborDeleteTarget] = useState<{
		paramCode: string;
		paramName: string;
	} | null>(null);
	const [pendingArchComponentType, setPendingArchComponentType] = useState<
		string | null
	>(null);
	const [streamMenuOpen, setStreamMenuOpen] = useState(false);
	const streamAnchorRef = useRef<HTMLButtonElement>(null);
	const cardScrollRef = useRef<HTMLDivElement>(null);
	const navFocusScrollKeyRef = useRef<string | null>(null);
	const pendingRetryRef = useRef(false);
	const {
		status,
		errorMessage,
		bufferedRestore,
		scheduleSave,
		retry,
		discardBuffer,
		flushPending,
		hasPending,
	} = useDebouncedTypicalWorkSave(card?.id ?? null, templateVersionId, {
		onFormulaLocked: () => setFormulaLockedOpen(true),
		onSaved: requestCalculationRefresh,
	});

	useEffect(() => {
		if (!draft) {
			registerTypicalWorkSaveGate(null);
			return;
		}
		const blocked =
			status === "dirty" ||
			status === "saving" ||
			(status === "error" && hasPending());
		registerTypicalWorkSaveGate({
			blocked,
			message: blocked
				? status === "saving"
					? "Сохраняется типовая работа…"
					: status === "error"
						? "Исправьте ошибку сохранения типовой работы перед сохранением схемы"
						: "Сохраните типовую работу в панели логики перед сохранением схемы"
				: undefined,
			status,
			workName: draft.name,
			errorMessage: status === "error" ? errorMessage : null,
			onRetry: status === "error" ? retry : undefined,
		});
	}, [
		draft?.id,
		draft?.name,
		errorMessage,
		hasPending,
		registerTypicalWorkSaveGate,
		retry,
		status,
	]);

	useEffect(
		() => () => registerTypicalWorkSaveGate(null),
		[registerTypicalWorkSaveGate],
	);

	const lastSyncedCardKeyRef = useRef<string | null>(null);
	const defaultedArchKeyRef = useRef<string | null>(null);
	const saveInProgressRef = useRef(false);
	saveInProgressRef.current = status === "dirty" || status === "saving";

	const buildDraftFromCard = useCallback(
		(nextCard: V2TypicalWorkCardDto): V2TypicalWorkCardDto => {
			const formula = {
				tokens: nextCard.formula.tokens,
				text:
					nextCard.formula.text?.trim() ||
					tokensToText(nextCard.formula.tokens),
			};
			return {
				...structuredClone(nextCard),
				formula,
				formulaTerms: ensureFormulaTerms(nextCard),
				norms: reconcileStreamNormPeriods(structuredClone(nextCard.norms)),
			};
		},
		[],
	);

	useLayoutEffect(() => {
		if (!card) {
			lastSyncedCardKeyRef.current = null;
			setDraft(null);
			return;
		}
		const cardKey = `${card.id}::${card.streamExecutor}::${templateVersionId ?? ""}`;
		const isNewCard = cardKey !== lastSyncedCardKeyRef.current;
		if (!isNewCard && (hasPending() || saveInProgressRef.current)) return;
		lastSyncedCardKeyRef.current = cardKey;
		if (isNewCard) defaultedArchKeyRef.current = null;
		setDraft(buildDraftFromCard(card));
	}, [buildDraftFromCard, card, hasPending, templateVersionId]);

	const isDraftSyncedWithCard = useMemo(() => {
		if (!card || !draft) return false;
		return (
			draft.id === card.id &&
			draft.streamExecutor === card.streamExecutor &&
			(draft.assignmentId ?? null) === (card.assignmentId ?? null)
		);
	}, [card, draft]);

	const activeTriggerWork = useMemo(() => {
		if (!card) return null;
		if (isDraftSyncedWithCard && draft) return draft;
		return buildDraftFromCard(card);
	}, [buildDraftFromCard, card, draft, isDraftSyncedWithCard]);

	const transitiveSources = useMemo(() => {
		return (assignmentsList?.items ?? [])
			.filter((item) => item.id !== draft?.assignmentId)
			.map((item) => ({
				assignmentId: item.id,
				workId: item.workId,
				workName: item.workName,
				streamExecutor: item.streamExecutor,
				archComponentType: item.archComponentType,
			}));
	}, [assignmentsList?.items, draft?.assignmentId]);

	const activeNormValue = useMemo(() => {
		if (!draft) return null;
		const today = new Date().toISOString().slice(0, 10);
		return resolveActiveNormOnDate(draft.norms, draft.streamExecutor, today);
	}, [draft]);

	useEffect(() => {
		if (pendingRetryRef.current && templateVersionId) {
			pendingRetryRef.current = false;
			void flushPending();
		}
	}, [flushPending, templateVersionId]);

	const effectiveArchComponentType = useMemo(
		() =>
			resolveEffectiveWorkArchComponentType(
				draft?.archComponentType,
				card?.archComponentType,
				fallbackArchComponentType,
			),
		[
			card?.archComponentType,
			draft?.archComponentType,
			fallbackArchComponentType,
		],
	);

	const methodologyCatalog = useMemo(
		() => methodologyCatalogData?.items ?? [],
		[methodologyCatalogData?.items],
	);

	const paramOptions = useMemo(
		() =>
			buildSchemaWorkParameters({
				fieldPathHints,
				uiSchema: uiSchema as Record<string, unknown>,
				jsonSchema,
				enumMapByCode,
			}),
		[enumMapByCode, fieldPathHints, jsonSchema, uiSchema],
	);

	useEffect(() => {
		if (!typicalWorkNavFocus || card?.id !== typicalWorkNavFocus.workId) {
			return;
		}

		const scrollKey = `${typicalWorkNavFocus.workId}:${typicalWorkNavFocus.paramCode ?? ""}`;
		if (navFocusScrollKeyRef.current === scrollKey) {
			return;
		}
		if (!draft) {
			return;
		}

		navFocusScrollKeyRef.current = scrollKey;

		const paramCode = typicalWorkNavFocus.paramCode?.trim();
		const scrollTarget = () => {
			if (!paramCode) {
				cardScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
				clearTypicalWorkNavFocus();
				return;
			}

			const resolved =
				findSchemaWorkParameter(paramOptions, paramCode) ??
				resolveSchemaParamForTriggerRule({ paramCode }, paramOptions);
			const codesToTry = [
				resolved?.code,
				paramCode,
				...draft.laborParams.map((group) => group.paramCode),
				...draft.rules.map((rule) =>
					triggerRuleGroupKey(rule, paramOptions),
				),
			].filter((code): code is string => Boolean(code?.trim()));

			for (const code of [...new Set(codesToTry)]) {
				if (scrollWorkParamIntoView(code)) {
					clearTypicalWorkNavFocus();
					return;
				}
			}

			clearTypicalWorkNavFocus();
		};

		const frame = requestAnimationFrame(() => {
			requestAnimationFrame(scrollTarget);
		});
		return () => cancelAnimationFrame(frame);
	}, [
		card?.id,
		clearTypicalWorkNavFocus,
		draft,
		paramOptions,
		typicalWorkNavFocus,
	]);
	const laborParamOptions = useMemo(
		() => paramOptions.filter(isSchemaLaborParamCandidate),
		[paramOptions],
	);
	const resolveFormulaParamName = useCallback(
		(paramCode: string, paramName?: string | null) =>
			resolveWorkParameterOption(
				paramCode,
				paramName,
				paramOptions,
				methodologyCatalog,
			)?.name ??
			paramName ??
			paramCode,
		[methodologyCatalog, paramOptions],
	);
	const unusedLaborParams = laborParamOptions.filter(
		(p) => !draft?.laborParams.some((g) => isSchemaLaborParamUsed([g], p)),
	);
	const laborPickerHint = schemaWorkParameterEmptyPickerMessage(
		fieldPathHints.length,
		draft?.laborParams.length ?? 0,
		unusedLaborParams.length,
	);

	const coefficientCatalog = useMemo(() => {
		const byCode = new Map<
			string,
			{
				code: string;
				sourceKeys?: string[];
				values: Array<{ code: string; label: string }>;
			}
		>();

		const addParam = (
			param: V2TypicalWorkParameterDto,
			legacyCode?: string,
		) => {
			byCode.set(param.code, {
				code: param.code,
				sourceKeys: [
					...(param.sourceKeys ?? [param.code]),
					...(legacyCode && legacyCode !== param.code ? [legacyCode] : []),
				],
				values: param.values.map((value) => ({
					code: value.code,
					label: value.label,
				})),
			});
		};

		for (const param of laborParamOptions) {
			addParam(param);
		}

		for (const group of draft?.laborParams ?? []) {
			const alreadyKnown = [...byCode.values()].some(
				(entry) =>
					entry.code === group.paramCode ||
					entry.sourceKeys?.includes(group.paramCode),
			);
			if (alreadyKnown) continue;

			const resolved = resolveWorkParameterOption(
				group.paramCode,
				group.paramName,
				paramOptions,
				methodologyCatalog,
			);
			if (resolved) {
				addParam(resolved, group.paramCode);
			}
		}

		return [...byCode.values()];
	}, [draft?.laborParams, laborParamOptions, methodologyCatalog, paramOptions]);

	const resolveLaborParamOption = useCallback(
		(paramCode: string, paramName?: string | null) =>
			resolveWorkParameterOption(
				paramCode,
				paramName,
				paramOptions,
				methodologyCatalog,
			),
		[methodologyCatalog, paramOptions],
	);

	const triggerAnalysis = useTypicalWorkTriggerAnalysis(
		activeTriggerWork,
		methodologyCatalog,
	);

	const commitDraft = (next: V2TypicalWorkCardDto) => {
		const prunedTokens = removeIncompatibleLaborKindFormulaTokens(
			next.formula.tokens,
			next.laborParams.map((g) => ({
				paramCode: g.paramCode,
				paramName: g.paramName,
				kind: g.kind ?? "by_value",
			})),
		);
		const formula = {
			tokens: prunedTokens,
			text: tokensToText(prunedTokens),
		};
		const formulaTerms = syncTermsFromTokenFormula(formula);
		const nextTrigger = analyzeTriggerRules(
			next.rules,
			paramOptions,
			methodologyCatalog,
			undefined,
			undefined,
			undefined,
			next.triggerArchCount,
			next.triggerMode ?? "simple",
			next.triggerFormula,
		);
		const withDerived = {
			...next,
			norms: reconcileStreamNormPeriods(next.norms, next.streamExecutor),
			formula,
			formulaTerms,
			formulaBadge: computeFormulaBadgeFromTokens(formula.tokens),
			triggerStatus: nextTrigger.status,
		};
		setDraft(withDerived);
		scheduleSave(cardToPatchDto(withDerived, templateVersionId));
	};

	useEffect(() => {
		if (!draft || !card) return;
		if (resolveCanonicalWorkArchComponentType(draft.archComponentType)) return;
		if (resolveCanonicalWorkArchComponentType(card.archComponentType)) return;
		const cardKey = `${card.id}::${card.streamExecutor}`;
		if (defaultedArchKeyRef.current === cardKey) return;
		if (saveInProgressRef.current || hasPending()) return;
		defaultedArchKeyRef.current = cardKey;
		commitDraft({
			...draft,
			archComponentType: DEFAULT_WORK_ARCH_COMPONENT_TYPE,
		});
	}, [card, draft, hasPending]);

	const addLaborParam = (picked: V2TypicalWorkParameterDto) => {
		if (!draft) return;
		const paramName = schemaParamRuleName(picked);
		const numericPreset = resolveNumericLaborPresetRows(paramName);
		const useNumericByValue = isNumericLaborByValueParam({
			numeric: picked.numeric,
			values: picked.values,
			name: paramName,
		});
		const useAnyOf =
			!useNumericByValue &&
			(picked.numeric ||
				isSchemaTextualParam(picked) ||
				(Boolean(picked.dictionaryCode) && picked.values.length === 0));
		const newGroup = useAnyOf
			? {
					schemaFieldUid: picked.schemaFieldUid ?? null,
					paramCode: picked.code,
					paramName,
					kind: "any_of" as const,
					coefficients: [],
					anyOf: {
						valueCodes: [],
						valueLabels: [],
						coeffOn: 1,
						coeffOff: 1,
					},
				}
			: {
					schemaFieldUid: picked.schemaFieldUid ?? null,
					paramCode: picked.code,
					paramName,
					kind: "by_value" as const,
					coefficients:
						numericPreset != null
							? buildNumericLaborCoefficientRows(numericPreset, {
									streamExecutor: draft.streamExecutor,
									paramCode: picked.code,
									paramName,
								})
							: picked.values.map((v) => ({
									id: `new-${Date.now()}-${v.code}`,
									streamExecutor: draft.streamExecutor,
									paramCode: picked.code,
									paramName,
									valueCode: v.code,
									valueLabel: v.label,
									coefficient: 1,
								})),
				};
		commitDraft({
			...draft,
			laborParams: [...draft.laborParams, newGroup],
		});
		setLaborPickerKey((key) => key + 1);
	};

	const removeLaborParam = (paramCode: string) => {
		if (!draft) return;
		const nextLabor = draft.laborParams.filter(
			(g) => g.paramCode !== paramCode,
		);
		// commitDraft сам вычистит токены отсутствующего параметра из формулы
		commitDraft({
			...draft,
			laborParams: nextLabor,
		});
	};

	const requestRemoveLaborParam = (paramCode: string, paramName: string) => {
		if (!draft) return;
		if (isParamUsedInFormula(draft.formula.tokens, paramCode)) {
			setLaborDeleteTarget({ paramCode, paramName });
			return;
		}
		removeLaborParam(paramCode);
	};

	const requestArchComponentTypeChange = (archComponentType: string) => {
		if (!draft || archComponentType === draft.archComponentType) return;
		setPendingArchComponentType(archComponentType);
	};

	const confirmArchComponentTypeChange = () => {
		if (!draft || !pendingArchComponentType) return;
		commitDraft({
			...draft,
			archComponentType: pendingArchComponentType,
		});
		setPendingArchComponentType(null);
	};

	const handleCreateDraftForFormula = async () => {
		if (!templateId || !templateVersionId) return;
		try {
			const version = await apiClient<{
				jsonSchema: unknown;
				uiSchema: unknown;
				logic: unknown;
				dictionariesSnapshot: unknown;
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
					dictionariesSnapshot: coerceDictionariesSnapshot(
						version.dictionariesSnapshot,
					),
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
		return (
			<Alert severity="error" sx={{ m: 2 }}>
				{error}
			</Alert>
		);
	}

	if (!draft) {
		return (
			<Alert severity="info" sx={{ m: 2 }}>
				Выберите работу в списке слева.
			</Alert>
		);
	}

	const compDot = ARCH_COMPONENT_DOT[effectiveArchComponentType] ?? "#94a3b8";
	const recommended = recommendedStreamsForComponent(
		effectiveArchComponentType,
	);
	const otherStreams = availableStreams.filter(
		(s) => !recommended.includes(streamDisplayLabel(s)),
	);

	return (
		<Flex
			flexDirection="column"
			flexGrow={1}
			minHeight="0"
			minWidth="0"
			height="100%"
		>
			{/* <TypicalWorkSaveStatusBar
				status={status}
				workName={draft.name}
				errorMessage={errorMessage}
				onRetry={retry}
			/> */}
			<Box
				ref={cardScrollRef}
				data-work-card-root
				sx={{ flex: 1, overflow: "auto", px: 2.75, py: 2.25, minWidth: 0 }}
			>
				<TypicalWorkFormulaLockedDialog
					open={formulaLockedOpen}
					pending={createVersion.isPending}
					onClose={() => setFormulaLockedOpen(false)}
					onCreateDraft={() => void handleCreateDraftForFormula()}
				/>
				<RemoveLaborParamDialog
					open={Boolean(laborDeleteTarget)}
					paramName={laborDeleteTarget?.paramName ?? ""}
					onClose={() => setLaborDeleteTarget(null)}
					onConfirm={() => {
						if (!laborDeleteTarget) return;
						removeLaborParam(laborDeleteTarget.paramCode);
						setLaborDeleteTarget(null);
					}}
				/>
				<Dialog
					open={pendingArchComponentType != null}
					onClose={() => setPendingArchComponentType(null)}
					maxWidth="sm"
					fullWidth
				>
					<DialogTitle>Изменить тип архитектурного компонента?</DialogTitle>
					<DialogContent>
						<DialogContentText>
							Смена типа может повлиять на список рекомендованных стримов,
							условия появления и параметры трудоёмкости. После подтверждения
							карточка будет сохранена с новым типом:{" "}
							<b>{pendingArchComponentType}</b>.
						</DialogContentText>
					</DialogContent>
					<DialogActions>
						<Button
							onClick={() => setPendingArchComponentType(null)}
							sx={{ textTransform: "none" }}
						>
							Отмена
						</Button>
						<Button
							variant="contained"
							onClick={confirmArchComponentTypeChange}
							sx={{ textTransform: "none" }}
						>
							Изменить
						</Button>
					</DialogActions>
				</Dialog>
				<Box
					sx={{
						display: "flex",
						alignItems: "flex-start",
						gap: 1.5,
						flexWrap: "wrap",
						mb: 1.75,
					}}
				>
					<Box sx={{ flex: 1, minWidth: 240 }}>
						<Typography sx={{ fontSize: 11.5, color: "#8a93a3", mb: 0.4 }}>
							Типовая работа
						</Typography>
						<TextField
							variant="standard"
							fullWidth
							value={draft.name}
							onChange={(e) => commitDraft({ ...draft, name: e.target.value })}
							InputProps={{
								disableUnderline: true,
								sx: {
									fontSize: 19,
									fontWeight: 800,
									color: "#1d2435",
									lineHeight: 1.25,
								},
							}}
						/>
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								gap: 1,
								mt: 0.9,
								flexWrap: "wrap",
							}}
						>
							<FormControl size="small" sx={{ minWidth: 190 }}>
								<Select
									value={effectiveArchComponentType}
									onChange={(event) =>
										requestArchComponentTypeChange(String(event.target.value))
									}
									renderValue={(value) => (
										<Box
											sx={{
												display: "inline-flex",
												alignItems: "center",
												gap: 0.75,
												color: compDot,
												fontSize: 11,
												fontWeight: 700,
											}}
										>
											<Box
												sx={{
													width: 7,
													height: 7,
													borderRadius: "2px",
													bgcolor: compDot,
												}}
											/>
											{archComponentShortLabel(String(value))}
										</Box>
									)}
									sx={{
										height: 28,
										bgcolor: "#eef4ff",
										borderRadius: "7px",
										"& .MuiSelect-select": { py: 0.25 },
									}}
								>
									{WORK_ARCH_COMPONENT_TYPES.map((type) => (
										<MenuItem key={type} value={type}>
											{type}
										</MenuItem>
									))}
								</Select>
							</FormControl>
							{draft.assignmentStatus ? (
								<Box
									component="span"
									title="Статус назначения на стримы"
									sx={{
										display: "inline-flex",
										alignItems: "center",
										height: 24,
										px: 1,
										borderRadius: "6px",
										bgcolor: "#eef1f6",
										color: "#5b6577",
										fontSize: 11,
										fontWeight: 600,
									}}
								>
									{assignmentStatusLabel(
										draft.assignmentStatus,
										draft.usedOnSchemasCount,
									)}
								</Box>
							) : null}
							<Box
								component="span"
								title="Статус видимости при текущих ответах"
								sx={{
									display: "inline-flex",
									alignItems: "center",
									height: 24,
									px: 1,
									borderRadius: "6px",
									bgcolor: "#eef1f6",
									color: "#5b6577",
									fontSize: 11,
									fontWeight: 600,
								}}
							>
								{triggerStatusLabel(triggerAnalysis.status)}
							</Box>
							<Box
								component="span"
								sx={{
									display: "inline-flex",
									alignItems: "center",
									height: 24,
									px: 1,
									borderRadius: "6px",
									bgcolor: "#eef4ff",
									color: "#2f6bd8",
									fontSize: 11,
									fontWeight: 600,
								}}
							>
								{formulaBadgeLabel(draft.formulaBadge)}
							</Box>
							<Box
								component="span"
								sx={{
									display: "inline-flex",
									alignItems: "center",
									height: 24,
									px: 1,
									borderRadius: "6px",
									bgcolor: "#f6f7f9",
									color: "#6b7484",
									fontSize: 11,
									fontWeight: 600,
								}}
							>
								округл.: {roundingModeLabel(draft.rounding.mode)}
							</Box>
						</Box>
					</Box>

					<Box sx={{ position: "relative", minWidth: 230 }}>
						<Typography
							sx={{
								fontSize: 10.5,
								fontWeight: 700,
								letterSpacing: "0.04em",
								textTransform: "uppercase",
								color: "#aab1c0",
								mb: 0.75,
							}}
						>
							Стрим-исполнитель
						</Typography>
						<Button
							ref={streamAnchorRef}
							onClick={() => setStreamMenuOpen((v) => !v)}
							sx={{
								textTransform: "none",
								width: "100%",
								height: 36,
								justifyContent: "flex-start",
								gap: 1,
								border: "1px solid #dfe2ea",
								borderRadius: "9px",
								bgcolor: "#fff",
								color: "#1d2435",
								fontWeight: 600,
								fontSize: 13,
							}}
						>
							<Box
								sx={{
									width: 8,
									height: 8,
									borderRadius: "2px",
									bgcolor: streamColor(streamExecutor ?? ""),
								}}
							/>
							<Typography component="span" sx={{ flex: 1, textAlign: "left" }}>
								{streamExecutor ? streamDisplayLabel(streamExecutor) : "—"}
							</Typography>
							<Typography
								component="span"
								sx={{ color: "#aab1c0", fontSize: 11 }}
							>
								▾
							</Typography>
						</Button>
						<Popper
							open={streamMenuOpen}
							anchorEl={streamAnchorRef.current}
							placement="bottom-start"
							sx={{ zIndex: 30, width: streamAnchorRef.current?.offsetWidth }}
						>
							<ClickAwayListener onClickAway={() => setStreamMenuOpen(false)}>
								<Paper
									elevation={8}
									sx={{
										mt: 0.5,
										borderRadius: "10px",
										border: "1px solid #e1e5ec",
										p: 0.75,
										maxHeight: 280,
										overflow: "auto",
									}}
								>
									<Typography
										sx={{
											fontSize: 10,
											fontWeight: 700,
											color: "#aab1c0",
											px: 1,
											py: 0.5,
											textTransform: "uppercase",
										}}
									>
										Рекомендованные для компонента
									</Typography>
									{availableStreams
										.filter((s) => recommended.includes(streamDisplayLabel(s)))
										.map((stream) => (
											<MenuItem
												key={`rec-${stream}`}
												selected={streamExecutor === stream}
												onClick={() => {
													onStreamChange(stream);
													setStreamMenuOpen(false);
												}}
												sx={{ borderRadius: 1, py: 1 }}
											>
												<ExecutorStreamMenuRow
													stream={streamDisplayLabel(stream)}
													color={streamColor(stream)}
													present={isExecutorStreamPresentInSchema(
														uiSchema,
														stream,
													)}
													selected={streamExecutor === stream}
												/>
											</MenuItem>
										))}
									{otherStreams.length > 0 ? (
										<>
											<Typography
												sx={{
													fontSize: 10,
													fontWeight: 700,
													color: "#aab1c0",
													px: 1,
													py: 0.5,
													mt: 0.5,
													borderTop: "1px solid #f0f1f5",
													textTransform: "uppercase",
												}}
											>
												Остальные стримы
											</Typography>
											{otherStreams.map((stream) => (
												<MenuItem
													key={`oth-${stream}`}
													selected={streamExecutor === stream}
													onClick={() => {
														onStreamChange(stream);
														setStreamMenuOpen(false);
													}}
													sx={{ borderRadius: 1, py: 1 }}
												>
													<ExecutorStreamMenuRow
														stream={streamDisplayLabel(stream)}
														color={streamColor(stream)}
														present={isExecutorStreamPresentInSchema(
															uiSchema,
															stream,
														)}
														selected={streamExecutor === stream}
													/>
												</MenuItem>
											))}
										</>
									) : null}
								</Paper>
							</ClickAwayListener>
						</Popper>
					</Box>
				</Box>

				{streamExecutor ? (
					<Box sx={{ mb: 2 }}>
						<ExecutorStreamPresenceHint
							present={isExecutorStreamPresentInSchema(
								uiSchema,
								streamExecutor,
							)}
						/>
					</Box>
				) : null}

				{errorMessage ? (
					<Alert severity="error" sx={{ mb: 2 }}>
						{errorMessage}
					</Alert>
				) : null}
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
						Выберите стрим-исполнителя, чтобы задать условия, коэффициенты и
						нормы.
					</Alert>
				) : (
					<Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
						<TypicalWorkNormsSection
							norms={draft.norms}
							streamExecutor={streamExecutor}
							formatDate={formatDate}
							parseDateInput={parseDateInput}
							onChange={(norms) => commitDraft({ ...draft, norms })}
						/>

						<TypicalWorkTriggersSection
							rules={draft.rules}
							triggerMode={draft.triggerMode}
							triggerFormula={draft.triggerFormula}
							triggerArchCount={draft.triggerArchCount}
							triggerStatus={triggerAnalysis.status}
							validationIssues={triggerAnalysis.issues}
							schemaFieldCount={fieldPathHints.length}
							paramOptions={paramOptions}
							methodologyCatalog={methodologyCatalog}
							streamExecutor={streamExecutor ?? draft.streamExecutor}
							onChange={(rules) => commitDraft({ ...draft, rules })}
							onTriggerModeChange={(triggerMode) =>
								commitDraft({ ...draft, triggerMode })
							}
							onTriggerFormulaChange={(triggerFormula) =>
								commitDraft({ ...draft, triggerFormula })
							}
							onTriggerArchCountChange={(triggerArchCount) =>
								commitDraft({ ...draft, triggerArchCount })
							}
							onNavigateToSchemaField={(pointer) => {
								openDesignerAtPointer(pointer);
							}}
							triggerParamPickId={triggerParamPickId}
							onTriggerParamPickConsumed={clearTriggerParamPick}
						/>

						<Box
							sx={{
								bgcolor: "#fff",
								border: "1px solid #e6e8ee",
								borderRadius: "12px",
								p: "15px 17px",
								mb: 1.5,
							}}
						>
							<Box
								sx={{
									display: "flex",
									alignItems: "flex-start",
									gap: 1.1,
									mb: 0.6,
									flexWrap: "wrap",
								}}
							>
								<Typography
									sx={{
										fontSize: 13.5,
										fontWeight: 700,
										color: "#1d2435",
										pt: 0.75,
									}}
								>
									Параметры трудоёмкости
								</Typography>
								<Box
									sx={{
										ml: "auto",
										minWidth: 280,
										maxWidth: 420,
										flex: "1 1 280px",
									}}
								>
									<FuzzyAutocomplete<V2TypicalWorkParameterDto>
										key={laborPickerKey}
										data-test-id="labor-param-kind-select"
										options={unusedLaborParams}
										value={null}
										onChange={(param) => {
											if (!param) return;
											addLaborParam(param);
										}}
										getOptionLabel={(param) => param.name}
										getOptionValue={(param) => param.code}
										getOptionSecondaryText={(param) =>
											schemaLaborParamPickerCaption(param)
										}
										label="Параметр трудоёмкости"
										placeholder="Выберите поле схемы…"
										emptyLabel="Выберите поле схемы…"
										searchPlaceholder="поиск параметра…"
										noMatchesText="Параметры не найдены"
										allowEmpty
										disabled={unusedLaborParams.length === 0}
										helperText={
											unusedLaborParams.length === 0
												? laborPickerHint
												: undefined
										}
										statusAlert={
											unusedLaborParams.length === 0
												? {
														severity: "info",
														message: laborPickerHint,
													}
												: null
										}
									/>
								</Box>
							</Box>
							<Typography sx={{ fontSize: 11.5, color: "#8a93a3", mb: 1 }}>
								Коэффициенты в разрезе стрима «
								{streamDisplayLabel(streamExecutor)}».
							</Typography>
							<TypicalWorkValueMatchingInfo variant="labor" sx={{ mb: 1.5 }} />
							<TypicalWorkLaborArchCountSection
								laborArchCounts={draft.laborArchCounts ?? defaultLaborArchCounts()}
								onChange={(laborArchCounts) =>
									commitDraft({
										...draft,
										laborArchCounts,
										formula: reconcileFormulaWithLaborArchCounts(
											draft.formula,
											laborArchCounts,
										),
									})
								}
							/>
							{draft.laborParams.length === 0 ? (
								<Typography
									variant="body2"
									color="text.secondary"
									sx={{ mb: 1 }}
								>
									Параметры трудоёмкости не заданы — норма используется как есть
								</Typography>
							) : (
								draft.laborParams.map((group) => {
									const paramMeta = resolveLaborParamOption(
										group.paramCode,
										group.paramName,
									);
									const numericLaborRows =
										paramMeta?.numeric === true ||
										resolveNumericLaborPresetRows(
											paramMeta?.name ?? group.paramName,
										) != null;
									return (
										<Box
											key={group.paramCode}
											data-work-labor-param={group.paramCode}
											sx={{
												border: "1px solid #eef0f4",
												borderRadius: "10px",
												p: "11px 12px",
												mb: 1.25,
											}}
										>
											<Box
												sx={{
													display: "flex",
													alignItems: "center",
													gap: 1,
													mb: 1.25,
												}}
											>
												<Box
													sx={{
														display: "inline-flex",
														alignItems: "center",
														height: 19,
														px: 0.9,
														borderRadius: "5px",
														bgcolor: "#eef4ff",
														color: "#2f6bd8",
														fontSize: 10.5,
														fontWeight: 700,
														fontFamily: "monospace",
													}}
												>
													{group.paramCode}
												</Box>
												<Typography
													sx={{ flex: 1, fontSize: 12.5, fontWeight: 700 }}
												>
													{paramMeta?.name ??
														group.paramName ??
														group.paramCode}
												</Typography>
												<Select
													size="small"
													data-test-id="labor-param-mode-select"
													value={group.kind ?? "by_value"}
													onChange={(event) => {
														const kind = event.target.value as
															| "by_value"
															| "any_of";
														const param = resolveLaborParamOption(
															group.paramCode,
															group.paramName,
														);
														const nextGroups = draft.laborParams.map((g) => {
															if (g.paramCode !== group.paramCode) return g;
															if (kind === "any_of") {
																return {
																	...g,
																	kind,
																	coefficients: [],
																	anyOf: {
																		valueCodes: [],
																		valueLabels: [],
																		coeffOn: 1,
																		coeffOff: 1,
																	},
																};
															}
															return {
																...g,
																kind,
																anyOf: null,
																coefficients:
																	g.coefficients.length > 0
																		? g.coefficients
																		: (() => {
																				const preset =
																					resolveNumericLaborPresetRows(
																						param?.name ??
																							g.paramName,
																					);
																				if (preset) {
																					return buildNumericLaborCoefficientRows(
																						preset,
																						{
																							streamExecutor:
																								draft.streamExecutor,
																							paramCode: g.paramCode,
																							paramName: g.paramName,
																						},
																					);
																				}
																				return (param?.values ?? []).map(
																					(v) => ({
																						id: `new-${Date.now()}-${v.code}`,
																						streamExecutor:
																							draft.streamExecutor,
																						paramCode: g.paramCode,
																						paramName: g.paramName,
																						valueCode: v.code,
																						valueLabel: v.label,
																						coefficient: 1,
																					}),
																				);
																			})(),
															};
														});
														const nextTokens =
															removeIncompatibleLaborKindFormulaTokens(
																draft.formula.tokens,
																nextGroups.map((g) => ({
																	paramCode: g.paramCode,
																	paramName: g.paramName,
																	kind: g.kind ?? "by_value",
																})),
															);
														commitDraft({
															...draft,
															laborParams: nextGroups,
															formula: {
																...draft.formula,
																tokens: nextTokens,
																text: tokensToText(nextTokens),
															},
														});
													}}
													sx={{ minWidth: 130, height: 30 }}
												>
													<MenuItem value="by_value">По значениям</MenuItem>
													<MenuItem value="any_of">Any-of</MenuItem>
												</Select>
												<IconButton
													size="small"
													aria-label="Удалить параметр"
													title="Удалить параметр"
													onClick={() =>
														requestRemoveLaborParam(
															group.paramCode,
															group.paramName ?? group.paramCode,
														)
													}
												>
													<DeleteOutlineIcon fontSize="small" />
												</IconButton>
											</Box>
											{group.kind === "any_of" ? (
												<Box>
													<Typography
														sx={{ fontSize: 11.5, color: "#6b7484", mb: 1 }}
													>
														Коэффициент on применяется, если ответ ∈ выбранным
														значениям; off — иначе.
													</Typography>
													<Box
														sx={{
															display: "flex",
															flexWrap: "wrap",
															gap: 0.75,
															mb: 1,
														}}
													>
														{(paramMeta?.values ?? []).map((value) => {
															const selected = group.anyOf?.valueCodes.includes(
																value.code,
															);
															return (
																<Box
																	key={value.code}
																	component="button"
																	type="button"
																	onClick={() => {
																		const current = group.anyOf ?? {
																			valueCodes: [],
																			valueLabels: [],
																			coeffOn: 1,
																			coeffOff: 1,
																		};
																		const valueCodes = selected
																			? current.valueCodes.filter(
																					(c) => c !== value.code,
																				)
																			: [...current.valueCodes, value.code];
																		const valueLabels = selected
																			? current.valueLabels.filter(
																					(_, i) =>
																						current.valueCodes[i] !==
																						value.code,
																				)
																			: [...current.valueLabels, value.label];
																		const nextGroups = draft.laborParams.map(
																			(g) =>
																				g.paramCode === group.paramCode
																					? {
																							...g,
																							anyOf: {
																								...current,
																								valueCodes,
																								valueLabels,
																							},
																						}
																					: g,
																		);
																		commitDraft({
																			...draft,
																			laborParams: nextGroups,
																		});
																	}}
																	sx={{
																		border: `1px solid ${selected ? "#e8c9a0" : "#dfe2ea"}`,
																		bgcolor: selected ? "#fff7ed" : "#fff",
																		borderRadius: "8px",
																		px: 1.2,
																		py: 0.5,
																		cursor: "pointer",
																		fontFamily: "inherit",
																		fontSize: 12,
																	}}
																>
																	{value.label}
																</Box>
															);
														})}
													</Box>
													<Box sx={{ display: "flex", gap: 1 }}>
														<TextField
															size="small"
															type="number"
															label="Coeff on"
															value={group.anyOf?.coeffOn ?? 1}
															onChange={(e) => {
																const nextGroups = draft.laborParams.map((g) =>
																	g.paramCode === group.paramCode
																		? {
																				...g,
																				anyOf: {
																					valueCodes: g.anyOf?.valueCodes ?? [],
																					valueLabels:
																						g.anyOf?.valueLabels ?? [],
																					coeffOn: Number(
																						e.target.value.replace(",", "."),
																					),
																					coeffOff: g.anyOf?.coeffOff ?? 1,
																				},
																			}
																		: g,
																);
																commitDraft({
																	...draft,
																	laborParams: nextGroups,
																});
															}}
														/>
														<TextField
															size="small"
															type="number"
															label="Coeff off"
															value={group.anyOf?.coeffOff ?? 1}
															onChange={(e) => {
																const nextGroups = draft.laborParams.map((g) =>
																	g.paramCode === group.paramCode
																		? {
																				...g,
																				anyOf: {
																					valueCodes: g.anyOf?.valueCodes ?? [],
																					valueLabels:
																						g.anyOf?.valueLabels ?? [],
																					coeffOn: g.anyOf?.coeffOn ?? 1,
																					coeffOff: Number(
																						e.target.value.replace(",", "."),
																					),
																				},
																			}
																		: g,
																);
																commitDraft({
																	...draft,
																	laborParams: nextGroups,
																});
															}}
														/>
													</Box>
												</Box>
											) : (
												<Box>
													{numericLaborRows ? (
														<Typography
															sx={{ fontSize: 11.5, color: "#6b7484", mb: 1 }}
														>
															Число из анкеты сопоставляется с подписью строки:
															точное значение («5»), «до N», «A–B», «&gt;N» /
															«более N» (как для количества метрик).
														</Typography>
													) : null}
													<Table size="small">
													<TableBody>
														{group.coefficients.map((row, index) => {
															const valueAvailable =
																numericLaborRows ||
																isWorkCoefficientValueAvailable(
																	row,
																	coefficientCatalog,
																);
															return (
																<TableRow key={row.id ?? index}>
																	<TableCell>
																		<Box
																			sx={{
																				display: "flex",
																				alignItems: "center",
																				gap: 0.75,
																				flexWrap: "wrap",
																			}}
																		>
																			{numericLaborRows ? (
																				<TextField
																					size="small"
																					value={row.valueLabel ?? ""}
																					placeholder="до 20 / 20–50 / >50 / 7"
																					onChange={(e) => {
																						const nextGroups =
																							draft.laborParams.map((g) => {
																								if (
																									g.paramCode !==
																									group.paramCode
																								)
																									return g;
																								const coeffs = [
																									...g.coefficients,
																								];
																								coeffs[index] = {
																									...row,
																									valueLabel:
																										e.target.value,
																								};
																								return {
																									...g,
																									coefficients: coeffs,
																								};
																							});
																						commitDraft({
																							...draft,
																							laborParams: nextGroups,
																						});
																					}}
																					sx={{ minWidth: 160 }}
																				/>
																			) : (
																				<Typography
																					component="span"
																					sx={{
																						fontSize: 13,
																						color: valueAvailable
																							? "inherit"
																							: "#c62828",
																						textDecoration: valueAvailable
																							? "none"
																							: "line-through",
																					}}
																				>
																					{row.valueLabel ?? "—"}
																				</Typography>
																			)}
																			{valueAvailable ? null : (
																				<Box
																					component="span"
																					title="Значение удалено из справочника — коэффициент исключён из расчёта"
																					sx={{
																						display: "inline-flex",
																						alignItems: "center",
																						height: 20,
																						px: 0.9,
																						borderRadius: "6px",
																						fontSize: 11,
																						fontWeight: 600,
																						bgcolor: "#fdecec",
																						color: "#c62828",
																						border: "1px solid #f5c6c6",
																					}}
																				>
																					Значение недоступно
																				</Box>
																			)}
																		</Box>
																	</TableCell>
																	<TableCell>
																		<TextField
																			size="small"
																			type="number"
																			value={row.coefficient}
																			onChange={(e) => {
																				const nextGroups =
																					draft.laborParams.map((g) => {
																						if (g.paramCode !== group.paramCode)
																							return g;
																						const coeffs = [...g.coefficients];
																						coeffs[index] = {
																							...row,
																							coefficient: Number(
																								e.target.value.replace(
																									",",
																									".",
																								),
																							),
																						};
																						return {
																							...g,
																							coefficients: coeffs,
																						};
																					});
																				commitDraft({
																					...draft,
																					laborParams: nextGroups,
																				});
																			}}
																		/>
																	</TableCell>
																	{numericLaborRows ? (
																		<TableCell sx={{ width: 48, p: 0.5 }}>
																			<IconButton
																				size="small"
																				aria-label="Удалить строку"
																				title="Удалить строку"
																				disabled={group.coefficients.length <= 1}
																				onClick={() => {
																					const nextGroups =
																						draft.laborParams.map((g) =>
																							g.paramCode === group.paramCode
																								? {
																										...g,
																										coefficients:
																											g.coefficients.filter(
																												(_, rowIndex) =>
																													rowIndex !== index,
																											),
																									}
																								: g,
																						);
																					commitDraft({
																						...draft,
																						laborParams: nextGroups,
																					});
																				}}
																			>
																				<DeleteOutlineIcon fontSize="small" />
																			</IconButton>
																		</TableCell>
																	) : null}
																</TableRow>
															);
														})}
													</TableBody>
												</Table>
													{numericLaborRows ? (
														<Button
															size="small"
															startIcon={<AddIcon />}
															sx={{ mt: 1 }}
															onClick={() => {
																const nextGroups = draft.laborParams.map((g) =>
																	g.paramCode === group.paramCode
																		? {
																				...g,
																				coefficients: [
																					...g.coefficients,
																					{
																						id: `new-${Date.now()}`,
																						streamExecutor:
																							draft.streamExecutor,
																						paramCode: g.paramCode,
																						paramName: g.paramName,
																						valueCode: `range_${g.coefficients.length + 1}`,
																						valueLabel: "",
																						coefficient: 1,
																					},
																				],
																			}
																		: g,
																);
																commitDraft({
																	...draft,
																	laborParams: nextGroups,
																});
															}}
														>
															Добавить значение или диапазон
														</Button>
													) : null}
												</Box>
											)}
										</Box>
									);
								})
							)}
						</Box>

						<Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px" }}>
							<WorkFormulaEditor
								formula={draft.formula}
								rounding={draft.rounding}
								laborParams={draft.laborParams}
								normValue={activeNormValue}
								currentAssignmentId={draft.assignmentId}
								transitiveSources={transitiveSources}
								onFormulaChange={(formula) =>
									commitDraft({ ...draft, formula })
								}
								onRoundingChange={(rounding) =>
									commitDraft({ ...draft, rounding })
								}
								resolveParamName={resolveFormulaParamName}
							/>
						</Paper>
					</Box>
				)}
			</Box>
		</Flex>
	);
}
