import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export const usePageLocalStorage = <T = any>(
	componentId: string,
	initialValue?: T,
) => {
	const location = useLocation();
	const storageKey = `${location.pathname}_${componentId}`;

	const getStoredValue = useCallback((): T | null => {
		try {
			const item = localStorage.getItem(storageKey);
			return item ? JSON.parse(item) : (initialValue ?? null);
		} catch {
			return initialValue ?? null;
		}
	}, [storageKey, initialValue]);

	const [data, setData] = useState<T | null>(getStoredValue);

	const setValue = useCallback(
		(value: T | null) => {
			try {
				if (value === null) {
					localStorage.removeItem(storageKey);
				} else {
					localStorage.setItem(storageKey, JSON.stringify(value));
				}
				setData(value);
			} catch (error) {
				console.error("Failed to save to localStorage:", error);
			}
		},
		[storageKey],
	);

	const clearValue = useCallback(() => {
		localStorage.removeItem(storageKey);
		setData(null);
	}, [storageKey]);

	useEffect(() => {
		setData(getStoredValue());
	}, [getStoredValue]);

	return {
		data,
		setValue,
		clearValue,
		storageKey,
	};
};
