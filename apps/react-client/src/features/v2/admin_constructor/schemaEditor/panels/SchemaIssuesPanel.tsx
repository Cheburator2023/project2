import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchIcon from "@mui/icons-material/Search";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { parseParamDependencyGraphFromLogic } from "@smart-anketa/api-contract";
import {
	useV2TypicalWorksList,
	useV2WorkParametersCatalog,
} from "@react-client/common/api/queries/v2-works";
import { Card } from "@react-client/common/muiCustom/Card";
import { SegmentBar } from "@react-client/common/muiCustom/SegmentBar";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { toast } from "@react-client/common/toasts";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useParams } from "react-router";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import {
	collectSchemaEditorIssues,
	countSchemaEditorIssuesBySeverity,
	filterSchemaEditorIssues,
	SCHEMA_EDITOR_ISSUE_CATEGORY_LABELS,
	type SchemaEditorIssue,
	type SchemaEditorIssueSeverity,
} from "../collectSchemaEditorIssues";
import {
	issueSupportsLogicNavigation,
	resolveIssueDesignerPointer,
} from "../schemaEditorIssueNavigation";
import { ISSUES_PANEL_ID } from "../constants";
import { PanelChrome } from "../components/PanelChrome";
import { useSchemaEditor } from "../SchemaEditorContext";
import { useSchemaEditorDock } from "../SchemaEditorDockContext";
import { logSchemaEditorNav } from "../schemaEditorNavDebug";
import {
	buildSchemaWorkParameters,
	resolveSchemaParamForTriggerRule,
} from "./typicalWorksPanel/schemaWorkParameters";
import {
	buildParamFieldBindings,
	graphToDraft,
} from "./typicalWorksPanel/parameterDependenciesLogic";
import { readParameterDependencyDraft } from "./typicalWorksPanel/parameterDependenciesStorage";

const ISSUES_SEARCH_DEBOUNCE_MS = 300;

type IssuesViewMode = "list" | "json";

async function copyIssuesJson(issues: SchemaEditorIssue[]) {
	try {
		await navigator.clipboard.writeText(JSON.stringify(issues, null, 2));
		toast.success(
			issues.length === 1
				? "JSON проблемы скопирован"
				: `JSON проблем скопирован (${issues.length})`,
		);
	} catch {
		toast.error("Не удалось скопировать JSON");
	}
}

const SEVERITY_META: Record<
	SchemaEditorIssueSeverity,
	{ label: string; color: "error" | "warning" | "info"; icon: ReactElement }
> = {
	error: {
		label: "Ошибка",
		color: "error",
		icon: <ErrorOutlineIcon fontSize="small" />,
	},
	warning: {
		label: "Предупреждение",
		color: "warning",
		icon: <WarningAmberIcon fontSize="small" />,
	},
	info: {
		label: "Инфо",
		color: "info",
		icon: <InfoOutlinedIcon fontSize="small" />,
	},
};

