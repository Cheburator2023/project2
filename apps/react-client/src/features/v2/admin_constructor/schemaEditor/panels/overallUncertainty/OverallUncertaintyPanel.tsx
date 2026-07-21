import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Flex } from "@react-client/common/primitives/Flex";
import { toast } from "@react-client/common/toasts";
import { V2_TEMPLATE_VERSION_QUERY } from "@react-client/routing/common/pathHelpers";
import {
	calculateOverallUncertaintyPreview,
	createDefaultOverallUncertaintyPreviewState,
	mergeOverallUncertaintyConfigIntoLogic,
	parseOverallUncertaintyConfigFromLogic,
	type V2OverallUncertaintyConfig,
	type V2OverallUncertaintyPreviewState,
} from "@smart-anketa/api-contract";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useSchemaEditor } from "../../SchemaEditorContext";
import { useSchemaEditorUiStore } from "../../schemaEditorUiStore";
import {
	OverallUncertaintyCalculatorPanel,
	OverallUncertaintyScalesPanel,
} from "./OverallUncertaintyPanels";
import {
	applyOverallUncertaintyConfigToSchema,
	ensureOverallUncertaintySchemaComponents,
	findUncertaintyModalPointer,
	mergeSchemaLabelsIntoOverallUncertaintyConfig,
	schemaHasOverallUncertaintyModal,
} from "./overallUncertaintySchemaSync";

const SAVE_DEBOUNCE_MS = 500;

function stableConfigKey(config: V2OverallUncertaintyConfig): string {
	return JSON.stringify(config);
}

export function OverallUncertaintyPanel() {
	const { templateId = "" } = useParams<{ templateId: string }>();
	const [searchParams] = useSearchParams();
	const templateVersionId = searchParams.get(V2_TEMPLATE_VERSION_QUERY);
	const {
		logic,
		setLogic,
		jsonSchema,
		uiSchema,
		setJsonSchema,
		setUiSchema,
		recordDraftHistory,
		setSelectedPointer,
	} = useSchemaEditor();
	const activateMainTab = useSchemaEditorUiStore((s) => s.activateMainTab);

	const [config, setConfig] = useState<V2OverallUncertaintyConfig>(() =>
		mergeSchemaLabelsIntoOverallUncertaintyConfig(
			parseOverallUncertaintyConfigFromLogic(logic.rules),
			jsonSchema,
		),
	);
	const [preview, setPreview] = useState<V2OverallUncertaintyPreviewState>(() =>
		createDefaultOverallUncertaintyPreviewState(config),
	);
	const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

	const hydratedKeyRef = useRef<string | null>(null);
	const lastPersistedKeyRef = useRef<string>(stableConfigKey(config));
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const logicRef = useRef(logic);
	const jsonSchemaRef = useRef(jsonSchema);
	const uiSchemaRef = useRef(uiSchema);
	logicRef.current = logic;
	jsonSchemaRef.current = jsonSchema;
	uiSchemaRef.current = uiSchema;

	const hasModal = schemaHasOverallUncertaintyModal(uiSchema);
	const modalPointer = findUncertaintyModalPointer(uiSchema);

	useEffect(() => {
		const key = `${templateId}:${templateVersionId ?? "current"}`;
		if (hydratedKeyRef.current === key) return;
		hydratedKeyRef.current = key;
		const fromLogic = parseOverallUncertaintyConfigFromLogic(
			logicRef.current.rules,
		);
		const next = mergeSchemaLabelsIntoOverallUncertaintyConfig(
			fromLogic,
			jsonSchemaRef.current,
		);
		setConfig(next);
		setPreview(createDefaultOverallUncertaintyPreviewState(next));
		lastPersistedKeyRef.current = stableConfigKey(next);
	}, [templateId, templateVersionId]);

	useEffect(() => {
		const key = stableConfigKey(config);
		if (key === lastPersistedKeyRef.current) return;

		if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
		setSaveState("saving");
		saveTimerRef.current = setTimeout(() => {
			const currentLogic = logicRef.current;
			const synced = applyOverallUncertaintyConfigToSchema(
				jsonSchemaRef.current,
				uiSchemaRef.current,
				config,
			);
			const prevJson = JSON.stringify(jsonSchemaRef.current);
			const prevUi = JSON.stringify(uiSchemaRef.current);
			const nextJson = JSON.stringify(synced.jsonSchema);
			const nextUi = JSON.stringify(synced.uiSchema);
			const nextLogicRules = mergeOverallUncertaintyConfigIntoLogic(
				currentLogic.rules,
				config,
			);
			const logicChanged =
				JSON.stringify(currentLogic.rules) !== JSON.stringify(nextLogicRules);

			if (prevJson === nextJson && prevUi === nextUi && !logicChanged) {
				lastPersistedKeyRef.current = key;
				setSaveState("saved");
				return;
			}

			recordDraftHistory();
			if (prevJson !== nextJson) setJsonSchema(synced.jsonSchema);
			if (prevUi !== nextUi) setUiSchema(synced.uiSchema);
			if (logicChanged) {
				setLogic({ ...currentLogic, rules: nextLogicRules });
			}
			lastPersistedKeyRef.current = key;
			setSaveState("saved");
		}, SAVE_DEBOUNCE_MS);

		return () => {
			if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
		};
	}, [config, recordDraftHistory, setJsonSchema, setLogic, setUiSchema]);

	const handleEnsureInSchema = useCallback(() => {
		const ensured = ensureOverallUncertaintySchemaComponents(
			jsonSchemaRef.current,
			uiSchemaRef.current,
		);
		const synced = applyOverallUncertaintyConfigToSchema(
			ensured.jsonSchema,
			ensured.uiSchema,
			config,
		);
		recordDraftHistory();
		setJsonSchema(synced.jsonSchema);
		setUiSchema(synced.uiSchema);
		lastPersistedKeyRef.current = stableConfigKey(config);
		setSelectedPointer(ensured.modalPointer);
		activateMainTab("designer");
		toast.success(
			ensured.createdModal
				? "Компонент «Общая неопределённость» добавлен в схему"
				: "Компонент уже был в схеме — поля синхронизированы",
		);
	}, [
		activateMainTab,
		config,
		recordDraftHistory,
		setJsonSchema,
		setSelectedPointer,
		setUiSchema,
	]);

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

	return (
		<Flex
			flexDirection="column"
			height="100%"
			minHeight="0"
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
				<Typography variant="caption" color="text.secondary">
					{saveState === "saving"
						? "Сохранение…"
						: saveState === "saved"
							? "Сохранено в логику и схему"
							: null}
				</Typography>
			</Flex>

			{!hasModal ? (
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
			) : (
				<Box sx={{ px: 1.5, pt: 1, flexShrink: 0 }}>
					<Button
						size="small"
						onClick={handleOpenInConstructor}
						sx={{ textTransform: "none" }}
					>
						Открыть компонент на холсте
					</Button>
				</Box>
			)}

			<Box
				sx={{
					flex: 1,
					minHeight: 0,
					display: "flex",
					overflow: "hidden",
				}}
			>
				<Box
					sx={{
						width: { xs: "100%", md: 420 },
						flexShrink: 0,
						borderRight: 1,
						borderColor: "divider",
						p: 1.5,
						overflowY: "auto",
						overflowX: "hidden",
						bgcolor: "background.default",
					}}
				>
					<OverallUncertaintyScalesPanel config={config} onChange={setConfig} />
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
						onConfigChange={setConfig}
						onPreviewChange={setPreview}
					/>
				</Box>
			</Box>
		</Flex>
	);
}
