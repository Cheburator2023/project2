import type { IRowGroupingStrategy, StageExecuteParams } from 'ag-grid-community';
import { BeanStub } from 'ag-grid-community';
export declare class TreeParentIdStrategy<TData = any> extends BeanStub implements IRowGroupingStrategy<TData> {
    private parentIdGetter;
    private oldGroupDisplayColIds;
    destroy(): void;
    execute(params: StageExecuteParams<TData>): void;
    private updateGroupDisplayColsIds;
    private setGroupData;
}
