import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
	externalValue: string;
	onCommit: (value: string) => void;
	onRecordHistory: () => void;
	debounceMs?: number;
};

/** Локальный ввод с debounce: не дергает всю схему на каждый символ. */
export function useBufferedDraftText({
	externalValue,
	onCommit,
	onRecordHistory,
	debounceMs = 300,
}: Options) {
	const [localValue, setLocalValue] = useState(externalValue);
	const historyRecordedRef = useRef(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		setLocalValue(externalValue);
		historyRecordedRef.current = false;
	}, [externalValue]);

	const commitValue = useCallback(
		(value: string, recordHistory: boolean) => {
			if (recordHistory && !historyRecordedRef.current) {
				onRecordHistory();
				historyRecordedRef.current = true;
			}
			onCommit(value);
			historyRecordedRef.current = false;
		},
		[onCommit, onRecordHistory],
	);

	const scheduleCommit = useCallback(
		(value: string) => {
			if (timerRef.current) clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => {
				commitValue(value, true);
				timerRef.current = null;
			}, debounceMs);
		},
		[commitValue, debounceMs],
	);

	const handleChange = useCallback(
		(value: string) => {
			setLocalValue(value);
			scheduleCommit(value);
		},
		[scheduleCommit],
	);

	const handleBlur = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		if (localValue !== externalValue) {
			commitValue(localValue, true);
		}
	}, [commitValue, externalValue, localValue]);

	useEffect(
		() => () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		},
		[],
	);

	return { value: localValue, onChange: handleChange, onBlur: handleBlur };
}
