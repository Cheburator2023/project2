import { V2_TEMPLATE_READ_TEST_IDS } from "../testIds";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo, useState, type ReactNode, type SyntheticEvent } from "react";
import type {
	ArrayFieldTemplateProps,
	FieldPathId,
	ObjectFieldTemplateProps,
	RJSFSchema,
	UiSchema,
} from "@rjsf/utils";
import { AnketaSectionStatusChip } from "@react-client/features/v2/anketaCRUD/molecules/AnketaSectionStatusChip";
import { AnketaArchObjectPanel } from "@react-client/features/v2/anketaCRUD/molecules/AnketaArchObjectPanel";
import { AnketaModalArrayTable } from "@react-client/features/v2/anketaCRUD/molecules/AnketaModalArrayTable";
import { ListEmptyPlaceholder } from "@react-client/features/v2/anketaCRUD/molecules/ListEmptyPlaceholder";
import {
	objectFieldSlot,
	readAnketaFormContext,
} from "@react-client/features/v2/anketaCRUD/utils/anketaFormContext";
import { isAnketaArchPathReadOnly } from "@react-client/features/v2/anketaCRUD/utils/anketaPathLock.util";
import { shouldHideInactiveActivatableGroupInCompletedAnketa } from "@react-client/features/v2/anketaCRUD/utils/anketaInactiveGroupVisibility.util";
import {
	countSubsectionFilledItems,
	getArrayAtPath,
	getValueAtPath,
	typicalWorkItemDisplayName,
} from "@react-client/features/v2/anketaCRUD/utils/anketaModalArrayTableConfig";
import { listUnfilledRequiredLabelsInBlock } from "@react-client/features/v2/anketaCRUD/utils/anketaModalFormValidation.util";
import {
	readArchObjectListAtPath,
	isAnketaArchObjectListPath,
} from "@react-client/features/v2/anketaCRUD/utils/anketaArchObjectListPaths";
import {
	V2_ANKETA_SECTION_COMPLETE_LABELS,
	isV2AnketaHiddenUiNode,
	isV2AnketaModalObjectArch,
	readPanelSectionStatus,
	resolveAnketaSectionWorkflowBinding,
	resolveV2AnketaArchComponent,
	resolveV2AnketaDefaultExpanded,
	resolveV2AnketaSectionRole,
	resolveV2AnketaSectionTitleVariant,
	readV2AnketaSectionUiOptions,
	resolveV2AnketaSectionDisplayTitle,
	resolveGroupIsActive,
	type V2ArchComponentType,
	isV2AnketaBlockVisibleForViewer,
} from "@smart-anketa/api-contract";
import { isGeneralUncertaintyField } from "../schemaEditor/propertiesFieldKind";
import { ArchComponentDevOutline } from "./ArchComponentDevOutline";
import type { AnketaFormContextValue } from "@react-client/features/v2/anketaCRUD/utils/anketaFormContext";

function shouldUseArchObjectModal(
	ctx: AnketaFormContextValue,
	pathKey: string,
	archComponent: V2ArchComponentType | null,
): boolean {
	return (
		(ctx.anketaModalObjectPaths?.has(pathKey) ?? false) ||
		isV2AnketaModalObjectArch(archComponent)
	);
}

function isModalEditableArrayField(
	archComponent: V2ArchComponentType | null,
	fieldKey: string,
): boolean {
	if (archComponent === "sourceSystem" || archComponent === "atypicalWork") {
		return true;
	}
	return (
		fieldKey === "modelsList" ||
		fieldKey === "trainingSources" ||
		fieldKey === "applicationSources" ||
		fieldKey === "atypicalTasks" ||
		/[Aa]typical/.test(fieldKey)
	);
}

function isRootObjectField(
	fieldPathId: FieldPathId | undefined,
	schema: RJSFSchema,
	rootSchema: RJSFSchema,
): boolean {
	if (fieldPathId?.path) {
		return fieldPathId.path.length === 0;
	}
	return schema === rootSchema;
}

function resolveSectionTitle(
	title: string | undefined,
	schemaNode: RJSFSchema | undefined,
	uiNode: UiSchema | undefined,
	fallbackName: string,
	blockKey?: string,
): string {
	const base =
		(uiNode?.["ui:title"] as string | undefined) ||
		title ||
		(typeof schemaNode?.title === "string" ? schemaNode.title : undefined) ||
		fallbackName;
	return resolveV2AnketaSectionDisplayTitle(base, uiNode, blockKey);
}