function IssueRow({
	issue,
	parameterPointer,
	onNavigate,
	onOpenDesigner,
	onOpenLogic,
}: {
	issue: SchemaEditorIssue;
	parameterPointer: string | null;
	onNavigate: (issue: SchemaEditorIssue) => void;
	onOpenDesigner: (pointer: string) => void;
	onOpenLogic: (issue: SchemaEditorIssue) => void;
}) {
	const meta = SEVERITY_META[issue.severity];
	const navigable = issue.target.kind !== "none";
	const designerPointer = resolveIssueDesignerPointer(issue);
	const showDesignerButton = Boolean(designerPointer);
	const showLogicButton = issueSupportsLogicNavigation(issue.target);
	const showParameterButton = showLogicButton;

	return (
		<Card
			padding="10px 12px"
			variant="outlined"
			sx={{
				cursor: navigable ? "pointer" : "default",
				"&:hover": navigable
					? { borderColor: "primary.main", bgcolor: "action.hover" }
					: undefined,
			}}
			onClick={navigable ? () => onNavigate(issue) : undefined}
		>
			<Flex alignItems="flex-start" gap={8}>
				<Chip
					size="small"
					color={meta.color}
					icon={meta.icon}
					label={meta.label}
					sx={{ flexShrink: 0 }}
				/>
				<Flex flexDirection="column" gap={4} minWidth="0" flexGrow={1}>
					<Typography
						variant="body2"
						fontWeight={600}
						noWrap
						title={issue.title}
					>
						{issue.title}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						{SCHEMA_EDITOR_ISSUE_CATEGORY_LABELS[issue.category]}
					</Typography>
					<Typography variant="body2" color="text.secondary">
						{issue.message}
					</Typography>
					{showDesignerButton || showLogicButton || showParameterButton ? (
						<Flex gap={8} wrap="wrap" sx={{ mt: 0.5 }}>
							{showDesignerButton ? (
								<Button
									size="small"
									variant="outlined"
									disabled={!designerPointer}
									title={
										designerPointer
											? "Открыть поле на холсте конструктора"
											: "Для этой проблемы нет привязки к полю схемы"
									}
									data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.issueGoDesigner}
									onClick={(event) => {
										event.stopPropagation();
										if (!designerPointer) return;
										onOpenDesigner(designerPointer);
									}}
								>
									К конструктору
								</Button>
							) : null}
							{showParameterButton ? (
								<Button
									size="small"
									variant="outlined"
									disabled={!parameterPointer}
									title={
										parameterPointer
											? "Открыть связанный параметр в конструкторе"
											: "Подходящий параметр схемы не найден"
									}
									data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.issueGoParameter}
									onClick={(event) => {
										event.stopPropagation();
										if (!parameterPointer) return;
										onOpenDesigner(parameterPointer);
									}}
								>
									К параметру
								</Button>
							) : null}
							{showLogicButton ? (
								<Button
									size="small"
									variant="outlined"
									title="Открыть связанный раздел логики"
									data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.issueGoLogic}
									onClick={(event) => {
										event.stopPropagation();
										onOpenLogic(issue);
									}}
								>
									К логике
								</Button>
							) : null}
						</Flex>
					) : null}
				</Flex>
			</Flex>
		</Card>
	);
}

function IssuesPanelToolbar({
	searchQuery,
	onSearchQueryChange,
	viewMode,
	onViewModeChange,
	filteredCount,
	totalCount,
	filteredCounts,
	onCopyJson,
	copyDisabled,
}: {
	searchQuery: string;
	onSearchQueryChange: (value: string) => void;
	viewMode: IssuesViewMode;
	onViewModeChange: (value: IssuesViewMode) => void;
	filteredCount: number;
	totalCount: number;
	filteredCounts: Record<SchemaEditorIssueSeverity, number>;
	onCopyJson: () => void;
	copyDisabled: boolean;
}) {
	const searchActive = searchQuery.trim().length > 0;

	return (
		<Flex flexDirection="column" gap={8} padding="12px 12px 0">
			<Flex alignItems="center" gap={8} wrap="wrap">
				<TextField
					size="small"
					fullWidth
					value={searchQuery}
					onChange={(event) => onSearchQueryChange(event.target.value)}
					placeholder="Поиск по заголовку, тексту, категории…"
					data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.issuesSearch}
					slotProps={{
						input: {
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon fontSize="small" />
								</InputAdornment>
							),
						},
					}}
					sx={{ flex: "1 1 220px", minWidth: 220 }}
				/>
				<SegmentBar<IssuesViewMode>
					value={viewMode}
					onChange={onViewModeChange}
					segments={[
						{
							id: "list",
							label: "Список",
							"data-test-id": V2_TEMPLATE_EDIT_TEST_IDS.issuesViewList,
						},
						{
							id: "json",
							label: "JSON",
							"data-test-id": V2_TEMPLATE_EDIT_TEST_IDS.issuesViewJson,
						},
					]}
				/>
				<IconButton
					size="small"
					onClick={onCopyJson}
					disabled={copyDisabled}
					title="Копировать JSON проблем"
					aria-label="Копировать JSON проблем"
					data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.issuesCopyJson}
				>
					<ContentCopyIcon fontSize="small" />
				</IconButton>
			</Flex>
			{totalCount > 0 ? (
				<Flex gap={8} wrap="wrap" alignItems="center">
					{searchActive ? (
						<Typography variant="caption" color="text.secondary">
							Найдено {filteredCount} из {totalCount}
						</Typography>
					) : null}
					{filteredCounts.error > 0 ? (
						<Chip
							size="small"
							color="error"
							label={`Ошибки: ${filteredCounts.error}`}
						/>
					) : null}
					{filteredCounts.warning > 0 ? (
						<Chip
							size="small"
							color="warning"
							label={`Предупреждения: ${filteredCounts.warning}`}
						/>
					) : null}
					{filteredCounts.info > 0 ? (
						<Chip
							size="small"
							color="info"
							label={`Инфо: ${filteredCounts.info}`}
						/>
					) : null}
				</Flex>
			) : null}
		</Flex>
	);
}

