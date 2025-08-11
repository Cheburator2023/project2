# AG Grid Filter Model Interface

Этот файл содержит TypeScript интерфейсы для работы с моделью фильтров AG Grid.

## Основные типы

### `GridFilterModel`
Основной интерфейс, представляющий состояние всех фильтров в таблице:
```typescript
interface GridFilterModel {
  [columnId: string]: ColumnFilterModel;
}
```

### `ColumnFilterModel`
Модель фильтра для отдельной колонки, может быть одним из:
- `TextFilterCondition` - текстовый фильтр
- `NumberFilterCondition` - числовой фильтр  
- `DateFilterCondition` - фильтр по дате
- `SetFilterCondition` - фильтр множественного выбора
- `CombinedFilterCondition` - комбинированный фильтр

## Типы фильтров

### Текстовый фильтр
```typescript
interface TextFilterCondition {
  filterType: 'text';
  type: 'equals' | 'notEqual' | 'contains' | 'notContains' | 'startsWith' | 'endsWith' | 'blank' | 'notBlank';
  filter: string;
}
```

### Числовой фильтр
```typescript
interface NumberFilterCondition {
  filterType: 'number';
  type: 'equals' | 'notEqual' | 'lessThan' | 'lessThanOrEqual' | 'greaterThan' | 'greaterThanOrEqual' | 'inRange' | 'blank' | 'notBlank';
  filter: number;
  filterTo?: number; // для типа 'inRange'
}
```

### Фильтр по дате
```typescript
interface DateFilterCondition {
  filterType: 'date';
  type: 'equals' | 'notEqual' | 'lessThan' | 'greaterThan' | 'inRange' | 'blank' | 'notBlank';
  dateFrom: string;
  dateTo?: string; // для типа 'inRange'
}
```

### Фильтр множественного выбора
```typescript
interface SetFilterCondition {
  filterType: 'set';
  values: string[];
}
```

## Вспомогательные функции

Модуль экспортирует объект `filterModelHelpers` с полезными функциями:

### Проверка типов фильтров
```typescript
filterModelHelpers.isTextFilter(filter)    // проверяет, является ли фильтр текстовым
filterModelHelpers.isNumberFilter(filter)  // проверяет, является ли фильтр числовым
filterModelHelpers.isDateFilter(filter)    // проверяет, является ли фильтр по дате
filterModelHelpers.isSetFilter(filter)     // проверяет, является ли фильтр множественного выбора
filterModelHelpers.isCombinedFilter(filter) // проверяет, является ли фильтр комбинированным
```

### Работа с моделью фильтров
```typescript
filterModelHelpers.getActiveFiltersCount(filterModel)  // возвращает количество активных фильтров
filterModelHelpers.getFilteredColumns(filterModel)     // возвращает массив ID отфильтрованных колонок
filterModelHelpers.hasActiveFilters(filterModel)       // проверяет, есть ли активные фильтры
filterModelHelpers.clearColumnFilter(filterModel, columnId) // очищает фильтр для указанной колонки
```

## Примеры использования

### Получение модели фильтров
```typescript
const gridFilterModel: GridFilterModel | null = gridRef?.current?.api?.getFilterModel() || null;
```

### Проверка активных фильтров
```typescript
if (filterModelHelpers.hasActiveFilters(gridFilterModel)) {
  console.log(`Активно фильтров: ${filterModelHelpers.getActiveFiltersCount(gridFilterModel)}`);
  console.log(`Отфильтрованные колонки: ${filterModelHelpers.getFilteredColumns(gridFilterModel)}`);
}
```

### Работа с конкретными типами фильтров
```typescript
Object.entries(gridFilterModel || {}).forEach(([columnId, filter]) => {
  if (filterModelHelpers.isTextFilter(filter)) {
    console.log(`Текстовый фильтр в колонке ${columnId}: ${filter.type} "${filter.filter}"`);
  } else if (filterModelHelpers.isNumberFilter(filter)) {
    console.log(`Числовой фильтр в колонке ${columnId}: ${filter.type} ${filter.filter}`);
  } else if (filterModelHelpers.isSetFilter(filter)) {
    console.log(`Фильтр выбора в колонке ${columnId}: ${filter.values.length} значений`);
  }
});
```

### Очистка фильтра
```typescript
const clearColumnFilter = (columnId: string) => {
  if (gridRef?.current?.api) {
    gridRef.current.api.setColumnFilterModel(columnId, null);
    gridRef.current.api.onFilterChanged();
  }
};
```

## Компонент FilterStateDisplay

В проекте также создан компонент `FilterStateDisplay`, который отображает текущее состояние фильтров и позволяет их очищать:

```typescript
<FilterStateDisplay 
  filterModel={currentFilterModel} 
  onClearFilter={onClearColumnFilter}
/>
```

Этот компонент автоматически:
- Показывает количество активных фильтров
- Отображает описание каждого фильтра в виде чипов
- Позволяет очищать отдельные фильтры по клику на крестик
- Адаптируется под разные типы фильтров

## Интеграция с AG Grid

Для отслеживания изменений фильтров используйте callback `onFilterChanged`:

```typescript
const onFilterChanged = () => {
  const filterModel = gridRef?.current?.api?.getFilterModel() || null;
  setCurrentFilterModel(filterModel);
  console.log("Фильтр изменен:", filterModel);
};

// В компоненте AgGridReact
<AgGridReact
  onFilterChanged={onFilterChanged}
  // другие пропсы...
/>
```