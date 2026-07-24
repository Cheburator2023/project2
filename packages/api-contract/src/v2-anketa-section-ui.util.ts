import {
	normalizeStreamBlockRoles,
	serializeStreamBlockRoles,
	type V2StreamBlockRoleCode,
	type V2StreamBlockRoleValue,
} from "./v2-stream-block-role.util";
import {
	inferLegacyStreamBlockExecutorCode,
	normalizeStreamBlockExecutor,
	normalizeStreamBlockExecutors,
	resolveLogicStreamDbExecutor,
	resolveStreamBlockExecutorLabel,
	resolveStreamBlockExecutorsLabel,
	serializeStreamBlockExecutors,
	type V2StreamBlockExecutor,
	type V2StreamBlockExecutorValue,
} from "./v2-stream-block-executor.util";
import {
	isV2ExecutorStreamLabel,
	resolveExecutorStreamAreaLabel,
	typicalWorkAssignedToAnyExecutorStream,
	typicalWorkAssignedToExecutorStream,
} from "./v2-executor-streams.util";
import { isV2ImplementationStreamCode } from "./v2-implementation-streams.util";
import { V2_MODEL_STREAM_EXECUTOR } from "./v2-model-stream-typical-works.constants";
import {
	V2_ANKETA_MAIN_SECTION_IDS,
	type V2AnketaMainSectionId,
} from "./v2-anketa-workflow.types";
import {
	V2_ANKETA_MAIN_SECTION_TITLES,
	type V2AnketaRequiredWorkflowTarget,
} from "./v2-anketa-workflow.util";

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
	streamExecutor?: V2StreamBlockExecutorValue;
	/** Роли платформы для стрим-блока (код или массив кодов). */
	streamBlockRoles?: V2StreamBlockRoleValue;
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
			const executors = normalizeStreamBlockExecutors(opts.streamExecutor);
			return serializeStreamBlockExecutors(executors);
		})(),
		streamBlockRoles: (() => {
			const roles = normalizeStreamBlockRoles(opts.streamBlockRoles);
			return serializeStreamBlockRoles(roles);
		})(),
	};
}

export function readStreamBlockRolesFromSectionUi(
	uiNode: unknown,
): V2StreamBlockRoleCode[] {
	return normalizeStreamBlockRoles(
		readV2AnketaSectionUiOptions(uiNode).streamBlockRoles,
	);
}

export function readStreamExecutorsFromSectionUi(
	uiNode: unknown,
): V2StreamBlockExecutor[] {
	return normalizeStreamBlockExecutors(
		readV2AnketaSectionUiOptions(uiNode).streamExecutor,
	);
}

export type V2AnketaStreamBlockOptions = {
	streamBlock: boolean;
	streamExecutors: V2StreamBlockExecutor[];
	streamBlockRoles: V2StreamBlockRoleCode[];
	/** Первый стрим (обратная совместимость). */
	streamExecutor: V2StreamBlockExecutor | null;
};

/** Явная или legacy-привязка корневого блока к стриму-исполнителю. */
export function resolveV2AnketaStreamBlockOptions(
	uiNode: unknown,
	blockKey?: string,
): V2AnketaStreamBlockOptions {
	const opts = readV2AnketaSectionUiOptions(uiNode);
	if (opts.streamBlock === false) {
		return {
			streamBlock: false,
			streamExecutor: null,
			streamExecutors: [],
			streamBlockRoles: [],
		};
	}
	if (opts.streamBlock === true) {
		const streamExecutors = normalizeStreamBlockExecutors(opts.streamExecutor);
		return {
			streamBlock: true,
			streamExecutors,
			streamExecutor: streamExecutors[0] ?? null,
			streamBlockRoles: normalizeStreamBlockRoles(opts.streamBlockRoles),
		};
	}
	const legacy =
		blockKey != null ? inferLegacyStreamBlockExecutorCode(blockKey) : null;
	if (legacy) {
		return {
			streamBlock: true,
			streamExecutors: [legacy],
			streamExecutor: legacy,
			streamBlockRoles: normalizeStreamBlockRoles(opts.streamBlockRoles),
		};
	}
	return {
		streamBlock: false,
		streamExecutor: null,
		streamExecutors: [],
		streamBlockRoles: [],
	};
}

