import { useCallback, useEffect, useRef, useState } from "react";
import { V2_PREVIEW_FORM_DEBOUNCE_MS } from "@react-client/features/v2/admin_constructor/constants/previewFormDebounce";

type Options<T> = {
	value: T;
	onChange: (value: T) => void;
	enabled?: boolean;
	debounceMs?: number;
};

/** Локальный ввод в RJSF-виджете с debounce commit в formData (превью админки). */
export function useDebouncedRjsfFieldValue<T>({
	value,
	onChange,
	enabled = false,
	debounceMs = V2_PREVIEW_FORM_DEBOUNCE_MS,
}: Options<T>) {
	const [localValue, setLocalValue] = useState(value);
	const timerRef = useRef<number | null>(null);

	useEffect(() => {
		if (!enabled) return;
		setLocalValue(value);
	}, [enabled, value]);

	const flush = useCallback(
		(next: T) => {
			if (timerRef.current) {
				window.clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			onChange(next);
		},
		[onChange],
	);

	const handleChange = useCallback(
		(next: T) => {
			if (!enabled) {
				onChange(next);
				return;
			}
			setLocalValue(next);
			if (timerRef.current) window.clearTimeout(timerRef.current);
			timerRef.current = window.setTimeout(() => {
				onChange(next);
				timerRef.current = null;
			}, debounceMs);
		},
		[debounceMs, enabled, onChange],
	);

	const handleBlur = useCallback(() => {
		if (!enabled) return;
		flush(localValue);
	}, [enabled, flush, localValue]);

	useEffect(
		() => () => {
			if (timerRef.current) window.clearTimeout(timerRef.current);
		},
		[],
	);

	return {
		value: enabled ? localValue : value,
		onChange: handleChange,
		onBlur: handleBlur,
	};
}