function propertySchemaFor(
	schemaNode: RJSFSchema,
	name: string,
): RJSFSchema | undefined {
	const properties = schemaNode.properties;
	if (
		!properties ||
		typeof properties !== "object" ||
		Array.isArray(properties)
	) {
		return undefined;
	}
	return properties[name] as RJSFSchema | undefined;
}

function OpenSubSectionPanel({
	sectionTitle,
	sectionCaption,
	count,
	description,
	children,
	groupActivatable,
	groupActive,
	pathKey,
	readOnly,
	onToggleGroupActivation,
}: {
	sectionTitle: string;
	sectionCaption?: string;
	count?: number;
	description?: string;
	children: ReactNode;
	groupActivatable?: boolean;
	groupActive?: boolean;
	pathKey?: string;
	readOnly?: boolean;
	onToggleGroupActivation?: (pathKey: string, active: boolean) => void;
}) {
	const titleWithCount =
		count != null && count > 0 ? `${sectionTitle} (${count})` : sectionTitle;
	const inactive = groupActivatable && !groupActive;

	const textDimSx = inactive ? { opacity: 0.55 } : undefined;

	return (
		<Box sx={{ minWidth: 0, mb: 3 }}>
			<Box
				sx={{
					display: "flex",
					alignItems: "flex-start",
					gap: 1,
					mb: sectionCaption || description ? 1 : 3,
				}}
			>
				<Typography
					variant="h6"
					fontWeight={700}
					sx={{ flex: 1, minWidth: 0, ...textDimSx }}
				>
					{titleWithCount}
				</Typography>
				{groupActivatable && pathKey ? (
					<Box sx={{ flexShrink: 0, opacity: 1 }}>
						<GroupActivationHeaderButton
							pathKey={pathKey}
							active={groupActive ?? false}
							readOnly={readOnly}
							onToggle={onToggleGroupActivation}
						/>
					</Box>
				) : null}
			</Box>
			{sectionCaption ? (
				<Typography
					variant="caption"
					color="text.secondary"
					display="block"
					sx={{ mb: description ? 1 : 2, ...textDimSx }}
				>
					{sectionCaption}
				</Typography>
			) : null}
			{description ? (
				<Typography
					variant="body2"
					color="text.secondary"
					sx={{ mb: 2, ...textDimSx }}
				>
					{description}
				</Typography>
			) : null}
			{inactive ? null : children}
		</Box>
	);
}

function GroupActivationHeaderButton({
	pathKey,
	active,
	readOnly,
	onToggle,
}: {
	pathKey: string;
	active: boolean;
	readOnly?: boolean;
	onToggle?: (pathKey: string, active: boolean) => void;
}) {
	const handleActivate = (e: SyntheticEvent) => {
		if (readOnly) return;
		e.stopPropagation();
		onToggle?.(pathKey, !active);
	};

	return (
		<Button
			component="div"
			role="button"
			tabIndex={readOnly ? -1 : 0}
			size="small"
			variant={active ? "outlined" : "contained"}
			disabled={readOnly}
			onClick={handleActivate}
			onKeyDown={(e) => {
				if (readOnly) return;
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleActivate(e);
				}
			}}
			sx={{ flexShrink: 0, textTransform: "none", opacity: 1 }}
		>
			{active ? "Деактивировать" : "Активировать"}
		</Button>
	);
}

function SectionPanelHeaderActions({
	groupActivatable,
	groupActive,
	pathKey,
	readOnly,
	onToggleGroupActivation,
	sectionStatusChip,
}: {
	groupActivatable?: boolean;
	groupActive?: boolean;
	pathKey?: string;
	readOnly?: boolean;
	onToggleGroupActivation?: (pathKey: string, active: boolean) => void;
	sectionStatusChip?: ReactNode;
}) {
	if (!groupActivatable && !sectionStatusChip) return null;

	return (
		<Stack
			direction="row"
			spacing={1}
			alignItems="center"
			sx={{ flexShrink: 0, opacity: 1 }}
		>
			{groupActivatable && pathKey ? (
				<GroupActivationHeaderButton
					pathKey={pathKey}
					active={groupActive ?? false}
					readOnly={readOnly}
					onToggle={onToggleGroupActivation}
				/>
			) : null}
			{sectionStatusChip}
		</Stack>
	);
}

