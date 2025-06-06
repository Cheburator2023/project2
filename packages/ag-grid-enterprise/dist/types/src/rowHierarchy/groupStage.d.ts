import type { ClientSideRowModelStage, GridOptions, IRowNodeStage, NamedBean, StageExecuteParams } from 'ag-grid-community';
import { BeanStub } from 'ag-grid-community';
export declare class GroupStage<TData> extends BeanStub implements NamedBean, IRowNodeStage {
    beanName: "groupStage";
    refreshProps: Set<keyof GridOptions<any>>;
    step: ClientSideRowModelStage;
    private approach;
    private strategy;
    destroy(): void;
    private createStrategy;
    execute(params: StageExecuteParams<TData>): boolean;
}
