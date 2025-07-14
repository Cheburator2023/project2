import type { ClientSideNodeManagerUpdateRowDataResult, IChangedRowNodes, IClientSideNodeManager, NamedBean, RefreshModelParams, RowDataTransaction, RowNode } from 'ag-grid-community';
import { AbstractClientSideTreeNodeManager } from './abstractClientSideTreeNodeManager';
export declare class ClientSideChildrenTreeNodeManager<TData> extends AbstractClientSideTreeNodeManager<TData> implements IClientSideNodeManager<TData>, NamedBean {
    beanName: "csrmChildrenTreeNodeSvc";
    private childrenGetter;
    get treeData(): boolean;
    extractRowData(): TData[] | null | undefined;
    destroy(): void;
    activate(rootNode: RowNode<TData>): void;
    updateRowData(_rowDataTran: RowDataTransaction<TData>, changedRowNodes: IChangedRowNodes<TData>): ClientSideNodeManagerUpdateRowDataResult<TData>;
    protected loadNewRowData(rowData: TData[]): void;
    setImmutableRowData(params: RefreshModelParams<TData>, rowData: TData[]): void;
    refreshModel(params: RefreshModelParams<TData>, started: boolean): void;
}