function SectionPanelAccordion({
	sectionTitle,
	sectionCaption,
	sectionStatusChip,
	completeButton,
	description,
	children,
	defaultExpanded,
	titleVariant = "h6",
	groupActivatable,
	groupActive,
	pathKey,
	readOnly,
	onToggleGroupActivation,
}: {
	sectionTitle: string;
	sectionCaption?: string;
	sectionStatusChip?: ReactNode;
	completeButton?: ReactNode;
	description?: string;
	children: ReactNode;
	defaultExpanded?: boolean;
	titleVariant?: "h5" | "h6";
	groupActivatable?: boolean;
	groupActive?: boolean;
	pathKey?: string;
	readOnly?: boolean;
	onToggleGroupActivation?: (pathKey: string, active: boolean) => void;
}) {
	const inactive = groupActivatable && !groupActive;
	const canExpand = !inactive;
	const textDimSx = inactive ? { opacity: 0.55 } : undefined;
	const [expanded, setExpanded] = useState(defaultExpanded ?? false);
	const showDetails = canExpand;
	const accordionExpanded = canExpand ? expanded : false;

	return (
		<Accordion
			expanded={accordionExpanded}
			onChange={(_, next) => {
				if (canExpand) setExpanded(next);
			}}
			disableGutters
			sx={{
				height: "auto !important",
				borderRadius: 3,
				boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
				overflow: "hidden",
				"&:before": { display: "none" },
			}}
			data-test-id={V2_TEMPLATE_READ_TEST_IDS.formSection}
		>
			<AccordionSummary
				expandIcon={canExpand ? <ExpandMoreIcon /> : null}
				sx={{
					minHeight: 56,
					cursor: canExpand ? "pointer" : "default",
					"& .MuiAccordionSummary-content": {
						alignItems: "center",
						my: 1.5,
						marginRight: 1,
						overflow: "visible",
					},
				}}
			>
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						gap: 1,
						width: "100%",
						minWidth: 0,
					}}
				>
					<Box sx={{ minWidth: 0, flex: 1, ...textDimSx }}>
						{/* Вес заголовка единый (из темы), titleVariant влияет только на размер. */}
						<Typography variant={titleVariant}>{sectionTitle}</Typography>
						{sectionCaption ? (
							<Typography
								variant="caption"
								color="text.secondary"
								display="block"
								sx={{ mt: 0.25 }}
							>
								{sectionCaption}
							</Typography>
						) : null}
					</Box>
					<SectionPanelHeaderActions
						groupActivatable={groupActivatable}
						groupActive={groupActive}
						pathKey={pathKey}
						readOnly={readOnly}
						onToggleGroupActivation={onToggleGroupActivation}
						sectionStatusChip={sectionStatusChip}
					/>
				</Box>
			</AccordionSummary>
			{showDetails ? (
				<AccordionDetails sx={{ minWidth: 0 }}>
					{canExpand ? (
						<>
							{description ? (
								<Typography
									variant="body2"
									color="text.secondary"
									sx={{ mb: 1.5 }}
								>
									{description}
								</Typography>
							) : null}
							{children}
						</>
					) : null}
					{canExpand && completeButton ? (
						<Box sx={{ mt: canExpand ? 2 : 0, opacity: 1 }}>
							{completeButton}
						</Box>
					) : null}
				</AccordionDetails>
			) : null}
		</Accordion>
	);
}

function FlatSectionHeader({
	sectionTitle,
	sectionCaption,
	sectionDescription,
	hideTitle,
	groupActivatable,
	groupActive,
	pathKey,
	readOnly,
	onToggleGroupActivation,
	formContext,
}: {
	sectionTitle: string;
	sectionCaption?: string;
	sectionDescription?: string;
	hideTitle?: boolean;
	groupActivatable?: boolean;
	groupActive?: boolean;
	pathKey?: string;
	readOnly?: boolean;
	onToggleGroupActivation?: (pathKey: string, active: boolean) => void;
	formContext?: unknown;
}) {
	const inactive = groupActivatable && !groupActive;
	const textDimSx = inactive ? { opacity: 0.55 } : undefined;

	if (hideTitle) {
		if (!groupActivatable || !pathKey) return null;
		return (
			<Box
				sx={{
					display: "flex",
					justifyContent: "flex-end",
					mb: 1,
				}}
			>
				<GroupActivationHeaderButton
					pathKey={pathKey}
					active={groupActive ?? false}
					readOnly={readOnly}
					onToggle={onToggleGroupActivation}
				/>
			</Box>
		);
	}

	return (
		<>
			<Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1 }}>
				<Typography
					variant="h6"
					fontWeight={700}
					sx={{ flex: 1, minWidth: 0, ...textDimSx }}
				>
					{sectionTitle}
				</Typography>
				{groupActivatable && pathKey ? (
					<Box sx={{ flexShrink: 0, opacity: 1 }}>
						<GroupActivationHeaderButton
							pathKey={pathKey}
							active={groupActive ?? false}
							readOnly={readOnly}
							onToggle={onToggleGroupActivation}
						/>
					</Box>
				) : null}
			</Box>
			{sectionCaption ? (
				<Typography
					variant="caption"
					color="text.secondary"
					display="block"
					sx={{ mb: sectionDescription ? 1 : 2, ...textDimSx }}
				>
					{sectionCaption}
				</Typography>
			) : null}
			{sectionDescription ? (
				<Typography
					variant="body2"
					color="text.secondary"
					sx={{ mb: 1.5, ...textDimSx }}
				>
					{sectionDescription}
				</Typography>
			) : null}
			{/* {pathKey ? (
				<AnketaCalculationDevHint pathKey={pathKey} formContext={formContext} />
			) : null} */}
		</>
	);
}

