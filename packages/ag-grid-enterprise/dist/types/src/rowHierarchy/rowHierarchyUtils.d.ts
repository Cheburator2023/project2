import type { BeanCollection, Column, GridOptionsService, RowNode } from 'ag-grid-community';
/**
 * Returns if the node and all of its parents are all firstChild until ancestor node is reached
 * This is to check for [groupHideOpenParents] where we only show the expand controls for first child of a group
 *
 * @return returns if node and all of its parents are first child until ancestor node is reached
 */
export declare function _isHiddenParent(node: RowNode, ancestor: RowNode, gos: GridOptionsService): boolean;
export declare function _getGroupValue(column: Column | null | undefined, node: RowNode, displayedNode: RowNode, beans: BeanCollection): string | null;