export function isV2AnketaStreamBlockRoot(
	uiNode: unknown,
	blockKey?: string,
): boolean {
	return resolveV2AnketaStreamBlockOptions(uiNode, blockKey).streamBlock;
}

export const V2_STREAM_BLOCK_TITLE_PREFIX = "Стрим ";

/** Уже оформленный заголовок стрима (заводской снепшот: «Стрим «…»», новый: «Стрим …»). */
export function hasV2StreamBlockTitlePrefix(title: string): boolean {
	const trimmed = title.trim();
	return /^Стрим(\s|«)/u.test(trimmed) || trimmed === "Стрим";
}

/** Заголовок стримового object-блока (идемпотентно, в стиле заводского снепшота). */
export function formatV2StreamBlockSectionTitle(baseTitle: string): string {
	const trimmed = baseTitle.trim();
	if (!trimmed) return "Стрим";
	if (hasV2StreamBlockTitlePrefix(trimmed)) return trimmed;
	const codes = normalizeStreamBlockExecutors(trimmed);
	if (codes.length > 1) {
		return `Стрим «${resolveStreamBlockExecutorsLabel(codes)}»`;
	}
	if (isV2ImplementationStreamCode(trimmed) || normalizeStreamBlockExecutor(trimmed)) {
		return `Стрим «${resolveStreamBlockExecutorLabel(trimmed)}»`;
	}
	if (isV2ExecutorStreamLabel(trimmed)) {
		return `Стрим «${trimmed}»`;
	}
	return `${V2_STREAM_BLOCK_TITLE_PREFIX}${trimmed}`;
}

export function formatV2StreamBlockSectionTitleFromExecutors(
	executors: readonly V2StreamBlockExecutor[],
): string {
	if (executors.length === 0) return "Стрим";
	const label = resolveStreamBlockExecutorsLabel(executors);
	return label ? `Стрим «${label}»` : "Стрим";
}

/** Заголовок секции с учётом streamBlock (явный, legacy stream* / field_* ключ). */
export function resolveV2AnketaSectionDisplayTitle(
	baseTitle: string,
	uiNode: unknown,
	blockKey?: string,
): string {
	const streamOpts = resolveV2AnketaStreamBlockOptions(uiNode, blockKey);
	if (!streamOpts.streamBlock) return baseTitle;

	const trimmed = baseTitle.trim();
	if (hasV2StreamBlockTitlePrefix(trimmed)) return trimmed;

	if (
		blockKey &&
		(V2_ANKETA_MAIN_SECTION_IDS as readonly string[]).includes(blockKey)
	) {
		const canonical =
			V2_ANKETA_MAIN_SECTION_TITLES[blockKey as V2AnketaMainSectionId];
		if (canonical) return canonical;
	}

	const executor = streamOpts.streamExecutor;
	const executors = streamOpts.streamExecutors;
	if (executors.length > 0 && (!trimmed || trimmed === executor)) {
		return formatV2StreamBlockSectionTitleFromExecutors(executors);
	}

	return formatV2StreamBlockSectionTitle(trimmed || executor || baseTitle);
}

export type ExecutorStreamBlockRef = {
	blockKey: string;
	pointer: string;
	streamExecutors: V2StreamBlockExecutor[];
	/** Первый стрим (обратная совместимость). */
	streamExecutor: V2StreamBlockExecutor;
};

/** Корневые стримовые блоки анкеты из uiSchema. */
export function collectExecutorStreamBlocks(
	uiSchema: unknown,
): ExecutorStreamBlockRef[] {
	const root = readRecord(uiSchema);
	if (!root) return [];

	const blocks: ExecutorStreamBlockRef[] = [];
	for (const blockKey of Object.keys(root)) {
		if (blockKey.startsWith("ui:")) continue;
		const branch = readRecord(root[blockKey]);
		const { streamBlock, streamExecutors } = resolveV2AnketaStreamBlockOptions(
			branch,
			blockKey,
		);
		if (streamBlock && streamExecutors.length > 0) {
			blocks.push({
				blockKey,
				pointer: `/${blockKey}`,
				streamExecutors,
				streamExecutor: streamExecutors[0],
			});
		}
	}
	return blocks;
}