function IssuesJsonView({ issues }: { issues: SchemaEditorIssue[] }) {
	const jsonText = useMemo(() => JSON.stringify(issues, null, 2), [issues]);

	return (
		<Card
			padding="0"
			variant="outlined"
			sx={{ overflow: "hidden" }}
			data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.issuesJson}
		>
			<Flex
				alignItems="center"
				justifyContent="space-between"
				padding="8px 12px"
				sx={{ borderBottom: "1px solid", borderColor: "divider" }}
			>
				<Typography variant="caption" color="text.secondary">
					{issues.length}{" "}
					{issues.length === 1 ? "проблема" : "проблем"}
				</Typography>
				<Button
					size="small"
					startIcon={<ContentCopyIcon />}
					onClick={() => void copyIssuesJson(issues)}
					disabled={issues.length === 0}
					title="Копировать JSON проблем"
					data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.issuesCopyJson}
				>
					Копировать JSON
				</Button>
			</Flex>
			<Box
				component="pre"
				sx={{
					m: 0,
					p: 1.5,
					overflow: "auto",
					fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
					fontSize: 12,
					lineHeight: 1.5,
					whiteSpace: "pre-wrap",
					wordBreak: "break-word",
					color: "text.primary",
					bgcolor: "background.default",
				}}
			>
				{jsonText}
			</Box>
		</Card>
	);
}

