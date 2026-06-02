import type { ReactNode } from "react";

export type AnketaFormContextValue = {
	formData?: Record<string, unknown>;
	objectFieldSlots?: Record<string, ReactNode>;
	openAnketaModal?: (path: string, editIndex?: number) => void;
	openUncertaintyModal?: () => void;
	deleteAnketaArrayItem?: (path: string, index: number) => void;
	anketaModalArrayPaths?: ReadonlySet<string>;
	anketaReadOnly?: boolean;
};

export function readAnketaFormContext(
	formContext: unknown,
): AnketaFormContextValue {
	if (!formContext || typeof formContext !== "object") return {};
	return formContext as AnketaFormContextValue;
}

export function objectFieldSlot(
	formContext: unknown,
	pathKey: string,
): ReactNode | null {
	const ctx = readAnketaFormContext(formContext);
	return ctx.objectFieldSlots?.[pathKey] ?? null;
}
