import {
	inferLegacyStreamExecutorForBlockKey,
	isV2ExecutorStreamLabel,
	type V2ExecutorStreamLabel,
} from "./v2-executor-streams.util";
import {
	V2_ANKETA_MAIN_SECTION_IDS,
	type V2AnketaMainSectionId,
} from "./v2-anketa-workflow.types";

export const V2_ANKETA_SECTION_ROLE_VALUES = [
	"main",
	"subsection",
	"panel",
	"flat",
] as const;

export type V2AnketaSectionRole = (typeof V2_ANKETA_SECTION_ROLE_VALUES)[number];

export type V2AnketaSectionTitleVariant = "h5" | "h6";

/**
 * Архитектурные компоненты (глоссарий, §3.4) — типовые структурные элементы
 * функциональных областей анкеты. Состав фиксирован, но расширяем.
 * Параметры арх. компонента одновременно являются триггерами генерации
 * типовых работ из справочника.
 */
export const V2_ARCH_COMPONENT_TYPES = [
	"modelService",
	"model",
	"sourceSystem",
	"dataMart",
	"dataProcess",
	"deployChannel",
	"modelControl",
	"typicalWork",
	"atypicalWork",
] as const;

export type V2ArchComponentType = (typeof V2_ARCH_COMPONENT_TYPES)[number];

/** Человекочитаемые названия арх. компонентов (из глоссария). */
export const V2_ARCH_COMPONENT_LABELS: Record<V2ArchComponentType, string> = {
	modelService: "Модельный сервис",
	model: "Модели",
	sourceSystem: "Система-источник",
	dataMart: "Объект / Витрина данных",
	dataProcess: "Процесс обработки данных",
	deployChannel: "Канал внедрения",
	modelControl: "Контроль модели",
	typicalWork: "Типовые работы",
	atypicalWork: "Нетиповые работы",
};

export function isV2ArchComponentType(
	value: unknown,
): value is V2ArchComponentType {
	return (
		typeof value === "string" &&
		(V2_ARCH_COMPONENT_TYPES as readonly string[]).includes(value)
	);
}

export type V2AnketaSectionUiOptions = {
	/** Роль секции в layout анкеты (конструктор / uiSchema). */
	sectionRole?: V2AnketaSectionRole;
	/** Accordion: развёрнута по умолчанию. */
	defaultExpanded?: boolean;
	/** Привязка к workflow.sections для главных секций. */
	workflowSectionId?: V2AnketaMainSectionId;
	/** Подсекция: счётчик заполненных элементов в заголовке. */
	showFilledCount?: boolean;
	titleVariant?: V2AnketaSectionTitleVariant;
	/** Подпись под заголовком главной секции (caption). */
	sectionCaption?: string;
	hidden?: boolean;
	/** Системный блок (мета, workflow, данные расчётов) — не редактируется в анкете. */
	system?: boolean;
	/** Тип арх. компонента (глоссарий §3.4) для разметки и dev-подсветки. */
	archComponent?: V2ArchComponentType;
	/** Группу можно включать/выключать в форме (кнопка в шапке секции). */
	groupActivatable?: boolean;
	/** Активна по умолчанию, если в formData ещё нет записи в groupActivation. */
	groupActive?: boolean;
	/** Блок разметки: не показывать заголовок (для layoutGroup по умолчанию true). */
	hideTitle?: boolean;
	/** Корневой блок платформенного/поддерживающего стрима. */
	streamBlock?: boolean;
	/** Стрим-исполнитель из справочника (ДАДМ, ПиРМ, …). */
	streamExecutor?: V2ExecutorStreamLabel;
};

const STREAM_SECTION_IDS = V2_ANKETA_MAIN_SECTION_IDS.filter((id) =>
	id.startsWith("stream"),
) as V2AnketaMainSectionId[];

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

export function readV2AnketaSectionUiOptions(
	uiNode: unknown,
): V2AnketaSectionUiOptions {
	const node = readRecord(uiNode);
	const opts = readRecord(node?.["ui:options"]);
	if (!opts) return {};
	return {
		sectionRole: isSectionRole(opts.sectionRole)
			? opts.sectionRole
			: undefined,
		defaultExpanded:
			typeof opts.defaultExpanded === "boolean"
				? opts.defaultExpanded
				: undefined,
		workflowSectionId: isMainSectionId(opts.workflowSectionId)
			? opts.workflowSectionId
			: undefined,
		showFilledCount:
			typeof opts.showFilledCount === "boolean"
				? opts.showFilledCount
				: undefined,
		titleVariant:
			opts.titleVariant === "h5" || opts.titleVariant === "h6"
				? opts.titleVariant
				: undefined,
		sectionCaption:
			typeof opts.sectionCaption === "string" && opts.sectionCaption.trim()
				? opts.sectionCaption.trim()
				: undefined,
		hidden: opts.hidden === true ? true : undefined,
		archComponent: isV2ArchComponentType(opts.archComponent)
			? opts.archComponent
			: undefined,
		groupActivatable: opts.groupActivatable === true ? true : undefined,
		groupActive:
			typeof opts.groupActive === "boolean" ? opts.groupActive : undefined,
		hideTitle:
			opts.layoutGroup === true
				? opts.hideTitle !== false
				: opts.hideTitle === true
					? true
					: undefined,
		streamBlock:
			opts.streamBlock === true
				? true
				: opts.streamBlock === false
					? false
					: undefined,
		streamExecutor: (() => {
			if (typeof opts.streamExecutor !== "string") return undefined;
			const trimmed = opts.streamExecutor.trim();
			return isV2ExecutorStreamLabel(trimmed) ? trimmed : undefined;
		})(),
	};
}

