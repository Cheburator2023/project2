import type { NodeModel } from "@minoru/react-dnd-treeview";
import {
	SCHEMA_CANVAS_ROOT_ID,
	type SchemaCanvasNodeData,
} from "./schemaCanvasTree";

export type CanvasFieldSearchCrumb = {
	title: string;
	id: string;
};

export type CanvasFieldSearchOption = {
	pointer: string;
	title: string;
	fieldKey: string;
	breadcrumbs: CanvasFieldSearchCrumb[];
	/** Строка для fuzzysort: все title и id из цепочки. */
	searchLabel: string;
};

export function buildCanvasFieldSearchOptions(
	treeData: NodeModel<SchemaCanvasNodeData>[],
): CanvasFieldSearchOption[] {
	const byId = new Map(treeData.map((node) => [String(node.id), node]));

	return treeData
		.filter(
			(node) =>
				node.data?.kind === "field" &&
				Boolean(node.data.fieldPointer),
		)
		.map((node) => {
			const pointer = node.data!.fieldPointer;
			const fieldKey = node.data!.fieldKey;
			const title = node.text.trim() || fieldKey;
			const breadcrumbs = listCanvasAncestorNodeIds(treeData, pointer).map(
				(nodeId) => {
					const crumbNode = byId.get(nodeId)!;
					return {
						title: crumbNode.text.trim() || crumbNode.data!.fieldKey,
						id: crumbNode.data!.fieldKey,
					};
				},
			);
			const searchLabel = breadcrumbs
				.flatMap((crumb) => [crumb.title, crumb.id])
				.join(" ");

			return {
				pointer,
				title,
				fieldKey,
				breadcrumbs,
				searchLabel,
			};
		});
}

/** Id узлов дерева от корня до цели (для open()). */
export function listCanvasAncestorNodeIds(
	treeData: NodeModel<SchemaCanvasNodeData>[],
	targetPointer: string,
): string[] {
	const byId = new Map(treeData.map((node) => [String(node.id), node]));
	const ids: string[] = [];
	let current = byId.get(targetPointer);

	while (current) {
		ids.unshift(String(current.id));
		const parentId = String(current.parent);
		if (parentId === SCHEMA_CANVAS_ROOT_ID) break;
		current = byId.get(parentId);
	}

	return ids;
}

function normalizeSearchText(value: string): string {
	return value.trim().toLocaleLowerCase("ru");
}

/** Меньше — выше в списке. `null` — не подходит под запрос. */
export function rankCanvasFieldSearchOption(
	option: CanvasFieldSearchOption,
	query: string,
): number | null {
	const normalizedQuery = normalizeSearchText(query);
	if (!normalizedQuery) return null;

	const fieldCrumb = option.breadcrumbs.at(-1);
	if (!fieldCrumb) return null;

	const fieldId = normalizeSearchText(fieldCrumb.id);
	const fieldTitle = normalizeSearchText(fieldCrumb.title);

	if (fieldId === normalizedQuery) return 0;
	if (fieldTitle === normalizedQuery) return 1;
	if (fieldId.startsWith(normalizedQuery)) return 2;
	if (fieldTitle.startsWith(normalizedQuery)) return 3;
	if (fieldId.includes(normalizedQuery)) return 4;
	if (fieldTitle.includes(normalizedQuery)) return 5;

	for (const crumb of option.breadcrumbs.slice(0, -1)) {
		const id = normalizeSearchText(crumb.id);
		const title = normalizeSearchText(crumb.title);
		if (id === normalizedQuery || title === normalizedQuery) return 6;
		if (id.startsWith(normalizedQuery) || title.startsWith(normalizedQuery)) {
			return 7;
		}
		if (id.includes(normalizedQuery) || title.includes(normalizedQuery)) {
			return 8;
		}
	}

	if (normalizeSearchText(option.searchLabel).includes(normalizedQuery)) {
		return 9;
	}

	return null;
}

export function filterCanvasFieldSearchOptions(
	options: CanvasFieldSearchOption[],
	query: string,
	limit = 12,
): CanvasFieldSearchOption[] {
	const normalizedQuery = normalizeSearchText(query);
	if (!normalizedQuery) return [];

	return options
		.map((option) => ({
			option,
			rank: rankCanvasFieldSearchOption(option, normalizedQuery),
		}))
		.filter(
			(
				entry,
			): entry is { option: CanvasFieldSearchOption; rank: number } =>
				entry.rank !== null,
		)
		.sort((a, b) => {
			if (a.rank !== b.rank) return a.rank - b.rank;
			return a.option.searchLabel.localeCompare(b.option.searchLabel, "ru");
		})
		.slice(0, limit)
		.map((entry) => entry.option);
}

/** Индексы подстроки для подсветки (без fuzzy). */
export function substringMatchIndexes(
	text: string,
	query: string,
): ReadonlyArray<number> {
	const trimmedQuery = query.trim();
	if (!trimmedQuery) return [];

	const lowerText = text.toLocaleLowerCase("ru");
	const lowerQuery = trimmedQuery.toLocaleLowerCase("ru");
	const start = lowerText.indexOf(lowerQuery);
	if (start === -1) return [];

	return Array.from({ length: trimmedQuery.length }, (_, index) => start + index);
}
