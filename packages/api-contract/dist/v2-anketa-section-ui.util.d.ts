import { type V2ExecutorStreamLabel } from "./v2-executor-streams.util";
import { type V2AnketaMainSectionId } from "./v2-anketa-workflow.types";
export declare const V2_ANKETA_SECTION_ROLE_VALUES: readonly ["main", "subsection", "panel", "flat"];
export type V2AnketaSectionRole = (typeof V2_ANKETA_SECTION_ROLE_VALUES)[number];
export type V2AnketaSectionTitleVariant = "h5" | "h6";
/**
 * Архитектурные компоненты (глоссарий, §3.4) — типовые структурные элементы
 * функциональных областей анкеты. Состав фиксирован, но расширяем.
 * Параметры арх. компонента одновременно являются триггерами генерации
 * типовых работ из справочника.
 */
export declare const V2_ARCH_COMPONENT_TYPES: readonly ["modelService", "model", "sourceSystem", "dataMart", "dataProcess", "deployChannel", "modelControl", "typicalWork", "atypicalWork"];
export type V2ArchComponentType = (typeof V2_ARCH_COMPONENT_TYPES)[number];
/** Человекочитаемые названия арх. компонентов (из глоссария). */
export declare const V2_ARCH_COMPONENT_LABELS: Record<V2ArchComponentType, string>;
export declare function isV2ArchComponentType(value: unknown): value is V2ArchComponentType;
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
declare const STREAM_SECTION_IDS: V2AnketaMainSectionId[];
export declare function readV2AnketaSectionUiOptions(uiNode: unknown): V2AnketaSectionUiOptions;
export type V2AnketaStreamBlockOptions = {
    streamBlock: boolean;
    streamExecutor: V2ExecutorStreamLabel | null;
};
/** Явная или legacy-привязка корневого блока к стриму-исполнителю. */
export declare function resolveV2AnketaStreamBlockOptions(uiNode: unknown, blockKey?: string): V2AnketaStreamBlockOptions;
export declare function isV2AnketaStreamBlockRoot(uiNode: unknown, blockKey?: string): boolean;
export declare const V2_STREAM_BLOCK_TITLE_PREFIX = "\u0421\u0442\u0440\u0438\u043C ";
/** Уже оформленный заголовок стрима (заводской снепшот: «Стрим «…»», новый: «Стрим …»). */
export declare function hasV2StreamBlockTitlePrefix(title: string): boolean;
/** Заголовок стримового object-блока (идемпотентно, в стиле заводского снепшота). */
export declare function formatV2StreamBlockSectionTitle(baseTitle: string): string;
/** Заголовок секции с учётом streamBlock (явный, legacy stream* / field_* ключ). */
export declare function resolveV2AnketaSectionDisplayTitle(baseTitle: string, uiNode: unknown, blockKey?: string): string;
export type ExecutorStreamBlockRef = {
    blockKey: string;
    pointer: string;
    streamExecutor: V2ExecutorStreamLabel;
};
/** Корневые стримовые блоки анкеты из uiSchema. */
export declare function collectExecutorStreamBlocks(uiSchema: unknown): ExecutorStreamBlockRef[];
export declare function collectPresentExecutorStreamLabels(uiSchema: unknown): Set<V2ExecutorStreamLabel>;
/** Есть ли в конструкторе корневой streamBlock для стрима (legacy-имена БД → область UI). */
export declare function isExecutorStreamPresentInSchema(uiSchema: unknown, stream: string): boolean;
/**
 * Стрим-исполнитель для блока typicalWork: явный ui:options.streamExecutor,
 * иначе стрим корневого streamBlock по пути вывода.
 */
export declare function resolveStreamExecutorForTypicalWorkOutputPath(uiSchema: unknown, outputPath: string): V2ExecutorStreamLabel | null;
/** Тип арх. компонента секции из ui:options, либо null. */
export declare function resolveV2AnketaArchComponent(uiNode: unknown): V2ArchComponentType | null;
export declare function isV2AnketaMainSectionId(value: string): value is V2AnketaMainSectionId;
export declare function isV2AnketaStreamSectionId(value: string): value is V2AnketaMainSectionId;
/** Роль секции: явно из ui:options или эвристика для старых схем без layout. */
export declare function resolveV2AnketaSectionRole(uiNode: unknown, path: string[]): V2AnketaSectionRole;
export declare function resolveV2AnketaDefaultExpanded(uiNode: unknown, path: string[], role: V2AnketaSectionRole): boolean;
export declare function resolveV2AnketaWorkflowSectionId(uiNode: unknown, path: string[]): V2AnketaMainSectionId | null;
export declare function resolveV2AnketaSectionTitleVariant(uiNode: unknown, fallback?: V2AnketaSectionTitleVariant): V2AnketaSectionTitleVariant;
export { STREAM_SECTION_IDS as V2_ANKETA_STREAM_SECTION_IDS };
