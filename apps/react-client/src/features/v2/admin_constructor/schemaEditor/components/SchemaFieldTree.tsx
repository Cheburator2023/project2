import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { RichTreeView } from "@mui/x-tree-view/RichTreeView";
import { useMemo } from "react";
import { Link as RouterLink } from "react-router";
import { pathForAdminV2Dictionary } from "@react-client/routing/common/pathHelpers";
import { resolveSchemaNode } from "../../utils/schemaMutators";
import { pointerSegments } from "../../utils/schemaPaths";
import { ruSchemaTypeLabel } from "../constants";
import { useSchemaEditor } from "../SchemaEditorContext";
import type { SchemaFieldRow } from "../types";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";
import { PanelChrome } from "./PanelChrome";

type TreeNode = {
	id: string;
	label: string;
	typeLabel: string;
	children?: TreeNode[];
};

function buildTreeNodes(rows: SchemaFieldRow[]): TreeNode[] {
	const roots: TreeNode[] = [];
	const stack: { depth: number; node: TreeNode }[] = [];

	for (const row of rows) {
		const node: TreeNode = {
			id: row.pointer,
			label: row.key,
			typeLabel: row.typeLabel,
		};

		while (stack.length > 0 && stack[stack.length - 1]!.depth >= row.depth) {
			stack.pop();
		}

		if (stack.length === 0) {
			roots.push(node);
		} else {
			const parent = stack[stack.length - 1]!.node;
			parent.children = parent.children ?? [];
			parent.children.push(node);
		}

		stack.push({ depth: row.depth, node });
	}

	return roots;
}

export function SchemaFieldTreePanel({ embedded = false }: { embedded?: boolean }) {
	const {
		treeRows,
		jsonSchema,
		selectedPointer,
		setSelectedPointer,
		dictionaryCodeByPointer,
		dictionaryIdByCode,
	} = useSchemaEditor();

	const items = useMemo(() => buildTreeNodes(treeRows), [treeRows]);

	const getItemLabel = (item: TreeNode) => {
		const segs = pointerSegments(item.id);
		const node = resolveSchemaNode(jsonSchema, segs);
		const title = typeof node?.title === "string" ? node.title : item.label;
		return `${title} · ${ruSchemaTypeLabel(item.typeLabel)}`;
	};

	return (
		<PanelChrome
			embedded={embedded}
			dataTestId={V2_TEMPLATE_EDIT_TEST_IDS.fieldTree}
			title="Дерево схемы"
			description="Иерархия полей черновика. Выберите узел для редактирования свойств."
		>
			{items.length === 0 ? (
				<Typography variant="body2" color="text.secondary">
					Добавьте поля из палитры слева.
				</Typography>
			) : (
				<RichTreeView
					items={items}
					getItemId={(item) => item.id}
					getItemLabel={getItemLabel}
					selectedItems={selectedPointer}
					onSelectedItemsChange={(_e, id) => {
						if (typeof id === "string") setSelectedPointer(id);
					}}
				/>
			)}
			{selectedPointer && dictionaryCodeByPointer.get(selectedPointer) ? (
				<Box sx={{ mt: 1 }}>
					{(() => {
						const code = dictionaryCodeByPointer.get(selectedPointer)!;
						const dictId = dictionaryIdByCode.get(code);
						return dictId ? (
							<Link
								component={RouterLink}
								to={pathForAdminV2Dictionary(dictId)}
								variant="caption"
							>
								<Chip size="small" label={code} variant="outlined" color="info" />
							</Link>
						) : (
							<Chip size="small" label={code} variant="outlined" color="warning" />
						);
					})()}
				</Box>
			) : null}
		</PanelChrome>
	);
}