export type V2AnketaStreamBlockOptions = {
	streamBlock: boolean;
	streamExecutor: V2ExecutorStreamLabel | null;
};

/** Явная или legacy-привязка корневого блока к стриму-исполнителю. */
export function resolveV2AnketaStreamBlockOptions(
	uiNode: unknown,
	blockKey?: string,
): V2AnketaStreamBlockOptions {
	const opts = readV2AnketaSectionUiOptions(uiNode);
	if (opts.streamBlock === false) {
		return { streamBlock: false, streamExecutor: null };
	}
	if (opts.streamBlock === true) {
		return {
			streamBlock: true,
			streamExecutor: opts.streamExecutor ?? null,
		};
	}
	const legacy =
		blockKey != null ? inferLegacyStreamExecutorForBlockKey(blockKey) : null;
	if (legacy) {
		return { streamBlock: true, streamExecutor: legacy };
	}
	return { streamBlock: false, streamExecutor: null };
}

export function isV2AnketaStreamBlockRoot(
	uiNode: unknown,
	blockKey?: string,
): boolean {
	return resolveV2AnketaStreamBlockOptions(uiNode, blockKey).streamBlock;
}

/** Тип арх. компонента секции из ui:options, либо null. */
export function resolveV2AnketaArchComponent(
	uiNode: unknown,
): V2ArchComponentType | null {
	return readV2AnketaSectionUiOptions(uiNode).archComponent ?? null;
}

function isSectionRole(value: unknown): value is V2AnketaSectionRole {
	return (
		typeof value === "string" &&
		(V2_ANKETA_SECTION_ROLE_VALUES as readonly string[]).includes(value)
	);
}

export function isV2AnketaMainSectionId(
	value: string,
): value is V2AnketaMainSectionId {
	return (V2_ANKETA_MAIN_SECTION_IDS as readonly string[]).includes(value);
}

function isMainSectionId(value: unknown): value is V2AnketaMainSectionId {
	return typeof value === "string" && isV2AnketaMainSectionId(value);
}

export function isV2AnketaStreamSectionId(
	value: string,
): value is V2AnketaMainSectionId {
	return (STREAM_SECTION_IDS as readonly string[]).includes(
		value as V2AnketaMainSectionId,
	);
}

const MODAL_OBJECT_ARCH_TYPES: readonly V2ArchComponentType[] = [
	"modelService",
	"dataProcess",
	"dataMart",
];

/** Роль секции: явно из ui:options или эвристика для старых схем без layout. */
export function resolveV2AnketaSectionRole(
	uiNode: unknown,
	path: string[],
): V2AnketaSectionRole {
	const opts = readV2AnketaSectionUiOptions(uiNode);
	if (opts.sectionRole) return opts.sectionRole;

	if (
		opts.archComponent &&
		((MODAL_OBJECT_ARCH_TYPES as readonly string[]).includes(
			opts.archComponent,
		) ||
			opts.archComponent === "model")
	) {
		return "subsection";
	}

	const root = path[0] ?? "";
	if (path.length === 1 && isV2AnketaMainSectionId(root)) return "main";
	if (path.length === 2) {
		if (
			isV2AnketaStreamSectionId(root) ||
			inferLegacyStreamExecutorForBlockKey(root)
		) {
			return "subsection";
		}
	}
	if (path.length === 1) return "panel";
	return "flat";
}

export function resolveV2AnketaDefaultExpanded(
	uiNode: unknown,
	path: string[],
	role: V2AnketaSectionRole,
): boolean {
	const opts = readV2AnketaSectionUiOptions(uiNode);
	if (typeof opts.defaultExpanded === "boolean") return opts.defaultExpanded;
	if (role === "main") {
		return path[0] === V2_ANKETA_MAIN_SECTION_IDS[0];
	}
	if (role === "panel") return true;
	return true;
}

export function resolveV2AnketaWorkflowSectionId(
	uiNode: unknown,
	path: string[],
): V2AnketaMainSectionId | null {
	const opts = readV2AnketaSectionUiOptions(uiNode);
	if (opts.workflowSectionId) return opts.workflowSectionId;
	const root = path[0] ?? "";
	return path.length === 1 && isV2AnketaMainSectionId(root) ? root : null;
}

export function resolveV2AnketaSectionTitleVariant(
	uiNode: unknown,
	fallback: V2AnketaSectionTitleVariant = "h6",
): V2AnketaSectionTitleVariant {
	const opts = readV2AnketaSectionUiOptions(uiNode);
	return opts.titleVariant ?? fallback;
}

export { STREAM_SECTION_IDS as V2_ANKETA_STREAM_SECTION_IDS };
