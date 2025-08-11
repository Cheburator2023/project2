export type FilterType = 'text' | 'number' | 'date' | 'set';

export type TextFilterType = 
  | 'equals'
  | 'notEqual'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'blank'
  | 'notBlank';

export type NumberFilterType = 
  | 'equals'
  | 'notEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'inRange'
  | 'blank'
  | 'notBlank';

export type DateFilterType = 
  | 'equals'
  | 'notEqual'
  | 'lessThan'
  | 'greaterThan'
  | 'inRange'
  | 'blank'
  | 'notBlank';

export type JoinOperator = 'AND' | 'OR';

export interface BaseFilterCondition {
  filterType: FilterType;
  type: string;
}

export interface TextFilterCondition extends BaseFilterCondition {
  filterType: 'text';
  type: TextFilterType;
  filter: string;
}

export interface NumberFilterCondition extends BaseFilterCondition {
  filterType: 'number';
  type: NumberFilterType;
  filter: number;
  filterTo?: number;
}

export interface DateFilterCondition extends BaseFilterCondition {
  filterType: 'date';
  type: DateFilterType;
  dateFrom: string;
  dateTo?: string;
}

export interface SetFilterCondition extends BaseFilterCondition {
  filterType: 'set';
  values: string[];
}

export type FilterCondition = 
  | TextFilterCondition 
  | NumberFilterCondition 
  | DateFilterCondition 
  | SetFilterCondition;

export interface CombinedFilterCondition {
  filterType: FilterType;
  operator: JoinOperator;
  condition1: FilterCondition;
  condition2: FilterCondition;
  conditions?: FilterCondition[];
}

export type ColumnFilterModel = FilterCondition | CombinedFilterCondition;

export interface GridFilterModel {
  [columnId: string]: ColumnFilterModel;
}

export interface FilterModelHelpers {
  isTextFilter: (filter: ColumnFilterModel) => filter is TextFilterCondition;
  isNumberFilter: (filter: ColumnFilterModel) => filter is NumberFilterCondition;
  isDateFilter: (filter: ColumnFilterModel) => filter is DateFilterCondition;
  isSetFilter: (filter: ColumnFilterModel) => filter is SetFilterCondition;
  isCombinedFilter: (filter: ColumnFilterModel) => filter is CombinedFilterCondition;
  getActiveFiltersCount: (filterModel: GridFilterModel) => number;
  getFilteredColumns: (filterModel: GridFilterModel) => string[];
  clearColumnFilter: (filterModel: GridFilterModel, columnId: string) => GridFilterModel;
  hasActiveFilters: (filterModel: GridFilterModel) => boolean;
}

export const filterModelHelpers: FilterModelHelpers = {
  isTextFilter: (filter): filter is TextFilterCondition => 
    filter.filterType === 'text' && 'filter' in filter,
  
  isNumberFilter: (filter): filter is NumberFilterCondition => 
    filter.filterType === 'number' && 'filter' in filter,
  
  isDateFilter: (filter): filter is DateFilterCondition => 
    filter.filterType === 'date' && 'dateFrom' in filter,
  
  isSetFilter: (filter): filter is SetFilterCondition => 
    filter.filterType === 'set' && 'values' in filter,
  
  isCombinedFilter: (filter): filter is CombinedFilterCondition => 
    'operator' in filter && 'condition1' in filter && 'condition2' in filter,
  
  getActiveFiltersCount: (filterModel) => 
    Object.keys(filterModel || {}).length,
  
  getFilteredColumns: (filterModel) => 
    Object.keys(filterModel || {}),
  
  clearColumnFilter: (filterModel, columnId) => {
    const newModel = { ...filterModel };
    delete newModel[columnId];
    return newModel;
  },
  
  hasActiveFilters: (filterModel) => 
    Object.keys(filterModel || {}).length > 0
};