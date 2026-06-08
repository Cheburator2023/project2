import type { DragEndEvent, DragOverEvent } from "@dnd-kit/dom";
import { DragDropProvider } from "@dnd-kit/react";
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import type { RJSFSchema } from "@rjsf/utils";
import { PALETTE_PRESETS } from "../constants";
import { useSchemaEditor } from "../SchemaEditorContext";
import {
	buildOrdersForFieldMove,
	getObjectItemsSchema,
	isObjectFieldGroup,
	listOrderedChildKeys,
	resolveSchemaNode,
} from "../../utils/schemaMutators";
import { pointerSegments } from "../../utils/schemaPaths";

export const PALETTE_DRAG_TYPE = "palette-preset";
export const FIELD_DRAG_TYPE = "schema-field";
export const CANVAS_ZONE_TYPE = "canvas-zone";

export type PaletteDragData = { type: typeof PALETTE_DRAG_TYPE; presetId: string };
export type FieldDragData = {
	type: typeof FIELD_DRAG_TYPE;
	key: string;
	parentPointer: string;
	index: number;
};

export type DndInsertIndicator = {
	groupId: string;
	index: number;
};

export const ROOT_GROUP_ID = "schema-root";

export function parentPointerFromGroupId(groupId: string): string {
	if (groupId === ROOT_GROUP_ID) return "/";
	return groupId.slice("schema-group:".length);
}

export function groupIdFromParentPointer(parentPointer: string): string {
	if (parentPointer === "/" || parentPointer === "") return ROOT_GROUP_ID;
	return `schema-group:${parentPointer}`;
}

export function fieldSortableId(fieldPointer: string): string {
	return `field:${encodeURIComponent(fieldPointer)}`;
}

export function parseFieldSortableId(id: string): string | null {
	if (!id.startsWith("field:")) return null;
	try {
		return decodeURIComponent(id.slice("field:".length));
	} catch {
		return null;
	}
}

export function dropAppendId(groupId: string): string {
	return `drop-append:${groupId}`;
}

export function parseDropAppendId(id: string): string | null {
	if (!id.startsWith("drop-append:")) return null;
	return id.slice("drop-append:".length);
}

export function collectGroupOrders(
	schema: RJSFSchema,
	uiSchema?: import("@rjsf/utils").UiSchema,
	parentPointer = "/",
): Record<string, string[]> {
	const groupId = groupIdFromParentPointer(parentPointer);
	const keys = listOrderedChildKeys(schema, parentPointer, uiSchema);
	const result: Record<string, string[]> = { [groupId]: keys };

	for (const key of keys) {
		const childPointer =
			parentPointer === "/" ? `/${key}` : `${parentPointer.replace(/\/$/, "")}/${key}`;
		const node = resolveSchemaNode(schema, pointerSegments(childPointer));
		if (isObjectFieldGroup(node)) {
			Object.assign(result, collectGroupOrders(schema, uiSchema, childPointer));
		}
		const itemsObj = getObjectItemsSchema(node);
		if (itemsObj && Object.keys(itemsObj.properties ?? {}).length > 0) {
			Object.assign(
				result,
				collectGroupOrders(schema, uiSchema, `${childPointer}/items`),
			);
		}
	}

	return result;
}

function resolvePaletteDrop(
	targetId: string | number | undefined,
	orders: Record<string, string[]>,
): { parentPointer: string; index: number; groupId: string } {
	const appendGroupId = targetId ? parseDropAppendId(String(targetId)) : null;
	if (appendGroupId) {
		const keys = orders[appendGroupId] ?? [];
		return {
			parentPointer: parentPointerFromGroupId(appendGroupId),
			groupId: appendGroupId,
			index: keys.length,
		};
	}

	const fieldPointer = targetId ? parseFieldSortableId(String(targetId)) : null;
	if (fieldPointer) {
		const parts = fieldPointer.split("/").filter(Boolean);
		const key = parts[parts.length - 1]!;
		const parentPointer =
			parts.length <= 1 ? "/" : `/${parts.slice(0, -1).join("/")}`;
		const groupId = groupIdFromParentPointer(parentPointer);
		const keys = orders[groupId] ?? [];
		const index = keys.indexOf(key);
		return {
			parentPointer,
			groupId,
			index: index >= 0 ? index : keys.length,
		};
	}

	return {
		parentPointer: "/",
		groupId: ROOT_GROUP_ID,
		index: orders[ROOT_GROUP_ID]?.length ?? 0,
	};
}

