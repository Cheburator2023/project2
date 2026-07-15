import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { ReactNode } from "react";
import type {
	V2AnketaMainSectionId,
	V2AnketaWorkflowDto,
} from "@smart-anketa/api-contract";

import type {
	CalculationItem,
	TaskTriggerItem,
} from "@react-client/features/v2/admin_constructor/utils/calculationEngine";
import type { PathCalculationInfluence } from "./anketaCalculationDev.util";

export type AnketaFormContextValue = {
	/**
	 * Данные для отображения в UI (RJSF + кастомные таблицы/модалки).
	 * Всегда `engine.displayFormData` — с учётом серверной калькуляции и merge.
	 * Не подменять сырым `engine.formData`: иначе пропадут типовые работы и итоги.
	 */
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
	/** Debounce commit полей в formData (превью админки, без лагов на каждый символ). */
	debouncePreviewInputs?: boolean;
	workflow?: V2AnketaWorkflowDto;
	onCompleteMainSection?: (sectionId: V2AnketaMainSectionId) => void;
	/** Завершение кастомной панели (группа без workflowSectionId) по path. */
	onCompletePanelSection?: (pathKey: string) => void;
	onTouchMainSection?: (sectionId: V2AnketaMainSectionId) => void;
	isMainSectionLocked?: (sectionId: V2AnketaMainSectionId) => boolean;
	/** Включить/выключить опциональную группу (путь в formData, напр. streamDigitalAgents). */
	onToggleGroupActivation?: (pathKey: string, active: boolean) => void;
	/** IS_DEV: индекс влияния полей на POST /calculate. */
	devCalculationInfluence?: Map<string, PathCalculationInfluence>;
	devCalculationItems?: CalculationItem[];
	devTaskTriggerItems?: TaskTriggerItem[];
	devCalculationLoading?: boolean;
	/** POST /calculate в процессе — для строки «Суммарный итог» типовых работ. */
	calculationLoading?: boolean;
	/** Пути arch-блоков нетиповых работ, у которых коэффициент обновился после пересчёта неопределённости. */
	atypicalUncertaintySyncHighlightPaths?: ReadonlySet<string>;
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

/**
 * Merge form context layers without accidentally replacing defined caller values.
 * `objectFieldSlots` are additive because shells often contribute page-level slots.
 *
 * `formData` всегда берётся из `fallback` (displayFormData движка) — оболочки страниц
 * не могут подменить его сырыми данными анкеты.
 */
export function mergeAnketaFormContext(
	base: AnketaFormContextValue | undefined,
	fallback: AnketaFormContextValue,
): AnketaFormContextValue {
	const { formData: _baseFormData, ...baseRest } = base ?? {};
	return {
		...fallback,
		...baseRest,
		formData: fallback.formData,
		objectFieldSlots: {
			...base?.objectFieldSlots,
			...fallback.objectFieldSlots,
		},
	};
}
