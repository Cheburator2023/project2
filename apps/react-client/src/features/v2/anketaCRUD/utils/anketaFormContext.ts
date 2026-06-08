import type { ReactNode } from "react";
import type {
	V2AnketaMainSectionId,
	V2AnketaWorkflowDto,
} from "@smart-anketa/api-contract";

export type AnketaFormContextValue = {
	formData?: Record<string, unknown>;
	objectFieldSlots?: Record<string, ReactNode>;
	openAnketaModal?: (path: string, editIndex?: number) => void;
	openUncertaintyModal?: () => void;
	deleteAnketaArrayItem?: (path: string, index: number) => void;
	deleteAnketaObject?: (path: string) => void;
	anketaModalArrayPaths?: ReadonlySet<string>;
	/** Массивы с компактной таблицей (в т.ч. типовые работы только для чтения). */
	anketaCompactArrayTablePaths?: ReadonlySet<string>;
	anketaModalObjectPaths?: ReadonlySet<string>;
	anketaReadOnly?: boolean;
	/** Превью в конструкторе схемы — виджеты вроде GeneralUncertainty без gate по инициативе. */
	schemaEditorPreview?: boolean;
	workflow?: V2AnketaWorkflowDto;
	onCompleteMainSection?: (sectionId: V2AnketaMainSectionId) => void;
	/** Завершение кастомной панели (группа без workflowSectionId) по path. */
	onCompletePanelSection?: (pathKey: string) => void;
	onTouchMainSection?: (sectionId: V2AnketaMainSectionId) => void;
	isMainSectionLocked?: (sectionId: V2AnketaMainSectionId) => boolean;
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
