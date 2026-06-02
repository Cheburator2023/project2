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
import { AnketaModalArrayTable } from "@react-client/features/v2/anketaCRUD/molecules/AnketaModalArrayTable";
import {
	objectFieldSlot,
	readAnketaFormContext,
} from "@react-client/features/v2/anketaCRUD/utils/anketaFormContext";
import {
	countSubsectionFilledItems,
	getValueAtPath,
} from "@react-client/features/v2/anketaCRUD/utils/anketaModalArrayTableConfig";
import {
	V2_ANKETA_MAIN_SECTION_IDS,
	V2_ANKETA_SECTION_COMPLETE_LABELS,
	type V2AnketaMainSectionId,
} from "@smart-anketa/api-contract";

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

function isHiddenUiNode(uiNode: unknown): boolean {
	if (!uiNode || typeof uiNode !== "object" || Array.isArray(uiNode))
		return false;
	const node = uiNode as UiSchema;
	const options = node["ui:options"];
	return (
		node["ui:widget"] === "hidden" ||
		(Boolean(options) &&
			typeof options === "object" &&
			!Array.isArray(options) &&
			(options as { hidden?: unknown }).hidden === true)
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

const MAIN_SECTION_SET = new Set<string>(V2_ANKETA_MAIN_SECTION_IDS);

function isMainSectionId(name: string): name is V2AnketaMainSectionId {
	return MAIN_SECTION_SET.has(name);
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
	sectionStatusChip,
	completeButton,
	description,
	children,
	defaultExpanded,
	titleVariant = "h6",
}: {
	sectionTitle: string;
	sectionStatusChip?: ReactNode;
	completeButton?: ReactNode;
	description?: string;
	children: ReactNode;
	defaultExpanded?: boolean;
	titleVariant?: "h5" | "h6";
}) {
	return (
		<Accordion
			defaultExpanded={defaultExpanded ?? true}
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
				<Typography
					variant={titleVariant}
					fontWeight={titleVariant === "h5" ? 700 : undefined}
					sx={{ minWidth: 0, flex: 1 }}
				>
					{sectionTitle}
				</Typography>
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

function gridSizeForProperty(
	name: string,
	propertySchema: RJSFSchema | undefined,
	propertyUiSchema: UiSchema | undefined,
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

	return { xs: 12, md: fullWidth ? 12 : 6 };
}

function ObjectFieldsGrid({
	properties,
	schema,
	uiSchema,
}: Pick<ObjectFieldTemplateProps, "properties"> & {
	schema: RJSFSchema;
	uiSchema: UiSchema | undefined;
}) {
	const visibleProperties = properties.filter(
		(element) => !isHiddenUiNode(uiSchema?.[element.name]),
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
	const { openAnketaModal, anketaModalArrayPaths, anketaReadOnly } =
		readAnketaFormContext(registry.formContext);
	const pathKey = fieldPathId?.path?.join(".") ?? "";
	const useModalAdd = Boolean(
		pathKey && anketaModalArrayPaths?.has(pathKey) && openAnketaModal,
	);
	const uiTitle = uiSchema?.["ui:title"];
	const sectionTitle =
		(typeof uiTitle === "string" && uiTitle) ||
		title ||
		(typeof schema.title === "string" ? schema.title : undefined) ||
		"Список";
	const canEdit = !disabled && !readonly && !anketaReadOnly;
	const addLabel =
		typeof (uiSchema?.["ui:options"] as { addButtonText?: unknown } | undefined)
			?.addButtonText === "string"
			? ((uiSchema?.["ui:options"] as { addButtonText: string }).addButtonText)
			: `Добавить ${sectionTitle.toLowerCase()}`;
	const showAddButton = canEdit && (useModalAdd || canAdd);

	if (useModalAdd) {
		return (
			<Box id={fieldPathId.$id} sx={{ minWidth: 0 }}>
				<AnketaModalArrayTable
					pathKey={pathKey}
					sectionTitle={sectionTitle}
					formContext={registry.formContext}
				/>
				{showAddButton ? (
					<Box mt={2}>
						<Button
							variant="contained"
							startIcon={<AddIcon />}
							onClick={() => openAnketaModal?.(pathKey)}
							sx={{ textTransform: "uppercase", fontWeight: 600 }}
						>
							{addLabel}
						</Button>
					</Box>
				) : null}
			</Box>
		);
	}

	return (
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
					<Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
						Нет строк
					</Typography>
				)}
			</Box>
			{showAddButton ? (
				<Box mt={3}>
					<Button
						variant="contained"
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
		</Box>
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
				!isHiddenUiNode((uiSchema as UiSchema | undefined)?.[element.name]),
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
	const objectDepth = fieldPathId?.path?.length ?? 1;
	const parentPath = fieldPathId?.path?.[0] ?? "";
	const sectionName = String(fieldPathId?.path?.[0] ?? "");
	const sectionDescription =
		typeof description === "string" ? description : undefined;
	const isStreamSubsection =
		objectDepth === 2 &&
		(parentPath === "streamModelControl" ||
			parentPath === "streamMlPlatform" ||
			parentPath === "streamDataSources");

	const fieldsBody = (
		<>
			<ObjectFieldsGrid
				properties={properties}
				schema={schemaNode}
				uiSchema={uiSchema as UiSchema | undefined}
			/>
			{sectionSlot ? <Box sx={{ mt: 2 }}>{sectionSlot}</Box> : null}
		</>
	);

	if (objectDepth === 1 && isMainSectionId(sectionName)) {
		const sectionId = sectionName;
		const sectionStatus = workflow?.sections[sectionId];
		const locked =
			anketaReadOnly ||
			isMainSectionLocked?.(sectionId) ||
			workflow?.globalStatus === "Заполнено";
		const canComplete =
			!locked &&
			sectionStatus !== "Заполнено" &&
			Boolean(onCompleteMainSection);

		return (
			<SectionPanelAccordion
				sectionTitle={sectionTitle}
				titleVariant={
					sectionTitle === "Детальная информация" ? "h5" : "h6"
				}
				description={sectionDescription}
				defaultExpanded={sectionId === V2_ANKETA_MAIN_SECTION_IDS[0]}
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
			</SectionPanelAccordion>
		);
	}

	if (isStreamSubsection) {
		const formData = readAnketaFormContext(registry.formContext).formData ?? {};
		const count = countSubsectionFilledItems(getValueAtPath(formData, pathKey));

		return (
			<OpenSubSectionPanel
				sectionTitle={sectionTitle}
				count={count}
				description={sectionDescription}
			>
				{fieldsBody}
			</OpenSubSectionPanel>
		);
	}

	if (objectDepth > 1) {
		return (
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
			</Box>
		);
	}

	return (
		<SectionPanelAccordion
			sectionTitle={sectionTitle}
			description={sectionDescription}
		>
			{fieldsBody}
		</SectionPanelAccordion>
	);
}
