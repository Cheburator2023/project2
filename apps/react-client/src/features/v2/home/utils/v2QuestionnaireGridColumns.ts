import type { ColDef, ColGroupDef } from "ag-grid-community";
import {
	buildV2QuestionnaireRegistryColumnTree,
	estimateRegistryColumnWidth,
	formatV2SchemaBindingStatus,
	resolveImplementationStreamLabel,
	type V2RegistryColumnNode,
	type V2RegistryLeafColumn,
	type V2RegistrySchemaColumnOptions,
} from "@smart-anketa/api-contract";
import {
	AG_GRID_SET_FILTER_PARAMS,
	formatAgGridSetFilterDateValue,
} from "@react-client/common/tableStuff/agGridSetFilterParams";
import {
	V2WorkflowGlobalStatusCell,
	v2WorkflowPanelStatusCell,
	v2WorkflowSectionStatusCell,
} from "../molecules/V2WorkflowStatusCell";
import { V2SchemaBindingStatusCell } from "../molecules/V2SchemaBindingStatusCell";
import { V2EditLockStatusCell } from "../molecules/V2EditLockStatusCell";
import { V2QuestionnaireNameCell } from "../molecules/V2QuestionnaireNameCell";
import type { V2QuestionnaireGridRow } from "../types/v2QuestionnaireGrid.types";
import {
	formatGridCellValue,
	getFormValue,
	resolveVersionRow,
} from "./v2QuestionnaireGridValue";
import { useQuestionnaireEditLocksStore } from "@react-client/features/v2/anketaCRUD/stores/questionnaireEditLocksStore";

const SET_COLUMN_FILTER = "agSetColumnFilter" as const;

function dateSetFilterExtras(): Pick<
	ColDef<V2QuestionnaireGridRow>,
	"cellDataType" | "filterValueGetter" | "valueFormatter"
> {
	return {
		cellDataType: "dateString",
		filterValueGetter: (params) =>
			formatAgGridSetFilterDateValue(
				params.getValue(params.column.getColId()),
			),
		valueFormatter: (params) =>
			params.value ? formatAgGridSetFilterDateValue(params.value) : "",
	};
}

function leafToColDef(leaf: V2RegistryLeafColumn): ColDef<V2QuestionnaireGridRow> {
	const minWidth = estimateRegistryColumnWidth(leaf.header);
	const baseFilter = {
		filter: SET_COLUMN_FILTER,
		filterParams: AG_GRID_SET_FILTER_PARAMS,
	};

	if (leaf.kind === "sectionStatus" && leaf.sectionId) {
		const sectionId = leaf.sectionId;
		return {
			colId: leaf.id,
			headerName: leaf.header,
			minWidth,
			resizable: true,
			...baseFilter,
			cellRenderer: v2WorkflowSectionStatusCell(sectionId),
			valueGetter: (p) =>
				resolveVersionRow(p.data)?.workflowSectionStatuses?.[sectionId] ??
				null,
		};
	}

	if (leaf.kind === "panelStatus" && leaf.panelPathKey) {
		const panelPathKey = leaf.panelPathKey;
		return {
			colId: leaf.id,
			headerName: leaf.header,
			minWidth,
			resizable: true,
			...baseFilter,
			cellRenderer: v2WorkflowPanelStatusCell(panelPathKey),
			valueGetter: (p) => {
				const row = resolveVersionRow(p.data);
				if (!row) return null;
				const workflow = row.formData?.workflow as
					| { panelSections?: Record<string, string> }
					| undefined;
				return workflow?.panelSections?.[panelPathKey] ?? null;
			},
		};
	}

	if (leaf.kind === "meta") {
		if (leaf.id === "workflowGlobalStatus") {
			return {
				colId: leaf.id,
				headerName: leaf.header,
				minWidth,
				resizable: true,
				...baseFilter,
				cellRenderer: V2WorkflowGlobalStatusCell,
				valueGetter: (p) =>
					resolveVersionRow(p.data)?.workflowGlobalStatus ?? null,
			};
		}
		if (leaf.id === "editLock") {
			return {
				colId: leaf.id,
				headerName: leaf.header,
				minWidth: Math.max(minWidth, 140),
				resizable: true,
				...baseFilter,
				cellRenderer: V2EditLockStatusCell,
				valueGetter: (p) => {
					const id = resolveVersionRow(p.data)?.id;
					if (!id) return null;
					return useQuestionnaireEditLocksStore.getState().locksById[id]
						? "Редактируется"
						: null;
				},
			};
		}
		if (leaf.id === "createdAt" || leaf.id === "updatedAt") {
			return {
				colId: leaf.id,
				headerName: leaf.header,
				minWidth,
				resizable: true,
				...baseFilter,
				...dateSetFilterExtras(),
				valueGetter: (p) => resolveVersionRow(p.data)?.[leaf.id as "createdAt"] ?? "",
			};
		}
		if (leaf.id === "finalCoefficient") {
			return {
				colId: leaf.id,
				headerName: leaf.header,
				minWidth,
				resizable: true,
				...baseFilter,
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
				...baseFilter,
				valueGetter: (p) => {
					const row = resolveVersionRow(p.data);
					return row?.readableId ?? row?.id ?? "";
				},
			};
		}
		if (leaf.id === "calcName") {
			return {
				colId: leaf.id,
				headerName: leaf.header,
				minWidth,
				resizable: true,
				...baseFilter,
				cellRenderer: V2QuestionnaireNameCell,
				valueGetter: (p) => resolveVersionRow(p.data)?.calcName ?? "",
			};
		}
		if (leaf.id === "schemaBindingStatus") {
			return {
				colId: leaf.id,
				headerName: leaf.header,
				minWidth,
				resizable: true,
				...baseFilter,
				cellRenderer: V2SchemaBindingStatusCell,
				valueGetter: (p) =>
					formatV2SchemaBindingStatus(
						resolveVersionRow(p.data)?.schemaBinding.status,
					),
			};
		}
		return {
			colId: leaf.id,
			headerName: leaf.header,
			minWidth,
			resizable: true,
			...baseFilter,
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
		...baseFilter,
		...(leaf.valueType === "date" ? dateSetFilterExtras() : {}),
		valueGetter: (p) => {
			const raw = getFormValue(p.data, leaf.formPath ?? "");
			if (
				leaf.formPath === "generalInfo.implementationStream" &&
				typeof raw === "string"
			) {
				return resolveImplementationStreamLabel(raw);
			}
			return formatGridCellValue(raw);
		},
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

export function buildV2QuestionnaireColumnDefsFromTree(
	columnTree: readonly V2RegistryColumnNode[],
): Array<ColDef<V2QuestionnaireGridRow> | ColGroupDef<V2QuestionnaireGridRow>> {
	return columnTree.map(nodeToColDef);
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
