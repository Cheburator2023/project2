import { useCallback, useMemo, useRef } from "react";
import type { GridApi, GridReadyEvent } from "ag-grid-community";
import {
	applyAgGridColumnState,
	saveAgGridColumnState,
} from "@react-client/common/tableStuff/agGridColumnState";
import { createAgGridSideBar } from "@react-client/common/tableStuff/agGridSideBar";

const SAVE_DEBOUNCE_MS = 250;

export function useAgGridColumnPersistence(gridStateKey: string) {
	const saveTimerRef = useRef<number | null>(null);

	const persistColumnState = useCallback(
		(api: GridApi) => {
			if (saveTimerRef.current !== null) {
				window.clearTimeout(saveTimerRef.current);
			}
			saveTimerRef.current = window.setTimeout(() => {
				saveAgGridColumnState(gridStateKey, api.getColumnState());
				saveTimerRef.current = null;
			}, SAVE_DEBOUNCE_MS);
		},
		[gridStateKey],
	);

	const onGridReady = useCallback(
		(event: GridReadyEvent) => {
			applyAgGridColumnState(gridStateKey, (state) => {
				event.api.applyColumnState({ state, applyOrder: true });
			});
		},
		[gridStateKey],
	);

	const onColumnStateChange = useCallback(
		(api: GridApi) => {
			persistColumnState(api);
		},
		[persistColumnState],
	);

	const sideBar = useMemo(
		() => createAgGridSideBar(gridStateKey),
		[gridStateKey],
	);

	return {
		sideBar,
		onGridReady,
		onColumnMoved: onColumnStateChange,
		onColumnVisible: onColumnStateChange,
		onColumnPinned: onColumnStateChange,
		onSortChanged: onColumnStateChange,
		onColumnResized: onColumnStateChange,
	};
}