function resolveFieldDropTarget(
	targetId: string | number | undefined,
	orders: Record<string, string[]>,
	sortable: SortableDragSource | null,
	fieldData: FieldDragData,
): { sourceGroupId: string; targetGroupId: string; targetIndex: number } | null {
	const sourceGroupId = String(
		sortable?.initialGroup ?? groupIdFromParentPointer(fieldData.parentPointer),
	);

	const appendGroupId = targetId ? parseDropAppendId(String(targetId)) : null;
	if (appendGroupId) {
		const keys = orders[appendGroupId] ?? [];
		return {
			sourceGroupId,
			targetGroupId: appendGroupId,
			targetIndex: keys.length,
		};
	}

	const fieldPointer = targetId ? parseFieldSortableId(String(targetId)) : null;
	if (fieldPointer) {
		const parts = fieldPointer.split("/").filter(Boolean);
		const key = parts[parts.length - 1]!;
		const parentPointer =
			parts.length <= 1 ? "/" : `/${parts.slice(0, -1).join("/")}`;
		const targetGroupId = groupIdFromParentPointer(parentPointer);

		if (targetGroupId !== sourceGroupId) {
			const keys = orders[targetGroupId] ?? [];
			const index = keys.indexOf(key);
			return {
				sourceGroupId,
				targetGroupId,
				targetIndex: index >= 0 ? index : keys.length,
			};
		}
	}

	if (!sortable) return null;

	return {
		sourceGroupId,
		targetGroupId: String(sortable.group ?? sourceGroupId),
		targetIndex: sortable.index,
	};
}

function resolveInsertIndicator(
	event: DragOverEvent,
	orders: Record<string, string[]>,
): DndInsertIndicator | null {
	const source = event.operation.source;
	const target = event.operation.target;
	if (!source || !target) return null;

	const sourceType = (source.data as { type?: string } | undefined)?.type;

	if (sourceType === FIELD_DRAG_TYPE) {
		const sortable = asSortableSource(source);
		const fieldData = source.data as FieldDragData;
		const drop = resolveFieldDropTarget(
			target.id,
			orders,
			sortable,
			fieldData,
		);
		if (drop) {
			return { groupId: drop.targetGroupId, index: drop.targetIndex };
		}
	}

	if (sourceType === PALETTE_DRAG_TYPE) {
		const drop = resolvePaletteDrop(target.id, orders);
		return { groupId: drop.groupId, index: drop.index };
	}

	return null;
}

type SortableDragSource = NonNullable<DragEndEvent["operation"]["source"]> & {
	initialIndex: number;
	index: number;
	group?: string | number;
	initialGroup?: string | number;
};

function asSortableSource(
	source: NonNullable<DragEndEvent["operation"]["source"]>,
): SortableDragSource | null {
	if (
		"initialIndex" in source &&
		typeof source.initialIndex === "number" &&
		"index" in source &&
		typeof source.index === "number"
	) {
		return source as SortableDragSource;
	}
	return null;
}

type SchemaEditorDndState = {
	insertIndicator: DndInsertIndicator | null;
	isDragging: boolean;
};

const SchemaEditorDndStateContext = createContext<SchemaEditorDndState | null>(null);

export function useSchemaEditorDnd(): SchemaEditorDndState {
	const ctx = useContext(SchemaEditorDndStateContext);
	if (!ctx) {
		throw new Error("useSchemaEditorDnd must be used within SchemaEditorDndProvider");
	}
	return ctx;
}

