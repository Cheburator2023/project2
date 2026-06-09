import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { ReactNode } from "react";
import type {
	V2AnketaMainSectionId,
	V2AnketaWorkflowDto,
} from "@smart-anketa/api-contract";

export type AnketaFormContextValue = {
	formData?: Record<string, unknown>;
	/** Актуальные схемы превью (для арх. таблиц и модалок). */
	previewSchema?: RJSFSchema;
	previewUiSchema?: UiSchema;
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
	/** Включить/выключить опциональную группу (путь в formData, напр. streamDigitalAgents). */
	onToggleGroupActivation?: (pathKey: string, active: boolean) => void;
};

export function readAnketaFormContext(
	formContext: unknown,
): AnketaFormContextValue {
	if (!formContext || typeof formContext !== "object") return {};
	return formContext as AnketaFormContextValue;
}

/** RJSF v6: formContext на виджетах — в `registry`, не в корне props. */
export function readAnketaFormContextFromRjsfProps(props: {
	formContext?: unknown;
	registry?: { formContext?: unknown };
}): AnketaFormContextValue {
	return readAnketaFormContext(
		props.registry?.formContext ?? props.formContext,
	);
}

export function objectFieldSlot(
	formContext: unknown,
	pathKey: string,
): ReactNode | null {
	const ctx = readAnketaFormContext(formContext);
	return ctx.objectFieldSlots?.[pathKey] ?? null;
}
