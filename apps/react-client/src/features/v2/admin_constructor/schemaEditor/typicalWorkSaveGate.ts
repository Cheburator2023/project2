import type { SaveStatus } from "./panels/typicalWorksPanel/useDebouncedTypicalWorkSave";

export type TypicalWorkSaveGateState = {
	/** Есть несохранённые правки типовой работы — блокируем сохранение схемы. */
	blocked: boolean;
	message?: string;
	status: SaveStatus;
	workName?: string | null;
	errorMessage?: string | null;
	onRetry?: () => void;
};
