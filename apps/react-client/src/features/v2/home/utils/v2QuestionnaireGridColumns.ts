import type { ColDef, ColGroupDef } from "ag-grid-community";
import {
	buildV2QuestionnaireRegistryColumnTree,
	estimateRegistryColumnWidth,
	type V2RegistryColumnNode,
	type V2RegistryLeafColumn,
	type V2RegistrySchemaColumnOptions,
} from "@smart-anketa/api-contract";
import {
	V2WorkflowGlobalStatusCell,
	v2WorkflowSectionStatusCell,
} from "../molecules/V2WorkflowStatusCell";
import type { V2QuestionnaireGridRow } from "../types/v2QuestionnaireGrid.types";
import {
	formatGridCellValue,
	getFormValue,
	resolveVersionRow,
} from "./v2QuestionnaireGridValue";

function agFilterForValueType(
	valueType: V2RegistryLeafColumn["valueType"],
): ColDef["filter"] {
	if (valueType === "number") return "agNumberColumnFilter";
	if (valueType === "date") return "agDateColumnFilter";
	if (valueType === "boolean") return "agSetColumnFilter";
	return "agTextColumnFilter";
}

function leafToColDef(leaf: V2RegistryLeafColumn): ColDef<V2QuestionnaireGridRow> {
	const minWidth = estimateRegistryColumnWidth(leaf.header);
	const filter = agFilterForValueType(leaf.valueType);

	if (leaf.kind === "sectionStatus" && leaf.sectionId) {
		const sectionId = leaf.sectionId;
		return {
			colId: leaf.id,
			headerName: leaf.header,
			minWidth,
			resizable: true,
			filter: "agSetColumnFilter",
			cellRenderer: v2WorkflowSectionStatusCell(sectionId),
			valueGetter: (p) =>
				resolveVersionRow(p.data)?.workflowSectionStatuses?.[sectionId] ??
				null,
		};
	}

	if (leaf.kind === "meta") {
		if (leaf.id === "workflowGlobalStatus") {
			return {
				colId: leaf.id,
				headerName: leaf.header,
				minWidth,
				resizable: true,
				filter: "agSetColumnFilter",
				cellRenderer: V2WorkflowGlobalStatusCell,
				valueGetter: (p) =>
					resolveVersionRow(p.data)?.workflowGlobalStatus ?? null,
			};
		}
		if (leaf.id === "createdAt" || leaf.id === "updatedAt") {
			return {
				colId: leaf.id,
				headerName: leaf.header,
				minWidth,
				resizable: true,
				filter: "agDateColumnFilter",
				valueFormatter: (p) =>
					p.value ? new Date(String(p.value)).toLocaleString("ru-RU") : "",
				valueGetter: (p) => resolveVersionRow(p.data)?.[leaf.id as "createdAt"] ?? "",
			};
		}
		if (leaf.id === "finalCoefficient") {
			return {
				colId: leaf.id,
				headerName: leaf.header,
				minWidth,
				resizable: true,
				filter: "agNumberColumnFilter",
				valueGetter: (p) =>
					resolveVersionRow(p.data)?.finalCoefficient ?? null,
			};
		}
		if (leaf.id === "readableId") {
			return {
				colId: leaf.id,
				headerName: leaf.header,
				minWidth,
				resizable: true,
				filter,
				valueGetter: (p) => {
					const row = resolveVersionRow(p.data);
					return row?.readableId ?? row?.id ?? "";
				},
			};
		}
		if (leaf.id === "schemaBindingStatus") {
			return {
				colId: leaf.id,
				headerName: leaf.header,
				minWidth,
				resizable: true,
				filter: "agSetColumnFilter",
				valueGetter: (p) =>
					resolveVersionRow(p.data)?.schemaBinding.status ?? "",
			};
		}
		return {
			colId: leaf.id,
			headerName: leaf.header,
			minWidth,
			resizable: true,
			filter,
			valueGetter: (p) => {
				const row = resolveVersionRow(p.data);
				if (!row) return "";
				return (row as Record<string, unknown>)[leaf.id] ?? "";
			},
		};
	}

	return {
		colId: leaf.id,
		headerName: leaf.header,
		minWidth,
		resizable: true,
		filter,
		valueGetter: (p) =>
			formatGridCellValue(getFormValue(p.data, leaf.formPath ?? "")),
	};
}

function nodeToColDef(
	node: V2RegistryColumnNode,
): ColDef<V2QuestionnaireGridRow> | ColGroupDef<V2QuestionnaireGridRow> {
	if (node.type === "leaf") {
		return leafToColDef(node);
	}
	return {
		headerName: node.header,
		openByDefault: node.openByDefault,
		children: node.children.map(nodeToColDef),
	};
}

export function buildV2QuestionnaireColumnDefs(
	jsonSchema?: Record<string, unknown>,
	uiSchema?: Record<string, unknown>,
	options?: V2RegistrySchemaColumnOptions,
): Array<ColDef<V2QuestionnaireGridRow> | ColGroupDef<V2QuestionnaireGridRow>> {
	return buildV2QuestionnaireRegistryColumnTree(
		jsonSchema,
		uiSchema,
		options,
	).map(nodeToColDef);
}
