import { useCallback, useEffect, useState } from "react";

export const SCHEMA_CONSTRUCTOR_HIDE_SYSTEM_FIELDS_KEY =
	"smart-anketa.settings.hideSystemFieldsInConstructor";

export const SCHEMA_CONSTRUCTOR_SETTINGS_CHANGED_EVENT =
	"schema-constructor-settings-changed";

/** По умолчанию системные поля скрыты на холсте конструктора. */
export const DEFAULT_HIDE_SYSTEM_FIELDS_IN_CONSTRUCTOR = true;

export function readHideSystemFieldsInConstructor(): boolean {
	try {
		const raw = localStorage.getItem(SCHEMA_CONSTRUCTOR_HIDE_SYSTEM_FIELDS_KEY);
		if (raw == null) return DEFAULT_HIDE_SYSTEM_FIELDS_IN_CONSTRUCTOR;
		return JSON.parse(raw) === true;
	} catch {
		return DEFAULT_HIDE_SYSTEM_FIELDS_IN_CONSTRUCTOR;
	}
}

export function writeHideSystemFieldsInConstructor(value: boolean): void {
	localStorage.setItem(
		SCHEMA_CONSTRUCTOR_HIDE_SYSTEM_FIELDS_KEY,
		JSON.stringify(value),
	);
	window.dispatchEvent(new Event(SCHEMA_CONSTRUCTOR_SETTINGS_CHANGED_EVENT));
}

export function useSchemaConstructorSettings() {
	const [hideSystemFields, setHideSystemFieldsState] = useState(
		readHideSystemFieldsInConstructor,
	);

	const setHideSystemFields = useCallback((value: boolean) => {
		writeHideSystemFieldsInConstructor(value);
		setHideSystemFieldsState(value);
	}, []);

	useEffect(() => {
		const sync = () => setHideSystemFieldsState(readHideSystemFieldsInConstructor());

		const onStorage = (event: StorageEvent) => {
			if (event.key === SCHEMA_CONSTRUCTOR_HIDE_SYSTEM_FIELDS_KEY) sync();
		};

		window.addEventListener("storage", onStorage);
		window.addEventListener(SCHEMA_CONSTRUCTOR_SETTINGS_CHANGED_EVENT, sync);
		return () => {
			window.removeEventListener("storage", onStorage);
			window.removeEventListener(SCHEMA_CONSTRUCTOR_SETTINGS_CHANGED_EVENT, sync);
		};
	}, []);

	return { hideSystemFields, setHideSystemFields };
}