export function SchemaIssuesPanel({
	embedded = false,
}: {
	embedded?: boolean;
}) {
	const { templateId = "" } = useParams<{ templateId: string }>();
	const { updatePanelTitle } = useSchemaEditorDock();
	const {
		logic,
		fieldPathHints,
		cycles,
		logicValidationIssues,
		schemaConsistencyIssues,
		schemaConsistencyLoading,
		refreshSchemaConsistencyIssues,
		templateVersionId,
		dictionaryCodeByPointer,
		enumMapByCode,
		dictionaryEnumsLoading,
		monacoError,
		calculationError,
		typicalWorkSaveDisplay,
		navigateToSchemaEditorIssue,
		openDesignerAtPointer,
		openLogicForIssueTarget,
		jsonSchema,
		uiSchema,
	} = useSchemaEditor();

	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<IssuesViewMode>("list");
	const debouncedSearchQuery = useDebouncedValue(
		searchQuery,
		ISSUES_SEARCH_DEBOUNCE_MS,
	);

	const { data: worksData, isLoading: worksLoading } = useV2TypicalWorksList({
		templateId,
	});
	const { data: catalog, isLoading: catalogLoading } =
		useV2WorkParametersCatalog();

	const issuesLoading =
		dictionaryEnumsLoading ||
		worksLoading ||
		catalogLoading ||
		schemaConsistencyLoading;

	const assignedWorks = useMemo(
		() =>
			(worksData?.items ?? []).filter(
				(item) => item.templateId == null || item.templateId === templateId,
			),
		[templateId, worksData?.items],
	);

	const workNameById = useMemo(() => {
		const map = new Map<string, string>();
		for (const work of assignedWorks) {
			map.set(work.id, work.name);
		}
		return map;
	}, [assignedWorks]);

	// Вкладка «Проблемы» сама подтягивает актуальные ошибки типовых работ (dryRun),
	// а не ждёт единственный apply при открытии редактора.
	useEffect(() => {
		if (!templateVersionId || dictionaryEnumsLoading) return;
		refreshSchemaConsistencyIssues();
	}, [
		dictionaryEnumsLoading,
		refreshSchemaConsistencyIssues,
		templateVersionId,
		worksData?.total,
	]);

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

	const resolveParameterPointer = (issue: SchemaEditorIssue): string | null => {
		const { target } = issue;
		if (target.kind === "designer") return target.pointer;
		if (target.kind === "logic_dependencies" && target.pointer) {
			return target.pointer;
		}
		if (target.kind === "logic_rule") {
			const rule = logic.rules.find((item) => item.id === target.ruleId);
			const pointer = rule?.targetPath?.trim();
			if (pointer && fieldPathHints.some((hint) => hint.pointer === pointer)) {
				return pointer;
			}
			return null;
		}
		if (
			(target.kind === "typical_work" ||
				target.kind === "logic_dependencies") &&
			target.paramCode
		) {
			return (
				resolveSchemaParamForTriggerRule(
					{ paramCode: target.paramCode },
					schemaParams,
				)?.schemaPointer ?? null
			);
		}
		return null;
	};

	const methodologyParams = useMemo(
		() =>
			(catalog?.items ?? []).filter((p) => p.values.length > 0 || p.numeric),
		[catalog?.items],
	);

	const paramFieldBindings = useMemo(
		() =>
			buildParamFieldBindings(methodologyParams, fieldPathHints, schemaParams),
		[fieldPathHints, methodologyParams, schemaParams],
	);

	const paramDependencyDraft = useMemo(() => {
		const fromLogic = graphToDraft(
			parseParamDependencyGraphFromLogic(logic.rules),
		);
		if (
			fromLogic.targets.some(
				(target: { rules: unknown[] }) => target.rules.length > 0,
			)
		) {
			return fromLogic;
		}
		if (templateId) {
			return readParameterDependencyDraft(templateId);
		}
		return { targets: [] };
	}, [logic.rules, templateId]);

	const issues = useMemo(
		() =>
			collectSchemaEditorIssues({
				rules: logic.rules,
				fieldPathHints,
				cycles,
				logicValidationIssues,
				assignedWorks,
				schemaConsistencyIssues,
				workNameById,
				paramDependencyDraft,
				paramFieldBindings,
				dictionaryCodeByPointer,
				enumMapByCode,
				dictionaryEnumsLoading,
				monacoError,
				calculationError,
				typicalWorkSaveDisplay,
			}),
		[
			assignedWorks,
			calculationError,
			cycles,
			dictionaryCodeByPointer,
			dictionaryEnumsLoading,
			enumMapByCode,
			fieldPathHints,
			logic.rules,
			logicValidationIssues,
			monacoError,
			paramDependencyDraft,
			paramFieldBindings,
			schemaConsistencyIssues,
			typicalWorkSaveDisplay,
			workNameById,
		],
	);

	const filteredIssues = useMemo(
		() => filterSchemaEditorIssues(issues, debouncedSearchQuery),
		[debouncedSearchQuery, issues],
	);

	const counts = useMemo(
		() => countSchemaEditorIssuesBySeverity(issues),
		[issues],
	);

	const filteredCounts = useMemo(
		() => countSchemaEditorIssuesBySeverity(filteredIssues),
		[filteredIssues],
	);

	useEffect(() => {
		const total = issues.length;
		const title =
			total > 0
				? `Проблемы (${total}${counts.error > 0 ? ` · ${counts.error} ош.` : ""})`
				: "Проблемы";
		updatePanelTitle(ISSUES_PANEL_ID, title);
	}, [counts.error, issues.length, updatePanelTitle]);

	const toolbar = (
		<IssuesPanelToolbar
			searchQuery={searchQuery}
			onSearchQueryChange={setSearchQuery}
			viewMode={viewMode}
			onViewModeChange={setViewMode}
			filteredCount={filteredIssues.length}
			totalCount={issues.length}
			filteredCounts={filteredCounts}
			onCopyJson={() => void copyIssuesJson(issues)}
			copyDisabled={issues.length === 0}
		/>
	);

	const body = issuesLoading ? (
		<Flex
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			flexGrow={1}
			gap={8}
			padding="24px"
		>
			<CircularProgress size={28} />
			<Typography variant="caption" color="text.secondary">
				Проверка схемы и типовых работ…
			</Typography>
		</Flex>
	) : issues.length === 0 ? (
		<Flex
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			flexGrow={1}
			gap={8}
			padding="24px"
		>
			<Typography variant="body1" color="text.secondary">
				Проблем не найдено
			</Typography>
			<Typography variant="caption" color="text.secondary" textAlign="center">
				Ошибки правил, триггеров работ, зависимостей параметров и справочников
				появятся здесь с переходом к месту исправления.
			</Typography>
		</Flex>
	) : viewMode === "json" ? (
		<Flex flexDirection="column" gap={8}>
			{debouncedSearchQuery.trim() ? (
				<Typography variant="caption" color="text.secondary">
					JSON содержит все {issues.length} проблем; поиск применяется только к
					списку.
				</Typography>
			) : null}
			<IssuesJsonView issues={issues} />
		</Flex>
	) : filteredIssues.length === 0 ? (
		<Flex
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			flexGrow={1}
			gap={8}
			padding="24px"
		>
			<Typography variant="body1" color="text.secondary">
				Ничего не найдено
			</Typography>
			<Typography variant="caption" color="text.secondary" textAlign="center">
				Измените запрос поиска или очистите поле фильтра.
			</Typography>
		</Flex>
	) : (
		<Flex flexDirection="column" gap={8}>
			<Spacer space={4} />
			{filteredIssues.map((issue) => (
				<IssueRow
					key={issue.id}
					issue={issue}
					parameterPointer={resolveParameterPointer(issue)}
					onNavigate={navigateToSchemaEditorIssue}
					onOpenDesigner={openDesignerAtPointer}
					onOpenLogic={(item) => {
						logSchemaEditorNav("issues.clickGoLogic", {
							issueId: item.id,
							targetKind: item.target.kind,
							workId:
								item.target.kind === "typical_work"
									? item.target.workId
									: null,
						});
						openLogicForIssueTarget(item.target, { focusParam: false });
					}}
				/>
			))}
		</Flex>
	);

	const panelContent = (
		<Flex flexDirection="column" height="100%" minHeight="0">
			{toolbar}
			<Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 1.5 }}>{body}</Box>
		</Flex>
	);

	if (embedded) {
		return (
			<Flex
				flexDirection="column"
				height="100%"
				minHeight="0"
				data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.panelIssues}
			>
				{panelContent}
			</Flex>
		);
	}

	return (
		<Flex
			flexDirection="column"
			height="100%"
			minHeight="0"
			data-test-id={V2_TEMPLATE_EDIT_TEST_IDS.panelIssues}
		>
			<PanelChrome
				title="Проблемы"
				description="Ошибки и предупреждения конструктора"
			>
				{panelContent}
			</PanelChrome>
		</Flex>
	);
}
