import type { SaveStatus } from "./panels/typicalWorksPanel/useDebouncedTypicalWorkSave";

export function saveGateStateEquals(
	a: TypicalWorkSaveGateState | null,
	b: TypicalWorkSaveGateState | null,
): boolean {
	if (a === b) return true;
	if (!a || !b) return false;
	return (
		a.blocked === b.blocked &&
		a.message === b.message &&
		a.status === b.status &&
		a.workName === b.workName &&
		a.errorMessage === b.errorMessage
	);
}

export type TypicalWorkSaveGateState = {
	/** Есть несохранённые правки типовой работы — блокируем сохранение схемы. */
	blocked: boolean;
	message?: string;
	status: SaveStatus;
	workName?: string | null;
	errorMessage?: string | null;
	onRetry?: () => void;
};
