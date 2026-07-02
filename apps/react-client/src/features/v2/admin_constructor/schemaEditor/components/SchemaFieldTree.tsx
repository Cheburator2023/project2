import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { TreeItem2 } from "@mui/x-tree-view/TreeItem2";
import type { TreeItem2Props } from "@mui/x-tree-view/TreeItem2";
import { RichTreeView } from "@mui/x-tree-view/RichTreeView";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { pathForAdminV2Dictionary } from "@react-client/routing/common/pathHelpers";
import { resolveV2AnketaCanvasUiKind } from "@smart-anketa/api-contract";
import {
	createContext,
	forwardRef,
	useContext,
	useMemo,
} from "react";
import { Link as RouterLink } from "react-router";
import {
	readUiSchemaBranchAtPointer,
	resolveSchemaNode,
} from "../../utils/schemaMutators";
import { pointerSegments } from "../../utils/schemaPaths";
import {
	resolveCanvasCategoryChips,
	resolveCanvasFieldTypeChipLabel,
} from "../propertiesFieldKind";
import { useSchemaEditor } from "../SchemaEditorContext";
import {
	SCHEMA_FIELD_CHANGE_KIND_LABELS,
	type SchemaFieldChangeInfo,
} from "../schemaFieldTreeChanges";
import {
	buildSchemaFieldTreeModel,
	collectSchemaFieldTreeNodeIds,
	type SchemaFieldTreeNode,
} from "../schemaFieldTreeModel";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import { PanelChrome } from "./PanelChrome";

const SchemaFieldTreeChangeContext = createContext<
	Map<string, SchemaFieldChangeInfo>
>(new Map());

function collectExpandedPointerIds(
	pointers: string[],
	selectedPointer: string | null,
): string[] {
	const expanded = new Set(pointers);
	if (selectedPointer) {
		const parts = selectedPointer.split("/").filter(Boolean);
		let acc = "";
		for (const part of parts.slice(0, -1)) {
			acc += `/${part}`;
			expanded.add(acc);
		}
	}
	return [...expanded];
}

function buildFieldTreeLabel(
	item: SchemaFieldTreeNode,
	jsonSchema: ReturnType<typeof useSchemaEditor>["jsonSchema"],
	uiSchema: ReturnType<typeof useSchemaEditor>["uiSchema"],
): string {
	const segs = pointerSegments(item.id);
	const node = resolveSchemaNode(jsonSchema, segs);
	const title = typeof node?.title === "string" ? node.title : item.label;
	const uiBranch = readUiSchemaBranchAtPointer(uiSchema, item.id);
	const canvasKind = resolveV2AnketaCanvasUiKind(uiBranch);
	const rootKey = segs.length === 1 ? segs[0] : undefined;
	const categorySuffix = resolveCanvasCategoryChips(node, uiBranch, rootKey)
		.map((chip) => chip.label)
		.join(" · ");
	const kindSuffix =
		canvasKind === "hidden"
			? " · Скрыто"
			: canvasKind === "system"
				? " · Системное"
				: canvasKind === "utility"
					? " · Служебное"
					: "";
	const { label: typeLabel } = resolveCanvasFieldTypeChipLabel(node, uiBranch);
	const categoryPart = categorySuffix ? ` · ${categorySuffix}` : "";
	return `${title} · ${typeLabel}${categoryPart}${kindSuffix}`;
}

function SchemaFieldChangeSummary({
	change,
	compact = false,
}: {
	change: SchemaFieldChangeInfo;
	compact?: boolean;
}) {
	return (
		<Flex flexDirection="column" gap={compact ? 4 : 6} minWidth="0">
			<Flex gap={4} wrap="wrap">
				{change.kinds.map((kind) => (
					<Chip
						key={kind}
						size="small"
						color="warning"
						variant="outlined"
						label={SCHEMA_FIELD_CHANGE_KIND_LABELS[kind]}
					/>
				))}
			</Flex>
			<Flex flexDirection="column" gap={compact ? 2 : 4}>
				{change.details.map((detail) => (
					<Typography
						key={detail}
						variant="caption"
						color="warning.dark"
						sx={{ lineHeight: 1.4, display: "block" }}
					>
						{detail}
					</Typography>
				))}
			</Flex>
		</Flex>
	);
}

