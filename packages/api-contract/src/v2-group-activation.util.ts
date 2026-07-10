import { readV2AnketaSectionUiOptions } from "./v2-anketa-section-ui.util";
import { collectGeneratedTypicalWorkArrayPaths } from "./v2-typical-work-output-paths.util";

export const V2_GROUP_ACTIVATION_FORM_KEY = "groupActivation";

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

export function readGroupActivationMap(
	formData: Record<string, unknown> | undefined | null,
): Record<string, boolean> {
	const raw = readRecord(formData)?.[V2_GROUP_ACTIVATION_FORM_KEY];
	const map = readRecord(raw);
	if (!map) return {};
	const out: Record<string, boolean> = {};
	for (const [key, value] of Object.entries(map)) {
		if (typeof value === "boolean") out[key] = value;
	}
	return out;
}

export function writeGroupActivationMap(
	formData: Record<string, unknown>,
	activation: Record<string, boolean>,
): Record<string, unknown> {
	return {
		...formData,
		[V2_GROUP_ACTIVATION_FORM_KEY]: { ...activation },
	};
}

export function setGroupActivationAtPath(
	formData: Record<string, unknown>,
	pathKey: string,
	active: boolean,
): Record<string, unknown> {
	const prev = readGroupActivationMap(formData);
	return writeGroupActivationMap(formData, { ...prev, [pathKey]: active });
}

function readUiNodeAtPath(
	uiSchema: unknown,
	pathKey: string,
): unknown {
	if (!pathKey) return uiSchema;
	const segments = pathKey.split(".").filter(Boolean);
	let cur: unknown = uiSchema;
	for (const seg of segments) {
		const node = readRecord(cur);
		if (!node) return undefined;
		cur = node[seg];
	}
	return cur;
}

/** Значения по умолчанию для групп с `groupActivatable` (из uiSchema). */
export function collectActivatableGroupDefaults(
	uiSchema: unknown,
): Record<string, boolean> {
	const out: Record<string, boolean> = {};

	const walk = (node: unknown, segments: string[]) => {
		const opts = readV2AnketaSectionUiOptions(node);
		const pathKey = segments.join(".");
		if (opts.groupActivatable && pathKey) {
			out[pathKey] = opts.groupActive !== false;
		}
		const branch = readRecord(node);
		if (!branch) return;
		for (const key of Object.keys(branch)) {
			if (key.startsWith("ui:")) continue;
			walk(branch[key], [...segments, key]);
		}
	};

	walk(uiSchema, []);
	return out;
}

/** Дополняет `groupActivation` в formData значениями по умолчанию из uiSchema. */
export function ensureGroupActivationDefaults(
	formData: Record<string, unknown>,
	uiSchema: unknown,
): Record<string, unknown> {
	const defaults = collectActivatableGroupDefaults(uiSchema);
	const current = readGroupActivationMap(formData);
	let changed = false;
	const next = { ...current };
	for (const [path, defaultActive] of Object.entries(defaults)) {
		if (next[path] === undefined) {
			next[path] = defaultActive;
			changed = true;
		}
	}
	return changed ? writeGroupActivationMap(formData, next) : formData;
}

/** Активна ли группа в форме (с учётом uiSchema и `groupActivation`). */
export function resolveGroupIsActive(
	pathKey: string,
	uiSchema: unknown,
	formData: Record<string, unknown> | undefined | null,
): boolean {
	let uiNode = readUiNodeAtPath(uiSchema, pathKey);
	let opts = readV2AnketaSectionUiOptions(uiNode);
	if (!opts.groupActivatable) {
		opts = readV2AnketaSectionUiOptions(uiSchema);
	}
	if (!opts.groupActivatable) return true;
	const map = readGroupActivationMap(formData);
	if (pathKey in map) return map[pathKey] === true;
	return opts.groupActive !== false;
}

function readByDotPath(data: Record<string, unknown>, dotPath: string): unknown {
	const segments = dotPath.split(".").filter(Boolean);
	let current: unknown = data;
	for (const segment of segments) {
		const obj = readRecord(current);
		if (!obj) return undefined;
		current = obj[segment];
	}
	return current;
}

function hasGeneratedTypicalWorkRows(
	liveFormData: Record<string, unknown> | undefined | null,
	path: string,
): boolean {
	if (!liveFormData) return false;
	const value = readByDotPath(liveFormData, path);
	return Array.isArray(value) && value.length > 0;
}

/** Ближайший предок с `groupActivatable` и явным `groupActive: false`. */
export function findTriggerGatedGroupActivatableAncestor(
	uiSchema: unknown,
	typicalWorkPath: string,
): string | null {
	const segments = typicalWorkPath.split(".").filter(Boolean);
	for (let len = segments.length - 1; len >= 1; len--) {
		const pathKey = segments.slice(0, len).join(".");
		const opts = readV2AnketaSectionUiOptions(
			readUiNodeAtPath(uiSchema, pathKey),
		);
		if (opts.groupActivatable === true && opts.groupActive === false) {
			return pathKey;
		}
	}
	return null;
}

/**
 * Секции с `groupActivatable` + `groupActive: false`, внутри которых есть
 * блок типовых работ — включаются/выключаются по факту генерации строк.
 */
export function syncTriggerGatedGroupActivationFromTypicalWorks(
	formData: Record<string, unknown>,
	uiSchema: unknown,
	liveFormData?: Record<string, unknown> | null,
): Record<string, unknown> {
	const typicalWorkPaths = collectGeneratedTypicalWorkArrayPaths(uiSchema);
	if (typicalWorkPaths.length === 0) return formData;

	const groupToTypicalPaths = new Map<string, string[]>();
	for (const typicalPath of typicalWorkPaths) {
		const groupPath = findTriggerGatedGroupActivatableAncestor(
			uiSchema,
			typicalPath,
		);
		if (!groupPath) continue;
		const list = groupToTypicalPaths.get(groupPath) ?? [];
		list.push(typicalPath);
		groupToTypicalPaths.set(groupPath, list);
	}
	if (groupToTypicalPaths.size === 0) return formData;

	const prev = readGroupActivationMap(formData);
	let changed = false;
	const next = { ...prev };

	for (const [groupPath, paths] of groupToTypicalPaths) {
		const shouldBeActive = paths.some((path) =>
			hasGeneratedTypicalWorkRows(liveFormData, path),
		);
		if (next[groupPath] !== shouldBeActive) {
			next[groupPath] = shouldBeActive;
			changed = true;
		}
	}

	return changed ? writeGroupActivationMap(formData, next) : formData;
}

/** Участвует ли путь в расчёте (не под неактивной группой). */
export function isCalculationPathActive(
	formData: Record<string, unknown>,
	pointer: string,
): boolean {
	const dotPath = pointer
		.replace(/^\//, "")
		.split("/")
		.filter(Boolean)
		.join(".");
	if (!dotPath) return true;

	const activation = readGroupActivationMap(formData);
	for (const [groupPath, active] of Object.entries(activation)) {
		if (active !== false) continue;
		if (dotPath === groupPath || dotPath.startsWith(`${groupPath}.`)) {
			return false;
		}
	}
	return true;
}
