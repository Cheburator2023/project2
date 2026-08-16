import {
	flattenV2RegistryColumnTree,
	getByFormPath,
	type V2RegistryColumnNode,
} from "./v2-questionnaire-registry-columns.util";

/** Поля formData, нужные реестру вне колонок схемы (чипы workflow, удаление по стриму). */
const REGISTRY_FORM_DATA_ALWAYS_PATHS = [
	"workflow",
	"generalInfo.implementationStream",
] as const;

const REGISTRY_FORM_DATA_OMIT_KEYS = new Set(["formulaBreakdown"]);

export function collectV2RegistryFormPaths(
	columnTree: readonly V2RegistryColumnNode[],
): string[] {
	const paths: string[] = [];
	for (const leaf of flattenV2RegistryColumnTree(columnTree)) {
		if (leaf.formPath) paths.push(leaf.formPath);
	}
	return paths;
}

/**
 * formData для строки реестра: только пути колонок + workflow/стрим.
 * Типовые работы, формулы и прочие поля таблицы не читает — отбрасываются.
 */
export function pickV2QuestionnaireRegistryFormData(
	formData: Record<string, unknown> | null | undefined,
	formPaths: readonly string[],
): Record<string, unknown> {
	const source = formData ?? {};
	const out: Record<string, unknown> = {};
	const paths = new Set<string>([
		...REGISTRY_FORM_DATA_ALWAYS_PATHS,
		...formPaths,
	]);
	for (const path of paths) {
		const value = getByFormPath(source, path);
		if (value === undefined) continue;
		setByFormPath(out, path, omitRegistryHeavyValues(value));
	}
	return out;
}

function omitRegistryHeavyValues(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => omitRegistryHeavyValues(item));
	}
	if (value && typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(
			value as Record<string, unknown>,
		)) {
			if (REGISTRY_FORM_DATA_OMIT_KEYS.has(key)) continue;
			out[key] = omitRegistryHeavyValues(child);
		}
		return out;
	}
	return value;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function setByFormPath(
	target: Record<string, unknown>,
	path: string,
	value: unknown,
): void {
	const parts = path.split(".");
	let current: Record<string, unknown> = target;
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i]!;
		const isLast = i === parts.length - 1;
		const match = /^(\w+)\[(\d+)\]$/.exec(part);
		if (match) {
			const key = match[1]!;
			const index = Number.parseInt(match[2]!, 10);
			const existing = current[key];
			const arr = Array.isArray(existing) ? existing : [];
			if (!Array.isArray(existing)) current[key] = arr;
			if (isLast) {
				arr[index] = value;
				return;
			}
			if (!readRecord(arr[index])) {
				arr[index] = {};
			}
			current = arr[index] as Record<string, unknown>;
			continue;
		}
		if (isLast) {
			current[part] = value;
			return;
		}
		if (!readRecord(current[part])) {
			current[part] = {};
		}
		current = current[part] as Record<string, unknown>;
	}
}
