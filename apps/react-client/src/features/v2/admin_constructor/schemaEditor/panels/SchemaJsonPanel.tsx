import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import Editor from "@monaco-editor/react";
import {
	useV2EffectiveFactoryEditorSnapshot,
	useV2TemplateVersionEditorSnapshot,
} from "@react-client/common/api/queries/v2-templates";
import { Flex } from "@react-client/common/primitives/Flex";
import { useCallback, useMemo, useState } from "react";
import { useSchemaEditor } from "../SchemaEditorContext";
import { buildSnapshotChangesReport } from "../schemaEditorEtalonDiff";
import { downloadSchemaEditorSnapshotJson } from "../schemaEditorSnapshotJson";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import { PanelChrome } from "../components/PanelChrome";

type JsonPanelTab = "schema" | "works" | "full" | "diff";

export function SchemaJsonPanel({ embedded = false }: { embedded?: boolean }) {
	const {
		templateId,
		templateVersionId,
		jsonSchema,
		uiSchema,
		logic,
		snapshotMonacoText,
		setSnapshotMonacoText,
		monacoError,
		syncMonacoApply,
		reloadMonacoFromState,
	} = useSchemaEditor();
	const [tab, setTab] = useState<JsonPanelTab>("schema");
	const [copyNote, setCopyNote] = useState<string | null>(null);

	const fillHeight = embedded;
	const needsServerSnapshot = tab === "works" || tab === "full" || tab === "diff";

	const { data: editorSnapshot, isLoading: editorSnapshotLoading } =
		useV2TemplateVersionEditorSnapshot(
			templateId,
			templateVersionId,
			needsServerSnapshot,
		);
	const { data: etalonSnapshot, isLoading: etalonLoading } =
		useV2EffectiveFactoryEditorSnapshot(tab === "diff");

	const worksJson = useMemo(
		() =>
			JSON.stringify(
				{ typicalWorks: editorSnapshot?.typicalWorks ?? [] },
				null,
				"\t",
			),
		[editorSnapshot?.typicalWorks],
	);

	const fullJson = useMemo(() => {
		let schemaPart: {
			jsonSchema: unknown;
			uiSchema: unknown;
			logic: unknown;
		} = {
			jsonSchema,
			uiSchema,
			logic,
		};
		try {
			const parsed = JSON.parse(snapshotMonacoText) as Record<string, unknown>;
			if (
				parsed &&
				typeof parsed === "object" &&
				parsed.jsonSchema &&
				parsed.uiSchema &&
				parsed.logic
			) {
				schemaPart = {
					jsonSchema: parsed.jsonSchema,
					uiSchema: parsed.uiSchema,
					logic: parsed.logic,
				};
			}
		} catch {
			/* keep constructor state */
		}
		return JSON.stringify(
			{
				...schemaPart,
				dictionariesSnapshot: editorSnapshot?.dictionariesSnapshot ?? null,
				typicalWorks: editorSnapshot?.typicalWorks ?? [],
			},
			null,
			"\t",
		);
	}, [
		editorSnapshot?.dictionariesSnapshot,
		editorSnapshot?.typicalWorks,
		jsonSchema,
		logic,
		snapshotMonacoText,
		uiSchema,
	]);

	const etalonLabel = useMemo(() => {
		if (!etalonSnapshot) return "…";
		const setting = etalonSnapshot.setting;
		if (setting.source === "builtin") {
			return setting.builtinSnapshotLabel || "встроенный JSON";
		}
		const version =
			setting.versionNumber != null ? ` v${setting.versionNumber}` : "";
		return `${setting.templateName ?? setting.templateId}${version}`;
	}, [etalonSnapshot]);

	/** Только список реальных изменений (без эталона и без side-by-side). */
	const changesReport = useMemo(() => {
		if (!etalonSnapshot || !editorSnapshot) return "";
		return buildSnapshotChangesReport({
			etalon: {
				jsonSchema: etalonSnapshot.jsonSchema,
				uiSchema: etalonSnapshot.uiSchema,
				logic: etalonSnapshot.logic,
				dictionariesSnapshot: etalonSnapshot.dictionariesSnapshot,
				typicalWorks: etalonSnapshot.typicalWorks,
				workRefIndex: etalonSnapshot.workRefIndex,
			},
			current: {
				jsonSchema: editorSnapshot.jsonSchema,
				uiSchema: editorSnapshot.uiSchema,
				logic: editorSnapshot.logic,
				dictionariesSnapshot: editorSnapshot.dictionariesSnapshot,
				typicalWorks: editorSnapshot.typicalWorks,
				workRefIndex: etalonSnapshot.workRefIndex,
			},
			etalonLabel,
		});
	}, [editorSnapshot, etalonLabel, etalonSnapshot]);

	const hasChanges =
		Boolean(changesReport) && !changesReport.includes("Отличий нет.");

	const activeText = useMemo(() => {
		if (tab === "schema") return snapshotMonacoText;
		if (tab === "works") return worksJson;
		if (tab === "full") return fullJson;
		return changesReport;
	}, [changesReport, fullJson, snapshotMonacoText, tab, worksJson]);

	const readOnly = tab !== "schema";
	const editorLanguage = tab === "diff" ? "markdown" : "json";

	const handleDownload = useCallback(() => {
		const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
		const idPart = templateId?.slice(0, 8) || "draft";
		if (tab === "diff") {
			downloadSchemaEditorSnapshotJson(
				changesReport,
				`anketa-changes-${idPart}-${stamp}.md`,
			);
			return;
		}
		const suffix =
			tab === "schema" ? "schema" : tab === "works" ? "works" : "full";
		downloadSchemaEditorSnapshotJson(
			activeText,
			`anketa-${suffix}-${idPart}-${stamp}.json`,
		);
	}, [activeText, changesReport, tab, templateId]);

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(activeText);
			setCopyNote("Скопировано в буфер обмена");
			window.setTimeout(() => setCopyNote(null), 2500);
		} catch {
			setCopyNote("Не удалось скопировать — скачайте файл");
			window.setTimeout(() => setCopyNote(null), 2500);
		}
	}, [activeText]);

	const loadingNote =
		needsServerSnapshot &&
		(editorSnapshotLoading || (tab === "diff" && etalonLoading))
			? "Загрузка editor-snapshot…"
			: null;

	return (
		<PanelChrome
			embedded={embedded}
			fillHeight={fillHeight}
			dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.jsonEditor}
			title="Редактор JSON (снепшот)"
			description="Схема для правки в конструкторе; работы и полный dump — для выгрузки. Apply только для вкладки «Схема»."
			actions={
				<Flex gap={4} flexShrink={0} wrap="wrap">
					{tab === "schema" ? (
						<>
							<Button size="small" variant="contained" onClick={syncMonacoApply}>
								Применить
							</Button>
							<Button size="small" onClick={reloadMonacoFromState}>
								Сбросить
							</Button>
						</>
					) : null}
					<Button
						size="small"
						variant="outlined"
						startIcon={<FileDownloadOutlinedIcon />}
						onClick={handleDownload}
						title="Скачать текущую вкладку"
						data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.jsonDownload}
					>
						Скачать
					</Button>
					<Button size="small" variant="outlined" onClick={handleCopy}>
						Копировать
					</Button>
				</Flex>
			}
		>
			<Flex
				flexDirection="column"
				gap={8}
				flexGrow={fillHeight ? 1 : undefined}
				minHeight={fillHeight ? "0" : undefined}
				height={fillHeight ? "100%" : undefined}
				style={{ overflow: "hidden" }}
			>
				<Tabs
					value={tab}
					onChange={(_, next: JsonPanelTab) => setTab(next)}
					variant="scrollable"
					scrollButtons="auto"
					sx={{ flexShrink: 0, minHeight: 36 }}
				>
					<Tab value="schema" label="Схема" sx={{ minHeight: 36, py: 0 }} />
					<Tab
						value="works"
						label="Типовые работы"
						sx={{ minHeight: 36, py: 0 }}
					/>
					<Tab value="full" label="Полный dump" sx={{ minHeight: 36, py: 0 }} />
					<Tab value="diff" label="Изменения" sx={{ minHeight: 36, py: 0 }} />
				</Tabs>

				{monacoError && tab === "schema" ? (
					<Alert severity="error" sx={{ flexShrink: 0 }}>
						{monacoError}
					</Alert>
				) : null}
				{copyNote ? (
					<Alert severity="success" sx={{ flexShrink: 0 }}>
						{copyNote}
					</Alert>
				) : null}
				{loadingNote ? (
					<Alert severity="info" sx={{ flexShrink: 0 }}>
						{loadingNote}
					</Alert>
				) : null}

				{tab === "schema" ? (
					<Typography
						variant="caption"
						color="text.secondary"
						display="block"
						sx={{ flexShrink: 0 }}
						title="Подсказка по JSON-редактору"
					>
						Формат:{" "}
						<code>{`{ "jsonSchema": {…}, "uiSchema": {…}, "logic": { "rules": […] } }`}</code>
						. Apply не пишет типовые работы — только trio схемы.
					</Typography>
				) : null}
				{tab === "works" ? (
					<Typography
						variant="caption"
						color="text.secondary"
						display="block"
						sx={{ flexShrink: 0 }}
					>
						Read-only карточки типовых работ активной версии (триггеры, labor,
						формулы по стримам).
					</Typography>
				) : null}
				{tab === "full" ? (
					<Typography
						variant="caption"
						color="text.secondary"
						display="block"
						sx={{ flexShrink: 0 }}
					>
						Единый JSON для выгрузки в код/чат: схема + dictionaries +
						typicalWorks.
					</Typography>
				) : null}
				{tab === "diff" ? (
					<>
						<Typography
							variant="caption"
							color="text.secondary"
							display="block"
							sx={{ flexShrink: 0 }}
						>
							Только отличия от эталона ({etalonLabel}): пути и значения. Сам
							эталон не показывается.
						</Typography>
						{!loadingNote && !hasChanges && changesReport ? (
							<Alert severity="success" sx={{ flexShrink: 0 }}>
								Отличий нет.
							</Alert>
						) : null}
					</>
				) : null}

				<Box
					data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.jsonEditors}
					sx={{
						flex: fillHeight ? 1 : undefined,
						minHeight: fillHeight ? 0 : 360,
						overflow: "hidden",
						"& .monaco-editor": { height: "100% !important" },
					}}
				>
					<Editor
						height="100%"
						defaultLanguage={editorLanguage}
						language={editorLanguage}
						options={{
							minimap: { enabled: false },
							wordWrap: "on",
							scrollBeyondLastLine: false,
							readOnly,
						}}
						value={activeText}
						onChange={
							tab === "schema"
								? (v) => setSnapshotMonacoText(v ?? "")
								: undefined
						}
					/>
				</Box>
			</Flex>
		</PanelChrome>
	);
}
