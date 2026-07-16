import { useEffect, useState } from "react";

/** Отложенное значение — для логики/калькуляции без блокировки ввода в UI. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = window.setTimeout(() => setDebounced(value), delayMs);
		return () => window.clearTimeout(timer);
	}, [value, delayMs]);

	return debounced;
}