function readLayoutGridColumns(
	parentUiSchema: UiSchema | undefined,
): number | null {
	const options = parentUiSchema?.["ui:options"];
	if (!options || typeof options !== "object" || Array.isArray(options)) {
		return null;
	}
	const opts = options as { layoutGroup?: unknown; gridColumns?: unknown };
	if (opts.layoutGroup !== true) return null;
	const cols = opts.gridColumns;
	if (cols === 1 || cols === 2 || cols === 3) return cols;
	return 2;
}

function gridSizeForProperty(
	name: string,
	propertySchema: RJSFSchema | undefined,
	propertyUiSchema: UiSchema | undefined,
	layoutColumns: number | null,
) {
	const options = propertyUiSchema?.["ui:options"];
	const uiWidget =
		typeof propertyUiSchema?.["ui:widget"] === "string"
			? propertyUiSchema["ui:widget"]
			: undefined;
	const fullWidth =
		(Boolean(options) &&
			typeof options === "object" &&
			!Array.isArray(options) &&
			(options as { fullWidth?: unknown }).fullWidth === true) ||
		uiWidget === "textarea" ||
		name === "calcName" ||
		name === "name" ||
		propertySchema?.type === "object" ||
		propertySchema?.type === "array" ||
		isGeneralUncertaintyField(uiWidget, propertySchema);

	const defaultMd = 6;
	const layoutMd =
		layoutColumns != null ? Math.floor(12 / layoutColumns) : defaultMd;

	return { xs: 12, md: fullWidth ? 12 : layoutMd };
}

function ObjectFieldsGrid({
	properties,
	schema,
	uiSchema,
	parentPathKey,
	formContext,
}: Pick<ObjectFieldTemplateProps, "properties"> & {
	schema: RJSFSchema;
	uiSchema: UiSchema | undefined;
	parentPathKey?: string;
	formContext?: unknown;
}) {
	const layoutColumns = readLayoutGridColumns(uiSchema);
	const visibleProperties = properties.filter(
		(element) => !isV2AnketaHiddenUiNode(uiSchema?.[element.name]),
	);

	return (
		<Grid container spacing={2} sx={{ width: "100%", minWidth: 0 }}>
			{visibleProperties.map((element, index) => {
				const propertySchema = propertySchemaFor(schema, element.name);
				const propertyUiSchema = uiSchema?.[element.name] as
					| UiSchema
					| undefined;

				return (
					<Grid
						size={gridSizeForProperty(
							element.name,
							propertySchema,
							propertyUiSchema,
							layoutColumns,
						)}
						key={element.name ?? index}
						sx={{ minWidth: 0 }}
					>
						{element.content}
						{/* {parentPathKey ? (
							<AnketaCalculationDevHint
								pathKey={`${parentPathKey}.${element.name}`}
								formContext={formContext}
							/>
						) : null} */}
					</Grid>
				);
			})}
		</Grid>
	);
}