export function collectPresentExecutorStreamLabels(
	uiSchema: unknown,
): Set<V2StreamBlockExecutor> {
	return new Set(
		collectExecutorStreamBlocks(uiSchema).flatMap((block) => block.streamExecutors),
	);
}

/** Есть ли в конструкторе корневой streamBlock для стрима (код или legacy-имя БД). */
export function isExecutorStreamPresentInSchema(
	uiSchema: unknown,
	stream: string,
	catalog?: readonly import("./v2-implementation-stream-catalog.util").V2ImplementationStreamCatalogEntry[],
): boolean {
	const trimmed = stream.trim();
	if (!trimmed) return false;
	const present = collectPresentExecutorStreamLabels(uiSchema);
	const streamCode = normalizeStreamBlockExecutor(trimmed, catalog);
	if (streamCode && present.has(streamCode)) return true;
	for (const code of present) {
		if (typicalWorkAssignedToExecutorStream([trimmed], code, catalog)) {
			return true;
		}
	}
	const area = resolveExecutorStreamAreaLabel(trimmed);
	const areaCode = normalizeStreamBlockExecutor(area, catalog);
	return areaCode != null && present.has(areaCode);
}

function readUiBranchAtDotPath(
	uiSchema: unknown,
	dotPath: string,
): Record<string, unknown> | undefined {
	const segments = dotPath.split(".").filter(Boolean);
	let cur: unknown = uiSchema;
	for (const segment of segments) {
		const branch = readRecord(cur);
		if (!branch || !(segment in branch)) return undefined;
		cur = branch[segment];
	}
	return readRecord(cur);
}

/**
 * Стримы-исполнители для блока typicalWork: явный ui:options.streamExecutor,
 * иначе стримы корневого streamBlock по пути вывода.
 */
export function resolveStreamExecutorForTypicalWorkOutputPath(
	uiSchema: unknown,
	outputPath: string,
): V2StreamBlockExecutor[] {
	const leaf = readUiBranchAtDotPath(uiSchema, outputPath);
	const explicit = normalizeStreamBlockExecutors(
		readV2AnketaSectionUiOptions(leaf).streamExecutor,
	);
	if (explicit.length > 0) return explicit;

	const rootKey = outputPath.split(".")[0]?.trim();
	if (!rootKey) return [];
	const rootBranch = readRecord(readRecord(uiSchema)?.[rootKey]);
	return resolveV2AnketaStreamBlockOptions(rootBranch, rootKey).streamExecutors;
}

/** Первый стрим-исполнитель для блока typicalWork (legacy single-stream API). */
export function resolvePrimaryStreamExecutorForTypicalWorkOutputPath(
	uiSchema: unknown,
	outputPath: string,
): V2StreamBlockExecutor | null {
	return (
		resolveStreamExecutorForTypicalWorkOutputPath(uiSchema, outputPath)[0] ??
		null
	);
}

/**
 * Подпись стрима для UI / worksCatalogStream:
 * сохраняет legacy «Модельный стрим» и мапит коды implementationStream в имена БД.
 */
export function resolveTypicalWorkCatalogStreamLabel(
	uiSchema: unknown | undefined,
	outputPath: string,
): string | null {
	if (!uiSchema) return null;

	const collectRaw = (path: string): string[] => {
		const branch = readUiBranchAtDotPath(uiSchema, path);
		const raw = readRecord(branch?.["ui:options"])?.streamExecutor;
		if (typeof raw === "string") return raw.trim() ? [raw.trim()] : [];
		if (!Array.isArray(raw)) return [];
		return raw
			.filter((item): item is string => typeof item === "string")
			.map((item) => item.trim())
			.filter(Boolean);
	};

	const candidates = [
		...collectRaw(outputPath),
		...collectRaw(outputPath.split(".")[0] ?? ""),
	];
	for (const candidate of candidates) {
		if (
			candidate === V2_MODEL_STREAM_EXECUTOR ||
			candidate === "Модельные стримы"
		) {
			return V2_MODEL_STREAM_EXECUTOR;
		}
	}

	const primary = resolvePrimaryStreamExecutorForTypicalWorkOutputPath(
		uiSchema,
		outputPath,
	);
	if (primary) return resolveLogicStreamDbExecutor(primary);

	return candidates[0] ?? null;
}

