import type { DragEndEvent, DragOverEvent } from "@dnd-kit/dom";
import { DragDropProvider } from "@dnd-kit/react";
import { arrayMove, move } from "@dnd-kit/helpers";
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
import { FIELD_PRESETS } from "../constants";
import { useSchemaEditor } from "../SchemaEditorContext";
import {
	isObjectFieldGroup,
	listChildKeys,
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
	parentPointer = "/",
): Record<string, string[]> {
	const groupId = groupIdFromParentPointer(parentPointer);
	const keys = listChildKeys(schema, parentPointer);
	const result: Record<string, string[]> = { [groupId]: keys };

	for (const key of keys) {
		const childPointer =
			parentPointer === "/" ? `/${key}` : `${parentPointer.replace(/\/$/, "")}/${key}`;
		const node = resolveSchemaNode(schema, pointerSegments(childPointer));
		if (isObjectFieldGroup(node)) {
			Object.assign(result, collectGroupOrders(schema, childPointer));
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
		if (sortable) {
			return {
				groupId: String(sortable.group ?? ROOT_GROUP_ID),
				index: sortable.index,
			};
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
	displayOrders: Record<string, string[]>;
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

/** @deprecated use useSchemaEditorDnd */
export function useSchemaEditorDndOrders(): Record<string, string[]> {
	return useSchemaEditorDnd().displayOrders;
}

export function SchemaEditorDndProvider({ children }: { children: ReactNode }) {
	const { jsonSchema, handleAddFieldPresetAtParent, applyGroupFieldOrders } =
		useSchemaEditor();
	const [dragOrders, setDragOrders] = useState<Record<string, string[]> | null>(null);
	const [insertIndicator, setInsertIndicator] = useState<DndInsertIndicator | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const initialOrdersRef = useRef<Record<string, string[]>>({});
	const dragOrdersRef = useRef<Record<string, string[]> | null>(null);

	const presetById = useMemo(
		() => new Map(FIELD_PRESETS.map((p) => [String(p.id), p])),
		[],
	);

	const displayOrders = dragOrders ?? collectGroupOrders(jsonSchema);

	const onDragStart = useCallback(() => {
		const initial = collectGroupOrders(jsonSchema);
		initialOrdersRef.current = initial;
		dragOrdersRef.current = initial;
		setDragOrders(initial);
		setIsDragging(true);
		setInsertIndicator(null);
	}, [jsonSchema]);

	const onDragOver = useCallback(
		(event: DragOverEvent) => {
			const source = event.operation.source;
			if (!source) return;

			const orders = dragOrdersRef.current ?? initialOrdersRef.current;
			setInsertIndicator(resolveInsertIndicator(event, orders));

			const sourceType = (source.data as { type?: string } | undefined)?.type;
			if (sourceType === FIELD_DRAG_TYPE) {
				setDragOrders((prev) => {
					const base = prev ?? initialOrdersRef.current;
					const next = move(base, event) as Record<string, string[]>;
					dragOrdersRef.current = next;
					return next;
				});
			}
		},
		[],
	);

	const onDragEnd = useCallback(
		(event: DragEndEvent) => {
			setIsDragging(false);
			setInsertIndicator(null);

			if (event.canceled) {
				setDragOrders(null);
				dragOrdersRef.current = null;
				return;
			}

			const source = event.operation.source;
			const target = event.operation.target;
			const initialOrders = initialOrdersRef.current;
			const finalOrders = dragOrdersRef.current ?? initialOrders;

			if (
				source &&
				(source.data as PaletteDragData | undefined)?.type === PALETTE_DRAG_TYPE
			) {
				const presetId = (source.data as PaletteDragData).presetId;
				const preset = presetById.get(presetId);
				if (preset) {
					const { parentPointer, index } = resolvePaletteDrop(
						target?.id,
						finalOrders,
					);
					handleAddFieldPresetAtParent(parentPointer, preset.make(), index);
				}
				setDragOrders(null);
				dragOrdersRef.current = null;
				return;
			}

			if (
				source &&
				(source.data as FieldDragData | undefined)?.type === FIELD_DRAG_TYPE
			) {
				const sortable = asSortableSource(source);
				if (sortable) {
					const groupId = String(sortable.group ?? ROOT_GROUP_ID);
					const initialGroup = String(sortable.initialGroup ?? groupId);
					const from = sortable.initialIndex;
					const to = sortable.index;

					if (from !== to) {
						if (initialGroup === groupId) {
							const keys = [
								...(finalOrders[groupId] ?? initialOrders[groupId] ?? []),
							];
							const reordered = arrayMove(keys, from, to);
							applyGroupFieldOrders({ ...finalOrders, [groupId]: reordered });
						} else {
							applyGroupFieldOrders(finalOrders);
						}
						setDragOrders(null);
						dragOrdersRef.current = null;
						return;
					}
				}

				applyGroupFieldOrders(finalOrders);
			}

			setDragOrders(null);
			dragOrdersRef.current = null;
		},
		[applyGroupFieldOrders, handleAddFieldPresetAtParent, presetById],
	);

	const dndState = useMemo(
		() => ({ displayOrders, insertIndicator, isDragging }),
		[displayOrders, insertIndicator, isDragging],
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