const SchemaFieldTreeItem = forwardRef(function SchemaFieldTreeItem(
	props: TreeItem2Props,
	ref: React.Ref<HTMLLIElement>,
) {
	const fieldChanges = useContext(SchemaFieldTreeChangeContext);
	const change = fieldChanges.get(props.itemId);

	return (
		<TreeItem2
			{...props}
			ref={ref}
			label={
				<Flex flexDirection="column" gap={4} minWidth="0" width="100%">
					<Typography variant="body2" sx={{ minWidth: 0 }}>
						{props.label}
					</Typography>
					{change ? <SchemaFieldChangeSummary change={change} compact /> : null}
				</Flex>
			}
		/>
	);
});

export function SchemaFieldTreePanel({ embedded = false }: { embedded?: boolean }) {
	const {
		jsonSchema,
		uiSchema,
		fieldChangeByPointer,
		selectedPointer,
		setSelectedPointer,
		dictionaryCodeByPointer,
		dictionaryIdByCode,
	} = useSchemaEditor();

	const items = useMemo(
		() => buildSchemaFieldTreeModel(jsonSchema, uiSchema),
		[jsonSchema, uiSchema],
	);

	const changedCount = fieldChangeByPointer.size;
	const selectedChange = selectedPointer
		? fieldChangeByPointer.get(selectedPointer)
		: undefined;
	const defaultExpandedItems = useMemo(
		() =>
			collectExpandedPointerIds(
				collectSchemaFieldTreeNodeIds(items),
				selectedPointer,
			),
		[items, selectedPointer],
	);

	const getItemLabel = (item: SchemaFieldTreeNode) =>
		buildFieldTreeLabel(item, jsonSchema, uiSchema);

	return (
		<PanelChrome
			embedded={embedded}
			dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.fieldTree}
			title="Дерево схемы"
			description="Иерархия полей черновика. Изменения относительно последней сохранённой версии показаны под каждым полем."
		>
			{changedCount > 0 ? (
				<Box sx={{ mb: 1 }}>
					<Chip
						size="small"
						color="warning"
						variant="outlined"
						label={`Изменено полей: ${changedCount}`}
					/>
				</Box>
			) : null}
			{items.length === 0 ? (
				<Typography variant="body2" color="text.secondary">
					Добавьте поля из палитры слева.
				</Typography>
			) : (
				<SchemaFieldTreeChangeContext.Provider value={fieldChangeByPointer}>
					<Box
						sx={{
							"& ul": { listStyle: "none", m: 0, p: 0 },
							"& li": { listStyle: "none", "&::marker": { display: "none" } },
							"& .MuiTreeItem-content": { alignItems: "flex-start" },
							"& .MuiTreeItem-label": { py: 0.5, width: "100%" },
						}}
					>
						<RichTreeView
							items={items}
							getItemId={(item) => item.id}
							getItemLabel={getItemLabel}
							defaultExpandedItems={defaultExpandedItems}
							selectedItems={selectedPointer}
							onSelectedItemsChange={(_event, id) => {
								if (typeof id === "string") setSelectedPointer(id);
							}}
							slots={{ item: SchemaFieldTreeItem }}
						/>
					</Box>
				</SchemaFieldTreeChangeContext.Provider>
			)}
			{selectedPointer ? (
				<Box sx={{ mt: 1 }}>
					{selectedChange ? (
						<>
							<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
								Изменения выбранного поля
							</Typography>
							<SchemaFieldChangeSummary change={selectedChange} />
							<Spacer space={8} />
						</>
					) : null}
					{dictionaryCodeByPointer.get(selectedPointer) ? (
						(() => {
							const code = dictionaryCodeByPointer.get(selectedPointer)!;
							const dictId = dictionaryIdByCode.get(code);
							return dictId ? (
								<Link
									component={RouterLink}
									to={pathForAdminV2Dictionary(dictId)}
									variant="caption"
								>
									<Chip
										size="small"
										label={code}
										variant="outlined"
										color="info"
									/>
								</Link>
							) : (
								<Chip
									size="small"
									label={code}
									variant="outlined"
									color="warning"
								/>
							);
						})()
					) : null}
				</Box>
			) : null}
		</PanelChrome>
	);
}
