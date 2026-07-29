import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Flex } from "@react-client/common/primitives/Flex";
import { toast } from "@react-client/common/toasts";
import {
	calculateOverallUncertaintyPreview,
	createDefaultOverallUncertaintyConfig,
	mapOverallUncertaintyPreviewToFormData,
	mergeOverallUncertaintyConfigIntoLogic,
	normalizeOverallUncertaintyCalculatorState,
	parseOverallUncertaintyConfigFromLogic,
	withNormalizedOverallUncertaintyCalculator,
	type V2OverallUncertaintyConfig,
	type V2OverallUncertaintyPreviewState,
} from "@smart-anketa/api-contract";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SCALES_PANEL_DEFAULT_WIDTH = 420;
const SCALES_PANEL_MIN_WIDTH = 320;
const SCALES_PANEL_MAX_WIDTH = 760;

/** Ширина левой колонки «Шкалы и веса»: ресайз за правый край (как в SchemaPropertiesPanel). */
function useScalesPanelWidth() {
	const [width, setWidth] = useState(SCALES_PANEL_DEFAULT_WIDTH);
	const [isResizing, setIsResizing] = useState(false);
	const widthRef = useRef(width);
	widthRef.current = width;

	const onResizeStart = useCallback((event: React.MouseEvent) => {
		event.preventDefault();
		const startX = event.clientX;
		const startWidth = widthRef.current;

		setIsResizing(true);
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";

		const onMouseMove = (moveEvent: MouseEvent) => {
			const next = startWidth + (moveEvent.clientX - startX);
			setWidth(
				Math.min(
					SCALES_PANEL_MAX_WIDTH,
					Math.max(SCALES_PANEL_MIN_WIDTH, next),
				),
			);
		};

		const onMouseUp = () => {
			setIsResizing(false);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		};

		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
	}, []);

	return { width, isResizing, onResizeStart };
}
import { useSchemaEditor } from "../../SchemaEditorContext";
import { useSchemaEditorUiStore } from "../../schemaEditorUiStore";
import {
	OverallUncertaintyCalculatorPanel,
	OverallUncertaintyScalesPanel,
} from "./OverallUncertaintyPanels";
import {
	setOverallUncertaintyDraft,
	peekOverallUncertaintyDraft,
} from "./overallUncertaintyDraftStore";
import {
	applyOverallUncertaintyConfigToSchema,
	ensureOverallUncertaintySchemaComponents,
	findUncertaintyModalPointer,
	mergeSchemaLabelsIntoOverallUncertaintyConfig,
	schemaHasOverallUncertaintyModal,
} from "./overallUncertaintySchemaSync";

function resolveInitialConfig(input: {
	templateId: string;
	logicRules: Parameters<typeof parseOverallUncertaintyConfigFromLogic>[0];
	jsonSchema: Parameters<
		typeof mergeSchemaLabelsIntoOverallUncertaintyConfig
	>[1];
}): V2OverallUncertaintyConfig {
	const fromDraft = peekOverallUncertaintyDraft({
		templateId: input.templateId,
	});
	const base =
		fromDraft ?? parseOverallUncertaintyConfigFromLogic(input.logicRules);
	const merged = mergeSchemaLabelsIntoOverallUncertaintyConfig(
		base,
		input.jsonSchema,
	);
	return withNormalizedOverallUncertaintyCalculator(
		merged,
		merged.calculator,
	);
}

