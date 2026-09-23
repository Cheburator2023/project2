import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
	ColumnState,
	FilterModel,
	GridApi,
	GridReadyEvent,
} from "ag-grid-community";
import {
	loadAgGridColumnState,
	loadAgGridFilterModel,
	saveAgGridColumnState,
	saveAgGridFilterModel,
} from "@react-client/common/tableStuff/agGridColumnState";
import { createAgGridSideBar } from "@react-client/common/tableStuff/agGridSideBar";

const SAVE_DEBOUNCE_MS = 250;

/** События грида, а не пользователя: не затирают сохранённые колонки. */
const NON_USER_COLUMN_SOURCES = new Set([
	"gridOptionsChanged",
	"gridInitializing",
	"flex",
	"viewportSizeFeature",
	"alignedGridChanged",
	"rowDataUpdated",
	"rowModelUpdated",
	"filterChanged",
	"filterDestroyed",
	"cellDataTypeInferred",
	"rowNumbersService",
	"pivotChart",
]);

function columnStateSignature(state: ColumnState[]): string {
	return state
		.map((column) =>
			[
				column.colId,
				column.width ?? "",
				column.flex ?? "",
				column.hide ? 1 : 0,
				column.pinned ?? "",
				column.sort ?? "",
				column.sortIndex ?? "",
			].join(","),
		)
		.join("|");
}

export function useAgGridColumnPersistence(
	gridStateKey: string,
	options?: { showRowTintToggle?: boolean },
) {
	const saveTimerRef = useRef<number | null>(null);
	const restoringRef = useRef(false);
	const readyRef = useRef(false);
	const savedColumnsRef = useRef<ColumnState[] | null>(null);
	const savedFilterRef = useRef<FilterModel | null>(null);
	const loadedKeyRef = useRef<string | null>(null);

	if (loadedKeyRef.current !== gridStateKey) {
		loadedKeyRef.current = gridStateKey;
		savedColumnsRef.current = loadAgGridColumnState(gridStateKey);
		savedFilterRef.current = loadAgGridFilterModel(gridStateKey);
	}

	const flushSavedState = useCallback(() => {
		if (saveTimerRef.current !== null) {
			window.clearTimeout(saveTimerRef.current);
			saveTimerRef.current = null;
		}
		const columns = savedColumnsRef.current;
		const filter = savedFilterRef.current;
		if (columns?.length) {
			saveAgGridColumnState(gridStateKey, columns);
		}
		if (filter && !Array.isArray(filter)) {
			saveAgGridFilterModel(gridStateKey, filter);
		}
	}, [gridStateKey]);

	const scheduleSave = useCallback(() => {
		if (saveTimerRef.current !== null) {
			window.clearTimeout(saveTimerRef.current);
		}
		saveTimerRef.current = window.setTimeout(() => {
			saveTimerRef.current = null;
			flushSavedState();
		}, SAVE_DEBOUNCE_MS);
	}, [flushSavedState]);

	useEffect(() => {
		const flush = () => flushSavedState();
		window.addEventListener("pagehide", flush);
		return () => {
			window.removeEventListener("pagehide", flush);
			flushSavedState();
		};
	}, [flushSavedState]);

	const restoreFilterModel = useCallback((api: GridApi) => {
		const saved = savedFilterRef.current;
		if (!saved) return;
		const next = Object.keys(saved).length ? saved : null;
		const current = api.getFilterModel() ?? {};
		if (JSON.stringify(current) === JSON.stringify(next ?? {})) return;
		api.setFilterModel(next);
	}, []);

	const restoreColumnState = useCallback((api: GridApi) => {
		const saved = savedColumnsRef.current;
		if (!saved?.length) return;
		const applicable = saved.filter(
			(column) => column.colId && api.getColumn(column.colId),
		);
		if (!applicable.length) return;
		const applicableIds = new Set(
			applicable.map((column) => column.colId),
		);
		const liveApplicable = api
			.getColumnState()
			.filter(
				(column) => column.colId && applicableIds.has(column.colId),
			);
		if (
			columnStateSignature(liveApplicable) ===
			columnStateSignature(applicable)
		) {
			return;
		}
		api.applyColumnState({ state: applicable, applyOrder: true });
	}, []);

	const restoreSavedState = useCallback(
		(api: GridApi) => {
			if (restoringRef.current) return;
			restoringRef.current = true;
			try {
				restoreColumnState(api);
				restoreFilterModel(api);
			} catch {
				// битый снимок в localStorage не должен ронять страницу
			} finally {
				restoringRef.current = false;
			}
		},
		[restoreColumnState, restoreFilterModel],
	);

	const onGridReady = useCallback(
		(event: GridReadyEvent) => {
			readyRef.current = true;
			restoreSavedState(event.api);
		},
		[restoreSavedState],
	);

	const onColumnsReset = useCallback(
		(api: GridApi) => {
			if (!readyRef.current) return;
			restoreSavedState(api);
		},
		[restoreSavedState],
	);

	const onColumnStateChange = useCallback(
		(api: GridApi, source?: string) => {
			if (!readyRef.current || restoringRef.current) return;
			if (source && NON_USER_COLUMN_SOURCES.has(source)) return;
			savedColumnsRef.current = api.getColumnState();
			scheduleSave();
		},
		[scheduleSave],
	);

	const onFilterChanged = useCallback(
		(api: GridApi, source?: string) => {
			if (!readyRef.current || restoringRef.current) return;
			if (source !== "columnFilter" && source !== "advancedFilter") return;
			savedFilterRef.current = api.getFilterModel() ?? {};
			scheduleSave();
		},
		[scheduleSave],
	);

	const sideBar = useMemo(
		() =>
			createAgGridSideBar(gridStateKey, {
				showRowTintToggle: options?.showRowTintToggle,
			}),
		[gridStateKey, options?.showRowTintToggle],
	);

	return {
		sideBar,
		onGridReady,
		onColumnMoved: onColumnStateChange,
		onColumnVisible: onColumnStateChange,
		onColumnPinned: onColumnStateChange,
		onSortChanged: onColumnStateChange,
		onColumnResized: onColumnStateChange,
		onFilterChanged,
		onColumnsReset,
	};
}