export function SchemaEditorDndProvider({ children }: { children: ReactNode }) {
	const { jsonSchema, uiSchema, handleAddFieldPresetAtParent, applyGroupFieldOrders } =
		useSchemaEditor();
	const [insertIndicator, setInsertIndicator] = useState<DndInsertIndicator | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const initialOrdersRef = useRef<Record<string, string[]>>({});
	const baselineOrdersRef = useRef<Record<string, string[]>>({});

	const presetById = useMemo(
		() => new Map(PALETTE_PRESETS.map((p) => [String(p.id), p])),
		[],
	);

	const baselineOrders = useMemo(
		() => collectGroupOrders(jsonSchema, uiSchema),
		[jsonSchema, uiSchema],
	);

	baselineOrdersRef.current = baselineOrders;

	const resetDragState = useCallback(() => {
		setIsDragging(false);
		setInsertIndicator(null);
	}, []);

	const onDragStart = useCallback(() => {
		const initial = collectGroupOrders(jsonSchema, uiSchema);
		initialOrdersRef.current = initial;
		setIsDragging(true);
		setInsertIndicator(null);
	}, [jsonSchema, uiSchema]);

	const onDragOver = useCallback((event: DragOverEvent) => {
		const source = event.operation.source;
		if (!source) return;
		setInsertIndicator(
			resolveInsertIndicator(event, baselineOrdersRef.current),
		);
	}, []);

	const onDragEnd = useCallback(
		(event: DragEndEvent) => {
			if (event.canceled) {
				resetDragState();
				return;
			}

			const source = event.operation.source;
			const target = event.operation.target;
			const initialOrders = initialOrdersRef.current;
			const currentOrders = baselineOrdersRef.current;

			if (
				source &&
				(source.data as PaletteDragData | undefined)?.type === PALETTE_DRAG_TYPE
			) {
				const presetId = (source.data as PaletteDragData).presetId;
				const preset = presetById.get(presetId);
				if (preset) {
					const { parentPointer, index } = resolvePaletteDrop(
						target?.id,
						currentOrders,
					);
					handleAddFieldPresetAtParent(
						parentPointer,
						preset.make(),
						index,
						preset.uiOptions,
						preset.uiBranch,
					);
				}
				resetDragState();
				return;
			}

			if (
				source &&
				(source.data as FieldDragData | undefined)?.type === FIELD_DRAG_TYPE
			) {
				const sortable = asSortableSource(source);
				const fieldData = source.data as FieldDragData;
				const drop = resolveFieldDropTarget(
					target?.id,
					initialOrders,
					sortable,
					fieldData,
				);
				if (drop) {
					const { sourceGroupId, targetGroupId, targetIndex } = drop;
					const from = sortable?.initialIndex ?? fieldData.index;
					const sameGroup = sourceGroupId === targetGroupId;
					const moved =
						!sameGroup ||
						from !== targetIndex ||
						initialOrders[sourceGroupId]?.[from] !== fieldData.key;

					if (moved) {
						const nextOrders = buildOrdersForFieldMove(
							initialOrders,
							fieldData.key,
							sourceGroupId,
							targetGroupId,
							targetIndex,
						);
						applyGroupFieldOrders(nextOrders, initialOrders);
					}
				}
			}

			resetDragState();
		},
		[
			applyGroupFieldOrders,
			handleAddFieldPresetAtParent,
			presetById,
			resetDragState,
		],
	);

	const dndState = useMemo(
		() => ({ insertIndicator, isDragging }),
		[insertIndicator, isDragging],
	);

	return (
		<SchemaEditorDndStateContext.Provider value={dndState}>
			<DragDropProvider
				onDragStart={onDragStart}
				onDragOver={onDragOver}
				onDragEnd={onDragEnd}
			>
				{children}
			</DragDropProvider>
		</SchemaEditorDndStateContext.Provider>
	);
}
