export declare const V2_GROUP_ACTIVATION_FORM_KEY = "groupActivation";
export declare function readGroupActivationMap(formData: Record<string, unknown> | undefined | null): Record<string, boolean>;
export declare function writeGroupActivationMap(formData: Record<string, unknown>, activation: Record<string, boolean>): Record<string, unknown>;
export declare function setGroupActivationAtPath(formData: Record<string, unknown>, pathKey: string, active: boolean): Record<string, unknown>;
/** Значения по умолчанию для групп с `groupActivatable` (из uiSchema). */
export declare function collectActivatableGroupDefaults(uiSchema: unknown): Record<string, boolean>;
/** Дополняет `groupActivation` в formData значениями по умолчанию из uiSchema. */
export declare function ensureGroupActivationDefaults(formData: Record<string, unknown>, uiSchema: unknown): Record<string, unknown>;
/** Активна ли группа в форме (с учётом uiSchema и `groupActivation`). */
export declare function resolveGroupIsActive(pathKey: string, uiSchema: unknown, formData: Record<string, unknown> | undefined | null): boolean;
/** Ближайший предок с `groupActivatable` и явным `groupActive: false`. */
export declare function findTriggerGatedGroupActivatableAncestor(uiSchema: unknown, typicalWorkPath: string): string | null;
/**
 * Секции с `groupActivatable` + `groupActive: false`, внутри которых есть
 * блок типовых работ — включаются/выключаются по факту генерации строк.
 */
export declare function syncTriggerGatedGroupActivationFromTypicalWorks(formData: Record<string, unknown>, uiSchema: unknown, liveFormData?: Record<string, unknown> | null): Record<string, unknown>;
/** Участвует ли путь в расчёте (не под неактивной группой). */
export declare function isCalculationPathActive(formData: Record<string, unknown>, pointer: string): boolean;