export function V2PreviewArrayFieldTemplate({
	canAdd,
	disabled,
	fieldPathId,
	items,
	onAddClick,
	readonly,
	registry,
	required,
	schema,
	title,
	uiSchema,
}: ArrayFieldTemplateProps) {
	const {
		openAnketaModal,
		anketaModalArrayPaths,
		anketaCompactArrayTablePaths,
		formData,
		atypicalUncertaintySyncHighlightPaths,
	} = readAnketaFormContext(registry.formContext);
	const archComponent = resolveV2AnketaArchComponent(uiSchema);
	const pathKey = fieldPathId?.path?.join(".") ?? "";
	if (
		pathKey &&
		!isAnketaSectionVisibleForViewer(
			registry.formContext,
			readAnketaFormContext(registry.formContext).previewUiSchema ??
				(uiSchema as UiSchema),
			pathKey,
		)
	) {
		return null;
	}
	const typicalWorkBadgeSuffix = useMemo(() => {
		if (archComponent !== "typicalWork" || !pathKey) return undefined;
		const items = getArrayAtPath(formData ?? {}, pathKey);
		const names = [
			...new Set(
				items.map((item, index) => typicalWorkItemDisplayName(item, index)),
			),
		];
		if (names.length === 0) return undefined;
		if (names.length === 1) return names[0];
		const preview = names.slice(0, 3).join(", ");
		return names.length > 3 ? `${preview}…` : preview;
	}, [archComponent, formData, pathKey]);
	const highlightUncertaintySync = Boolean(
		archComponent === "atypicalWork" &&
			pathKey &&
			atypicalUncertaintySyncHighlightPaths?.has(pathKey),
	);
	const uncertaintyHighlightSx = highlightUncertaintySync
		? {
				borderRadius: 2,
				p: 1.5,
				border: "2px solid",
				borderColor: "warning.main",
				bgcolor: "rgba(255, 193, 7, 0.08)",
			}
		: undefined;
	const wrapArch = (node: ReactNode): ReactNode => (
		<ArchComponentDevOutline
			archComponent={archComponent}
			previewMode={archComponent === "typicalWork"}
			badgeSuffix={typicalWorkBadgeSuffix}
		>
			<Box sx={uncertaintyHighlightSx}>{node}</Box>
		</ArchComponentDevOutline>
	);
	const lastSegment = fieldPathId?.path?.at(-1);
	const fieldKey: string =
		typeof lastSegment === "string" || typeof lastSegment === "number"
			? String(lastSegment)
			: "";
	const useCompactTable = Boolean(
		pathKey &&
			((anketaCompactArrayTablePaths?.has(pathKey) ?? false) ||
				isModalEditableArrayField(archComponent, fieldKey) ||
				archComponent === "typicalWork"),
	);
	const useModalAdd = Boolean(
		pathKey &&
			openAnketaModal &&
			useCompactTable &&
			((anketaModalArrayPaths?.has(pathKey) ?? false) ||
				isModalEditableArrayField(archComponent, fieldKey)),
	);
	const uiTitle = uiSchema?.["ui:title"];
	const sectionTitle =
		(typeof uiTitle === "string" && uiTitle) ||
		title ||
		(typeof schema.title === "string" ? schema.title : undefined) ||
		"Список";
	const sectionHint =
		typeof uiSchema?.["ui:description"] === "string"
			? uiSchema["ui:description"]
			: undefined;
	const canEdit =
		!disabled &&
		!readonly &&
		!isAnketaArchPathReadOnly(registry.formContext, pathKey);
	const addLabel =
		typeof (uiSchema?.["ui:options"] as { addButtonText?: unknown } | undefined)
			?.addButtonText === "string"
			? (uiSchema?.["ui:options"] as { addButtonText: string }).addButtonText
			: `Добавить ${sectionTitle.toLowerCase()}`;
	const showAddButton = canEdit && (useModalAdd || canAdd);

	if (useCompactTable) {
		return wrapArch(
			<Box id={fieldPathId.$id} sx={{ minWidth: 0 }}>
				<AnketaModalArrayTable
					pathKey={pathKey}
					sectionTitle={sectionTitle}
					sectionHint={sectionHint}
					formContext={registry.formContext}
					forceTypicalWorkLayout={archComponent === "typicalWork"}
				/>
				{/* <AnketaCalculationDevHint
					pathKey={pathKey}
					formContext={registry.formContext}
				/> */}
				{showAddButton ? (
					<Box mt={2} data-test-id={`add_modal_button_compact_table`}>
						<Button
							variant="outlined"
							startIcon={<AddIcon />}
							onClick={() => openAnketaModal?.(pathKey)}
							sx={{ textTransform: "uppercase", fontWeight: 600 }}
						>
							{addLabel}
						</Button>
					</Box>
				) : null}
			</Box>,
		);
	}

	return wrapArch(
		<Box id={fieldPathId.$id} sx={{ minWidth: 0 }}>
			<Typography variant="h6" fontWeight={700} mb={2}>
				{sectionTitle}
				{required ? " *" : ""}
			</Typography>
			<Box
				sx={{
					border: "1px solid #E5E7EB",
					borderRadius: 2,
					overflow: "hidden",
					minWidth: 0,
				}}
			>
				{items.length > 0 ? (
					items.map((element) => (
						<Box
							key={element.key}
							sx={{
								p: 2,
								borderBottom: 1,
								borderColor: "divider",
								"&:last-child": { borderBottom: 0 },
							}}
						>
							{element}
						</Box>
					))
				) : (
					<ListEmptyPlaceholder>Нет строк</ListEmptyPlaceholder>
				)}
			</Box>
			{showAddButton ? (
				<Box mt={3} data-test-id={`add_modal_button`}>
					<Button
						variant="outlined"
						startIcon={<AddIcon />}
						onClick={() =>
							useModalAdd ? openAnketaModal?.(pathKey) : onAddClick?.()
						}
						sx={{ textTransform: "uppercase", fontWeight: 600 }}
					>
						{addLabel}
					</Button>
				</Box>
			) : null}
		</Box>,
	);
}