/** Роли платформы для блока typicalWork: явные ui:options.streamBlockRoles или корневой streamBlock. */
export function resolveStreamBlockRolesForTypicalWorkOutputPath(
	uiSchema: unknown,
	outputPath: string,
): V2StreamBlockRoleCode[] {
	const leaf = readUiBranchAtDotPath(uiSchema, outputPath);
	const explicit = normalizeStreamBlockRoles(
		readV2AnketaSectionUiOptions(leaf).streamBlockRoles,
	);
	if (explicit.length > 0) return explicit;

	const rootKey = outputPath.split(".")[0]?.trim();
	if (!rootKey) return [];
	return resolveV2AnketaStreamBlockOptions(
		readRecord(readRecord(uiSchema)?.[rootKey]),
		rootKey,
	).streamBlockRoles;
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
			inferLegacyStreamBlockExecutorCode(root)
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

export type AnketaSectionWorkflowBinding =
	| { kind: "main"; sectionId: V2AnketaMainSectionId }
	| { kind: "panel"; pathKey: string }
	| { kind: "none" };

/**
 * Привязка секции к workflow: канонические корневые разделы — `workflow.sections`,
 * кастомные streamBlock / скопированные панели — `workflow.panelSections[pathKey]`.
 * Явный `workflowSectionId`, не совпадающий с ключом блока, игнорируется.
 */
export function resolveAnketaSectionWorkflowBinding(
	pathKey: string,
	uiOptions: Pick<
		V2AnketaSectionUiOptions,
		| "workflowSectionId"
		| "streamBlock"
		| "groupActivatable"
		| "sectionRole"
	>,
): AnketaSectionWorkflowBinding {
	const trimmed = pathKey.trim();
	if (!trimmed) return { kind: "none" };

	const rootKey = trimmed.split(".")[0] ?? "";
	if (trimmed === rootKey && isV2AnketaMainSectionId(rootKey)) {
		return { kind: "main", sectionId: rootKey };
	}

	const panelWorkflowEligible =
		uiOptions.streamBlock === true ||
		uiOptions.groupActivatable === true ||
		uiOptions.sectionRole === "main";

	if (panelWorkflowEligible) {
		return { kind: "panel", pathKey: trimmed };
	}

	if (
		uiOptions.workflowSectionId &&
		trimmed === uiOptions.workflowSectionId
	) {
		return { kind: "main", sectionId: uiOptions.workflowSectionId };
	}

	return { kind: "none" };
}

export function resolveV2AnketaSectionTitleVariant(
	uiNode: unknown,
	fallback: V2AnketaSectionTitleVariant = "h6",
): V2AnketaSectionTitleVariant {
	const opts = readV2AnketaSectionUiOptions(uiNode);
	return opts.titleVariant ?? fallback;
}

function readUiRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

/**
 * Обязательные цели workflow для кнопки «Завершить заполнение анкеты»:
 * корневые секции uiSchema с привязкой к workflow (main/panel),
 * кроме деактивированных `groupActivatable` групп.
 */
export function collectRequiredWorkflowTargets(
	uiSchema: unknown,
	formData?: Record<string, unknown> | null,
): V2AnketaRequiredWorkflowTarget[] {
	const root = readUiRecord(uiSchema);
	if (!root) return [];

	const activation = readUiRecord(formData?.groupActivation) ?? {};
	const out: V2AnketaRequiredWorkflowTarget[] = [];
	const seen = new Set<string>();

	for (const key of Object.keys(root)) {
		if (key.startsWith("ui:")) continue;
		const node = root[key];
		const opts = readV2AnketaSectionUiOptions(node);
		if (opts.groupActivatable) {
			const active =
				key in activation
					? activation[key] === true
					: opts.groupActive !== false;
			if (!active) continue;
		}

		const binding = resolveAnketaSectionWorkflowBinding(key, opts);
		if (binding.kind === "none") continue;

		const dedupeKey =
			binding.kind === "main"
				? `main:${binding.sectionId}`
				: `panel:${binding.pathKey}`;
		if (seen.has(dedupeKey)) continue;
		seen.add(dedupeKey);
		out.push(binding);
	}

	return out;
}

export { STREAM_SECTION_IDS as V2_ANKETA_STREAM_SECTION_IDS };
