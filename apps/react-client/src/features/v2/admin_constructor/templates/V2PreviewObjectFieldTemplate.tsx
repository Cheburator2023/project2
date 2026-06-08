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
import type { ReactNode } from "react";
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
import {
	countSubsectionFilledItems,
	getValueAtPath,
} from "@react-client/features/v2/anketaCRUD/utils/anketaModalArrayTableConfig";
import {
	V2_ANKETA_SECTION_COMPLETE_LABELS,
	isV2AnketaHiddenUiNode,
	isV2AnketaModalObjectArch,
	resolveV2AnketaArchComponent,
	resolveV2AnketaDefaultExpanded,
	resolveV2AnketaSectionRole,
	resolveV2AnketaSectionTitleVariant,
	resolveV2AnketaWorkflowSectionId,
	readV2AnketaSectionUiOptions,
	type V2ArchComponentType,
} from "@smart-anketa/api-contract";
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
): string {
	return (
		(uiNode?.["ui:title"] as string | undefined) ||
		title ||
		(typeof schemaNode?.title === "string" ? schemaNode.title : undefined) ||
		fallbackName
	);
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
	count,
	description,
	children,
}: {
	sectionTitle: string;
	count?: number;
	description?: string;
	children: ReactNode;
}) {
	const titleWithCount =
		count != null && count > 0 ? `${sectionTitle} (${count})` : sectionTitle;

	return (
		<Box sx={{ minWidth: 0, mb: 3 }}>
			<Typography variant="h6" fontWeight={700} mb={description ? 1 : 3}>
				{titleWithCount}
			</Typography>
			{description ? (
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					{description}
				</Typography>
			) : null}
			{children}
		</Box>
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
}: {
	sectionTitle: string;
	sectionCaption?: string;
	sectionStatusChip?: ReactNode;
	completeButton?: ReactNode;
	description?: string;
	children: ReactNode;
	defaultExpanded?: boolean;
	titleVariant?: "h5" | "h6";
}) {
	return (
		<Accordion
			defaultExpanded={defaultExpanded ?? false}
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
				expandIcon={<ExpandMoreIcon />}
				sx={{
					minHeight: 56,
					"& .MuiAccordionSummary-content": {
						alignItems: "center",
						my: 1.5,
						gap: 1,
					},
				}}
			>
				<Box sx={{ minWidth: 0, flex: 1 }}>
					<Typography
						variant={titleVariant}
						fontWeight={titleVariant === "h5" ? 700 : undefined}
					>
						{sectionTitle}
					</Typography>
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
				{sectionStatusChip ? (
					<Box sx={{ ml: "auto", mr: 1 }}>{sectionStatusChip}</Box>
				) : null}
			</AccordionSummary>
			<AccordionDetails sx={{ minWidth: 0 }}>
				{description ? (
					<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
						{description}
					</Typography>
				) : null}
				{children}
				{completeButton ? <Box sx={{ mt: 2 }}>{completeButton}</Box> : null}
			</AccordionDetails>
		</Accordion>
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
	const fullWidth =
		(Boolean(options) &&
			typeof options === "object" &&
			!Array.isArray(options) &&
			(options as { fullWidth?: unknown }).fullWidth === true) ||
		name === "calcName" ||
		name === "name" ||
		propertySchema?.type === "object" ||
		propertySchema?.type === "array";

	const defaultMd = 6;
	const layoutMd =
		layoutColumns != null ? Math.floor(12 / layoutColumns) : defaultMd;

	return { xs: 12, md: fullWidth ? 12 : layoutMd };
}

function ObjectFieldsGrid({
	properties,
	schema,
	uiSchema,
}: Pick<ObjectFieldTemplateProps, "properties"> & {
	schema: RJSFSchema;
	uiSchema: UiSchema | undefined;
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
		anketaReadOnly,
	} = readAnketaFormContext(registry.formContext);
	const archComponent = resolveV2AnketaArchComponent(uiSchema);
	const wrapArch = (node: ReactNode): ReactNode => (
		<ArchComponentDevOutline archComponent={archComponent}>
			{node}
		</ArchComponentDevOutline>
	);
	const pathKey = fieldPathId?.path?.join(".") ?? "";
	const lastSegment = fieldPathId?.path?.at(-1);
	const fieldKey: string =
		typeof lastSegment === "string" || typeof lastSegment === "number"
			? String(lastSegment)
			: "";
	const useCompactTable = Boolean(
		pathKey &&
			((anketaCompactArrayTablePaths?.has(pathKey) ?? false) ||
				isModalEditableArrayField(archComponent, fieldKey)),
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
	const canEdit = !disabled && !readonly && !anketaReadOnly;
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
				/>
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
		const visibleProperties = properties.filter(
			(element) =>
				!isV2AnketaHiddenUiNode(
					(uiSchema as UiSchema | undefined)?.[element.name],
				),
		);

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
		isMainSectionLocked,
		anketaReadOnly,
	} = readAnketaFormContext(registry.formContext);

	const sectionTitle = resolveSectionTitle(
		title,
		schemaNode,
		uiSchema as UiSchema,
		fieldPathId?.$id ?? "Секция",
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
	const workflowSectionId = resolveV2AnketaWorkflowSectionId(
		uiSchema,
		pathSegments,
	);
	const archComponent = resolveV2AnketaArchComponent(uiSchema);
	const wrapArch = (node: ReactNode): ReactNode => (
		<ArchComponentDevOutline archComponent={archComponent}>
			{node}
		</ArchComponentDevOutline>
	);
	const anketaCtx = readAnketaFormContext(registry.formContext);
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
				/>
			) : null}
			{sectionSlot ? <Box sx={{ mt: 2 }}>{sectionSlot}</Box> : null}
		</>
	);

	if (sectionRole === "main" && workflowSectionId) {
		const sectionId = workflowSectionId;
		const sectionStatus = workflow?.sections[sectionId];
		const locked =
			anketaReadOnly ||
			isMainSectionLocked?.(sectionId) ||
			workflow?.globalStatus === "Заполнено";
		const canComplete =
			!locked &&
			sectionStatus !== "Заполнено" &&
			Boolean(onCompleteMainSection);

		return wrapArch(
			<SectionPanelAccordion
				sectionTitle={sectionTitle}
				sectionCaption={sectionUiOptions.sectionCaption}
				titleVariant={titleVariant}
				description={sectionDescription}
				defaultExpanded={defaultExpanded}
				sectionStatusChip={
					sectionStatus ? (
						<AnketaSectionStatusChip kind="section" status={sectionStatus} />
					) : null
				}
				completeButton={
					canComplete ? (
						<Button
							variant="contained"
							onClick={() => onCompleteMainSection?.(sectionId)}
							sx={{ textTransform: "uppercase", fontWeight: 600 }}
						>
							{V2_ANKETA_SECTION_COMPLETE_LABELS[sectionId]}
						</Button>
					) : null
				}
			>
				{fieldsBody}
			</SectionPanelAccordion>,
		);
	}

	if (sectionRole === "subsection") {
		const formData = anketaCtx.formData ?? {};
		const count = sectionUiOptions.showFilledCount
			? countSubsectionFilledItems(getValueAtPath(formData, pathKey))
			: undefined;

		return wrapArch(
			<OpenSubSectionPanel
				sectionTitle={sectionTitle}
				count={count}
				description={sectionDescription}
			>
				{fieldsBody}
			</OpenSubSectionPanel>,
		);
	}

	if (sectionRole === "panel") {
		return wrapArch(
			<SectionPanelAccordion
				sectionTitle={sectionTitle}
				description={sectionDescription}
				defaultExpanded={defaultExpanded}
				titleVariant={titleVariant}
			>
				{fieldsBody}
			</SectionPanelAccordion>,
		);
	}

	if (sectionRole === "flat") {
		const layoutColumns = readLayoutGridColumns(uiSchema as UiSchema);
		if (layoutColumns != null) {
			return wrapArch(<Box sx={{ minWidth: 0 }}>{fieldsBody}</Box>);
		}
		return wrapArch(
			<Box sx={{ minWidth: 0 }}>
				<Typography variant="h6" fontWeight={700} mb={3}>
					{sectionTitle}
				</Typography>
				{sectionDescription ? (
					<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
						{sectionDescription}
					</Typography>
				) : null}
				{fieldsBody}
			</Box>,
		);
	}

	return wrapArch(
		<SectionPanelAccordion
			sectionTitle={sectionTitle}
			description={sectionDescription}
			defaultExpanded={defaultExpanded}
		>
			{fieldsBody}
		</SectionPanelAccordion>,
	);
}