function isAnketaSectionVisibleForViewer(
	formContext: unknown,
	uiSchema: UiSchema | undefined,
	outputPath: string,
): boolean {
	const ctx = readAnketaFormContext(formContext);
	if (!ctx.viewerAccess?.applyAccessRules || !uiSchema) return true;
	return isV2AnketaBlockVisibleForViewer(
		ctx.viewerAccess,
		uiSchema,
		outputPath,
		{ applyAccessRules: true },
	);
}

/** Группы/секции (object) в accordion-карточках; корень — только вертикальный стек. */
export function V2PreviewObjectFieldTemplate({
	title,
	description,
	properties,
	schema,
	uiSchema,
	fieldPathId,
	registry,
}: ObjectFieldTemplateProps) {
	const schemaNode = schema as RJSFSchema;
	const isRoot = isRootObjectField(
		fieldPathId,
		schemaNode,
		registry.rootSchema,
	);

	if (isRoot) {
		const visibleProperties = properties.filter((element) => {
			if (
				isV2AnketaHiddenUiNode(
					(uiSchema as UiSchema | undefined)?.[element.name],
				)
			) {
				return false;
			}
			if (
				shouldHideInactiveActivatableGroupInCompletedAnketa(
					registry.formContext,
					element.name,
					(uiSchema as UiSchema | undefined)?.[element.name],
				)
			) {
				return false;
			}
			if (
				!isAnketaSectionVisibleForViewer(
					registry.formContext,
					uiSchema as UiSchema | undefined,
					element.name,
				)
			) {
				return false;
			}
			return true;
		});

		return (
			<Stack
				spacing={2}
				sx={{ width: "100%", minWidth: 0 }}
				data-test-id={V2_TEMPLATE_READ_TEST_IDS.formSections}
			>
				{visibleProperties.map((element) => (
					<Box key={element.name} sx={{ minWidth: 0 }}>
						{element.content}
					</Box>
				))}
			</Stack>
		);
	}

	const pathKey = fieldPathId?.path?.join(".") ?? "";
	const pathSegments: any[] = fieldPathId?.path ?? [];
	const sectionSlot = objectFieldSlot(registry.formContext, pathKey);
	const {
		workflow,
		onCompleteMainSection,
		onCompletePanelSection,
		isMainSectionLocked,
		anketaReadOnly,
	} = readAnketaFormContext(registry.formContext);

	const blockKey = fieldPathId?.path?.at(-1);
	const sectionTitle = resolveSectionTitle(
		title,
		schemaNode,
		uiSchema as UiSchema,
		fieldPathId?.$id ?? "Секция",
		typeof blockKey === "string" || typeof blockKey === "number"
			? String(blockKey)
			: undefined,
	);
	const sectionDescription =
		typeof description === "string" ? description : undefined;
	const sectionRole = resolveV2AnketaSectionRole(uiSchema, pathSegments);
	const defaultExpanded = resolveV2AnketaDefaultExpanded(
		uiSchema,
		pathSegments,
		sectionRole,
	);
	const titleVariant = resolveV2AnketaSectionTitleVariant(uiSchema);
	const sectionUiOptions = readV2AnketaSectionUiOptions(uiSchema);
	const workflowBinding = resolveAnketaSectionWorkflowBinding(
		pathKey,
		sectionUiOptions,
	);
	const archComponent = resolveV2AnketaArchComponent(uiSchema);
	const wrapArch = (node: ReactNode): ReactNode => (
		<ArchComponentDevOutline
			archComponent={archComponent}
			previewMode={archComponent === "typicalWork"}
		>
			{node}
		</ArchComponentDevOutline>
	);
	const anketaCtx = readAnketaFormContext(registry.formContext);
	const enforceGroupActivation = !anketaCtx.schemaEditorPreview;
	const groupActivatable =
		enforceGroupActivation && sectionUiOptions.groupActivatable === true;
	const groupActive = enforceGroupActivation
		? resolveGroupIsActive(
				pathKey,
				anketaCtx.previewUiSchema ?? (uiSchema as UiSchema),
				anketaCtx.formData,
			)
		: true;
	const groupActivationProps = {
		groupActivatable,
		groupActive,
		pathKey,
		readOnly: anketaReadOnly,
		onToggleGroupActivation: enforceGroupActivation
			? anketaCtx.onToggleGroupActivation
			: undefined,
	};
	if (
		shouldHideInactiveActivatableGroupInCompletedAnketa(
			registry.formContext,
			pathKey,
			uiSchema,
		)
	) {
		return null;
	}
	if (
		pathKey &&
		!isAnketaSectionVisibleForViewer(
			registry.formContext,
			anketaCtx.previewUiSchema ?? (uiSchema as UiSchema),
			pathKey,
		)
	) {
		return null;
	}
	const useArchObjectModal = shouldUseArchObjectModal(
		anketaCtx,
		pathKey,
		archComponent,
	);
	const visibleProperties = properties.filter(
		(element) =>
			!isV2AnketaHiddenUiNode(
				(uiSchema as UiSchema | undefined)?.[element.name],
			),
	);

	const fieldsBody = (
		<>
			{useArchObjectModal ? (
				<AnketaArchObjectPanel
					pathKey={pathKey}
					sectionTitle={sectionTitle}
					formContext={registry.formContext}
				/>
			) : null}
			{visibleProperties.length > 0 ? (
				<ObjectFieldsGrid
					properties={visibleProperties}
					schema={schemaNode}
					uiSchema={uiSchema as UiSchema | undefined}
					parentPathKey={pathKey || undefined}
					formContext={registry.formContext}
				/>
			) : null}
			{sectionSlot ? <Box sx={{ mt: 2 }}>{sectionSlot}</Box> : null}
		</>
	);

	const showWorkflowChrome =
		sectionRole === "main" ||
		Boolean(sectionUiOptions.workflowSectionId) ||
		sectionUiOptions.groupActivatable === true ||
		workflowBinding.kind === "panel";
	const usesMainSectionWorkflow = workflowBinding.kind === "main";
	const usesPanelPathWorkflow = workflowBinding.kind === "panel";
	const panelWorkflowPathKey =
		workflowBinding.kind === "panel" ? workflowBinding.pathKey : null;
	const workflowSectionIdResolved =
		workflowBinding.kind === "main" ? workflowBinding.sectionId : null;
	const sectionStatus = workflow
		? usesMainSectionWorkflow && workflowSectionIdResolved
			? (workflow.sections[workflowSectionIdResolved] ?? "Создано")
			: usesPanelPathWorkflow && panelWorkflowPathKey
				? readPanelSectionStatus(workflow, panelWorkflowPathKey)
				: "Создано"
		: "Создано";
	const workflowLocked =
		usesMainSectionWorkflow && workflowSectionIdResolved
			? anketaReadOnly ||
				isMainSectionLocked?.(workflowSectionIdResolved) ||
				workflow?.globalStatus === "Заполнено"
			: usesPanelPathWorkflow && panelWorkflowPathKey
				? anketaReadOnly ||
					(workflow
						? readPanelSectionStatus(workflow, panelWorkflowPathKey) ===
							"Заполнено"
						: false) ||
					workflow?.globalStatus === "Заполнено"
				: anketaReadOnly || workflow?.globalStatus === "Заполнено";
	const workflowCompleteButtonLabel =
		usesMainSectionWorkflow && workflowSectionIdResolved
			? V2_ANKETA_SECTION_COMPLETE_LABELS[workflowSectionIdResolved]
			: `Завершить заполнение ${sectionTitle}`;
	const sectionFormData = pathKey
		? getValueAtPath(anketaCtx.formData ?? {}, pathKey)
		: anketaCtx.formData;
	const unfilledRequiredLabels = listUnfilledRequiredLabelsInBlock(
		schemaNode,
		sectionFormData,
		uiSchema as UiSchema | undefined,
		{
			absolutePath: pathKey || undefined,
			rootFormData: anketaCtx.formData,
			rootUiSchema:
				anketaCtx.previewUiSchema ?? (uiSchema as UiSchema | undefined),
		},
	);
	const hasUnfilledRequired = unfilledRequiredLabels.length > 0;
	const canCompleteWorkflow =
		showWorkflowChrome &&
		!workflowLocked &&
		sectionStatus !== "Заполнено" &&
		(usesMainSectionWorkflow
			? Boolean(onCompleteMainSection && workflowSectionIdResolved)
			: usesPanelPathWorkflow
				? Boolean(onCompletePanelSection && panelWorkflowPathKey)
				: false);
	const workflowStatusChip = showWorkflowChrome ? (
		<AnketaSectionStatusChip kind="section" status={sectionStatus} />
	) : null;
	const completeBlockedTitle = hasUnfilledRequired
		? `Заполните обязательные поля: ${unfilledRequiredLabels.slice(0, 8).join(", ")}${
				unfilledRequiredLabels.length > 8
					? ` и ещё ${unfilledRequiredLabels.length - 8}`
					: ""
			}`
		: undefined;
	const workflowCompleteButton =
		groupActivatable && !groupActive ? null : canCompleteWorkflow ? (
			<Button
				variant="contained"
				disabled={hasUnfilledRequired}
				title={completeBlockedTitle}
				aria-disabled={hasUnfilledRequired}
				onClick={() => {
					if (hasUnfilledRequired) return;
					if (usesPanelPathWorkflow && panelWorkflowPathKey) {
						onCompletePanelSection?.(panelWorkflowPathKey);
						return;
					}
					if (workflowSectionIdResolved) {
						onCompleteMainSection?.(workflowSectionIdResolved);
					}
				}}
				sx={{ textTransform: "uppercase", fontWeight: 600 }}
			>
				{workflowCompleteButtonLabel}
			</Button>
		) : null;

	if (showWorkflowChrome) {
		return wrapArch(
			<SectionPanelAccordion
				sectionTitle={sectionTitle}
				sectionCaption={sectionUiOptions.sectionCaption}
				titleVariant={titleVariant}
				description={sectionDescription}
				defaultExpanded={defaultExpanded}
				sectionStatusChip={workflowStatusChip}
				completeButton={workflowCompleteButton}
				{...groupActivationProps}
			>
				{fieldsBody}
			</SectionPanelAccordion>,
		);
	}

	if (sectionRole === "subsection") {
		const formData = anketaCtx.formData ?? {};
		const count = sectionUiOptions.showFilledCount
			? isAnketaArchObjectListPath(pathKey)
				? readArchObjectListAtPath(formData, pathKey).length
				: countSubsectionFilledItems(getValueAtPath(formData, pathKey))
			: undefined;

		return wrapArch(
			<OpenSubSectionPanel
				sectionTitle={sectionTitle}
				sectionCaption={sectionUiOptions.sectionCaption}
				count={count}
				description={sectionDescription}
				{...groupActivationProps}
			>
				{fieldsBody}
			</OpenSubSectionPanel>,
		);
	}

	if (sectionRole === "panel") {
		return wrapArch(
			<SectionPanelAccordion
				sectionTitle={sectionTitle}
				sectionCaption={sectionUiOptions.sectionCaption}
				description={sectionDescription}
				defaultExpanded={defaultExpanded}
				titleVariant={titleVariant}
				{...groupActivationProps}
			>
				{fieldsBody}
			</SectionPanelAccordion>,
		);
	}

	if (sectionRole === "flat") {
		const layoutColumns = readLayoutGridColumns(uiSchema as UiSchema);
		const flatHeader = (
			<FlatSectionHeader
				sectionTitle={sectionTitle}
				sectionCaption={
					sectionUiOptions.hideTitle
						? undefined
						: sectionUiOptions.sectionCaption
				}
				sectionDescription={
					sectionUiOptions.hideTitle ? undefined : sectionDescription
				}
				hideTitle={sectionUiOptions.hideTitle}
				formContext={registry.formContext}
				{...groupActivationProps}
			/>
		);
		const flatBody =
			groupActivatable && !groupActive ? null : (
				<Box sx={{ mt: layoutColumns != null ? 1 : 0 }}>{fieldsBody}</Box>
			);

		if (layoutColumns != null) {
			return wrapArch(
				<Box sx={{ minWidth: 0 }}>
					{flatHeader}
					{flatBody}
				</Box>,
			);
		}
		return wrapArch(
			<Box sx={{ minWidth: 0 }}>
				{flatHeader}
				{flatBody}
			</Box>,
		);
	}

	return wrapArch(
		<SectionPanelAccordion
			sectionTitle={sectionTitle}
			sectionCaption={sectionUiOptions.sectionCaption}
			description={sectionDescription}
			defaultExpanded={defaultExpanded}
			{...groupActivationProps}
		>
			{fieldsBody}
		</SectionPanelAccordion>,
	);
}