export function OverallUncertaintyPanel() {
	const {
		logic,
		setLogic,
		jsonSchema,
		uiSchema,
		setJsonSchema,
		setUiSchema,
		formData,
		setFormData,
		recordDraftHistory,
		setSelectedPointer,
		templateId,
		templateVersionId,
		schemaDraftEditable,
		registerPendingPanelDraftFlush,
	} = useSchemaEditor();
	const activateMainTab = useSchemaEditorUiStore((s) => s.activateMainTab);

	const [config, setConfig] = useState<V2OverallUncertaintyConfig>(() =>
		resolveInitialConfig({
			templateId,
			logicRules: logic.rules,
			jsonSchema,
		}),
	);
	const [preview, setPreview] = useState<V2OverallUncertaintyPreviewState>(() =>
		normalizeOverallUncertaintyCalculatorState(config, config.calculator),
	);
	const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

	const hydrateEpochRef = useRef(0);
	const configRef = useRef(config);
	const previewRef = useRef(preview);
	const logicRef = useRef(logic);
	const jsonSchemaRef = useRef(jsonSchema);
	const uiSchemaRef = useRef(uiSchema);
	const formDataRef = useRef(formData);
	configRef.current = config;
	previewRef.current = preview;
	logicRef.current = logic;
	jsonSchemaRef.current = jsonSchema;
	uiSchemaRef.current = uiSchema;
	formDataRef.current = formData;

	const hasModal = schemaHasOverallUncertaintyModal(uiSchema);
	const modalPointer = findUncertaintyModalPointer(uiSchema);
	/** Только явный non-draft; undefined/true — редактирование разрешено. */
	const readOnly = schemaDraftEditable === false;
	const userDirtyRef = useRef(false);

	const buildPersistPatch = useCallback(
		(
			nextConfig: V2OverallUncertaintyConfig,
			nextPreview: V2OverallUncertaintyPreviewState,
		) => {
			const synced = applyOverallUncertaintyConfigToSchema(
				jsonSchemaRef.current,
				uiSchemaRef.current,
				nextConfig,
			);
			const nextFormData = mapOverallUncertaintyPreviewToFormData(
				formDataRef.current,
				nextConfig,
				nextPreview,
			);
			return {
				jsonSchema: synced.jsonSchema,
				uiSchema: synced.uiSchema,
				logic: {
					rules: mergeOverallUncertaintyConfigIntoLogic(
						logicRef.current.rules,
						nextConfig,
					),
				},
				formData: nextFormData,
			};
		},
		[],
	);

	const persistConfigNow = useCallback(
		(
			nextConfig: V2OverallUncertaintyConfig,
			nextPreview: V2OverallUncertaintyPreviewState,
			options?: { recordHistory?: boolean },
		) => {
			setOverallUncertaintyDraft({
				templateId,
				config: nextConfig,
			});

			const patch = buildPersistPatch(nextConfig, nextPreview);
			jsonSchemaRef.current = patch.jsonSchema;
			uiSchemaRef.current = patch.uiSchema;
			logicRef.current = patch.logic;
			formDataRef.current = patch.formData;

			if (options?.recordHistory !== false) {
				recordDraftHistory();
			}
			setJsonSchema(patch.jsonSchema);
			setUiSchema(patch.uiSchema);
			setLogic(patch.logic);
			setFormData(patch.formData);
			setSaveState("saved");
			return patch;
		},
		[
			buildPersistPatch,
			recordDraftHistory,
			setFormData,
			setJsonSchema,
			setLogic,
			setUiSchema,
			templateId,
		],
	);

	const flushPendingPersist = useCallback(() => {
		if (readOnly) return null;
		return persistConfigNow(configRef.current, previewRef.current, {
			recordHistory: false,
		});
	}, [persistConfigNow, readOnly]);

	useEffect(() => {
		registerPendingPanelDraftFlush(() => flushPendingPersist());
		return () => registerPendingPanelDraftFlush(null);
	}, [flushPendingPersist, registerPendingPanelDraftFlush]);

	useEffect(() => {
		userDirtyRef.current = false;
		const epoch = ++hydrateEpochRef.current;
		const timer = window.setTimeout(() => {
			if (hydrateEpochRef.current !== epoch) return;
			// Не затираем правки пользователя отложенной гидрацией.
			if (userDirtyRef.current) return;
			const next = resolveInitialConfig({
				templateId,
				logicRules: logicRef.current.rules,
				jsonSchema: jsonSchemaRef.current,
			});
			const nextPreview = normalizeOverallUncertaintyCalculatorState(
				next,
				next.calculator,
			);
			const withCalc = withNormalizedOverallUncertaintyCalculator(
				next,
				nextPreview,
			);
			setConfig(withCalc);
			configRef.current = withCalc;
			setPreview(nextPreview);
			previewRef.current = nextPreview;
			setOverallUncertaintyDraft({
				templateId,
				config: withCalc,
			});
			setSaveState("idle");
		}, 0);
		return () => window.clearTimeout(timer);
	}, [templateId, templateVersionId]);

	const commitState = useCallback(
		(
			nextConfig: V2OverallUncertaintyConfig,
			nextPreview: V2OverallUncertaintyPreviewState,
			options?: { toastMessage?: string },
		) => {
			if (readOnly) return;
			const firstEdit = !userDirtyRef.current;
			userDirtyRef.current = true;
			const calculator = normalizeOverallUncertaintyCalculatorState(
				nextConfig,
				nextPreview,
			);
			const withCalc = withNormalizedOverallUncertaintyCalculator(
				nextConfig,
				calculator,
			);
			setConfig(withCalc);
			configRef.current = withCalc;
			setPreview(calculator);
			previewRef.current = calculator;
			setSaveState("saving");
			persistConfigNow(withCalc, calculator);
			if (firstEdit) {
				toast.success(
					options?.toastMessage ?? "Настройки записаны в черновик схемы",
					{
						description: "Нажмите «Сохранить», чтобы зафиксировать версию",
						duration: 3500,
					},
				);
			}
		},
		[persistConfigNow, readOnly],
	);

	const handleConfigChange = useCallback(
		(next: V2OverallUncertaintyConfig) => {
			commitState(next, previewRef.current, {
				toastMessage: "Шкалы записаны в черновик схемы",
			});
		},
		[commitState],
	);

	const handleCalculatorCommit = useCallback(
		(next: {
			config: V2OverallUncertaintyConfig;
			preview: V2OverallUncertaintyPreviewState;
		}) => {
			commitState(next.config, next.preview, {
				toastMessage: "Дефолты анкеты записаны в черновик схемы",
			});
		},
		[commitState],
	);

	const handleResetToDefaults = useCallback(() => {
		if (readOnly) return;
		const defaults = createDefaultOverallUncertaintyConfig();
		const nextPreview = normalizeOverallUncertaintyCalculatorState(
			defaults,
			defaults.calculator,
		);
		commitState(defaults, nextPreview);
		toast.success("Сброшено к заводским значениям", {
			description: "Шкалы, матрица, риски и тоггл — как в шаблоне СА",
			duration: 3500,
		});
	}, [commitState, readOnly]);

	const handleEnsureInSchema = useCallback(() => {
		if (readOnly) return;
		const ensured = ensureOverallUncertaintySchemaComponents(
			jsonSchemaRef.current,
			uiSchemaRef.current,
		);
		jsonSchemaRef.current = ensured.jsonSchema;
		uiSchemaRef.current = ensured.uiSchema;
		const patch = persistConfigNow(configRef.current, previewRef.current);
		setSelectedPointer(
			findUncertaintyModalPointer(patch.uiSchema) ?? ensured.modalPointer,
		);
		activateMainTab("designer");
		toast.success(
			ensured.createdModal
				? "Компонент «Общая неопределённость» добавлен в схему"
				: "Компонент уже был в схеме — поля синхронизированы",
		);
	}, [activateMainTab, persistConfigNow, readOnly, setSelectedPointer]);

	const handleOpenInConstructor = useCallback(() => {
		if (!modalPointer) {
			handleEnsureInSchema();
			return;
		}
		setSelectedPointer(modalPointer);
		activateMainTab("designer");
	}, [activateMainTab, handleEnsureInSchema, modalPointer, setSelectedPointer]);

	const breakdown = useMemo(
		() => calculateOverallUncertaintyPreview(config, preview),
		[config, preview],
	);

	const {
		width: scalesPanelWidth,
		isResizing: scalesPanelResizing,
		onResizeStart: onScalesPanelResizeStart,
	} = useScalesPanelWidth();

	return (
		<Flex
			flexDirection="column"
			height="100%"
			minHeight="0"
			position="relative"
			data-test-id="overall-uncertainty-panel"
		>
			<Flex
				alignItems="center"
				justifyContent="space-between"
				gap={12}
				style={{
					flexShrink: 0,
					padding: "8px 16px",
					borderBottom: "1px solid var(--mui-palette-divider, #e0e0e0)",
				}}
			>
				<Typography variant="caption" color="text.secondary">
					Шкалы связаны с полями uncertaintyCalculation; кнопка модалки — с
					компонентом на холсте
				</Typography>
				<Flex alignItems="center" gap={8} flexShrink={0}>
					<Typography variant="caption" color="text.secondary">
						{readOnly
							? "Только просмотр"
							: saveState === "saving"
								? "Запись в черновик…"
								: saveState === "saved"
									? "В черновике схемы — нажмите «Сохранить»"
									: "Слева методика, справа дефолты анкеты"}
					</Typography>
					<Button
						size="small"
						variant="outlined"
						startIcon={<RestartAltIcon />}
						onClick={handleResetToDefaults}
						disabled={readOnly}
						title="Вернуть шкалы, матрицу, риски и тоггл к заводским значениям СА"
						sx={{ textTransform: "none", flexShrink: 0 }}
					>
						Сбросить
					</Button>
				</Flex>
			</Flex>

			<Box sx={{ px: 1.5, pt: 1.5, flexShrink: 0 }}>
				<Alert severity="info" sx={{ py: 0.5 }}>
					<strong>Слева</strong> — методика (шкалы, веса, матрица).{" "}
					<strong>Справа</strong> — дефолты п.3 для анкеты: тоггл «Заполняется»,
					ответы и каталог рисков (переименовать / добавить / удалить). Уходит в
					логику версии вместе со шкалами.
				</Alert>
			</Box>

			{!hasModal && !readOnly ? (
				<Box sx={{ px: 1.5, pt: 1.5, flexShrink: 0 }}>
					<Alert
						severity="warning"
						action={
							<Button color="inherit" size="small" onClick={handleEnsureInSchema}>
								Добавить в схему
							</Button>
						}
					>
						В схеме нет компонента «Расчёт общей неопределённости». Добавьте его
						здесь — появятся кнопка-модалка и системный блок uncertaintyCalculation.
					</Alert>
				</Box>
			) : hasModal && !readOnly ? (
				<Box sx={{ px: 1.5, pt: 1, flexShrink: 0 }}>
					<Button
						size="small"
						onClick={handleOpenInConstructor}
						sx={{ textTransform: "none" }}
					>
						Открыть компонент на холсте
					</Button>
				</Box>
			) : null}

			<Box
				sx={{
					flex: 1,
					minHeight: 0,
					display: "flex",
					overflow: "hidden",
					position: "relative",
				}}
			>
				<Box
					sx={{
						position: "relative",
						width: { xs: "100%", md: scalesPanelWidth },
						flexShrink: 0,
						borderRight: 1,
						borderColor: "divider",
						bgcolor: "background.default",
						display: "flex",
						minHeight: 0,
					}}
				>
					<Box
						sx={{
							flex: 1,
							minWidth: 0,
							p: 1.5,
							overflowY: "auto",
							overflowX: "hidden",
						}}
					>
						<OverallUncertaintyScalesPanel
							config={config}
							onChange={handleConfigChange}
						/>
					</Box>
					<Box
						role="separator"
						aria-orientation="vertical"
						aria-label="Изменить ширину панели шкал"
						title="Потяните, чтобы изменить ширину"
						onMouseDown={onScalesPanelResizeStart}
						sx={{
							position: "absolute",
							right: 0,
							top: 0,
							bottom: 0,
							width: 10,
							transform: "translateX(50%)",
							cursor: "col-resize",
							zIndex: 2,
							"&:hover": {
								"&::after": {
									opacity: 0.35,
								},
							},
							"&::after": {
								content: '""',
								position: "absolute",
								left: "50%",
								top: 0,
								bottom: 0,
								width: 2,
								transform: "translateX(-50%)",
								borderRadius: 1,
								bgcolor: "primary.main",
								opacity: scalesPanelResizing ? 0.45 : 0,
								transition: "opacity 0.15s",
							},
						}}
					/>
				</Box>
				<Box
					sx={{
						flex: 1,
						minWidth: 0,
						minHeight: 0,
						p: 1.5,
						overflowY: "auto",
						overflowX: "hidden",
						display: "flex",
						flexDirection: "column",
					}}
				>
					<OverallUncertaintyCalculatorPanel
						config={config}
						preview={preview}
						breakdown={breakdown}
						onCommit={handleCalculatorCommit}
					/>
				</Box>

				{readOnly ? (
					<Flex
						position="absolute"
						alignItems="center"
						justifyContent="center"
						style={{
							inset: 0,
							zIndex: 2,
							background: "rgba(255, 255, 255, 0.72)",
							backdropFilter: "blur(1px)",
							pointerEvents: "auto",
							padding: 24,
						}}
						data-test-id="overall-uncertainty-readonly-overlay"
					>
						<Flex
							flexDirection="column"
							alignItems="center"
							gap={8}
							style={{ maxWidth: 420, textAlign: "center" }}
						>
							<Typography variant="subtitle1" fontWeight={700}>
								Только просмотр
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Версия не черновик (актуальная / опубликованная). Настройки
								общей неопределённости нельзя менять — создайте черновик.
							</Typography>
						</Flex>
					</Flex>
				) : null}
			</Box>
		</Flex>
	);
}
