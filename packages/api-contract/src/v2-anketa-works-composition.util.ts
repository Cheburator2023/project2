import { collectGeneratedTypicalWorkArrayPaths } from "./v2-typical-work-output-paths.util";

function readArrayAtDotPath(
	data: unknown,
	dotPath: string,
): Record<string, unknown>[] {
	let cur: unknown = data;
	for (const key of dotPath.split(".").filter(Boolean)) {
		if (!cur || typeof cur !== "object" || Array.isArray(cur)) return [];
		cur = (cur as Record<string, unknown>)[key];
	}
	if (!Array.isArray(cur)) return [];
	return cur.filter(
		(item): item is Record<string, unknown> =>
			item != null && typeof item === "object" && !Array.isArray(item),
	);
}

function workIdFingerprint(rows: readonly Record<string, unknown>[]): string {
	const ids = rows
		.map((row) => {
			const id = row.workId;
			return typeof id === "string" ? id.trim() : "";
		})
		.filter(Boolean)
		.sort();
	return ids.join(",");
}

/** Отпечаток состава типовых работ по path (набор workId). */
export function fingerprintTypicalWorksCompositionAtPath(
	formData: unknown,
	outputPath: string,
): string {
	return workIdFingerprint(readArrayAtDotPath(formData, outputPath));
}

/**
 * Paths типовых работ, у которых изменился набор workId между двумя formData.
 */
export function listChangedTypicalWorkCompositionPaths(
	previousFormData: unknown,
	nextFormData: unknown,
	uiSchema: unknown,
): string[] {
	const paths = collectGeneratedTypicalWorkArrayPaths(uiSchema);
	const changed: string[] = [];
	for (const path of paths) {
		const prev = fingerprintTypicalWorksCompositionAtPath(
			previousFormData,
			path,
		);
		const next = fingerprintTypicalWorksCompositionAtPath(nextFormData, path);
		if (prev !== next) changed.push(path);
	}
	return changed;
}
