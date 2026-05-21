import { Card } from "@react-client/common/muiCustom/Card";
import { V2_TEMPLATE_READ_TEST_IDS } from "../testIds";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type {
	FieldPathId,
	ObjectFieldTemplateProps,
	RJSFSchema,
	UiSchema,
} from "@rjsf/utils";

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

function ObjectFieldsGrid({
	properties,
}: Pick<ObjectFieldTemplateProps, "properties">) {
	return (
		<Grid container spacing={2}>
			{properties.map((element, index) => (
				<Grid size={12} key={element.name ?? index}>
					{element.content}
				</Grid>
			))}
		</Grid>
	);
}

/** Группы/секции (object) в Card; корень — только вертикальный стек без обёртки. */
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
	const isRoot = isRootObjectField(fieldPathId, schemaNode, registry.rootSchema);

	if (isRoot) {
		return (
			<Stack
				spacing={2}
				sx={{ width: "100%" }}
				data-test-id={V2_TEMPLATE_READ_TEST_IDS.formSections}
			>
				{properties.map((element) => (
					<Box key={element.name}>{element.content}</Box>
				))}
			</Stack>
		);
	}

	const sectionTitle = resolveSectionTitle(
		title,
		schemaNode,
		uiSchema as UiSchema,
		fieldPathId?.$id ?? "Секция",
	);

	return (
		<Card
			header={sectionTitle}
			padding="12px 16px"
			sx={{ width: "100%" }}
			data-test-id={V2_TEMPLATE_READ_TEST_IDS.formSection}
		>
			{description ? (
				<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
					{description}
				</Typography>
			) : null}
			<ObjectFieldsGrid properties={properties} />
		</Card>
	);
}
