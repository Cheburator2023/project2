import {
	modalKindForPathFromBindings,
	resolveV2AnketaEditorBindings,
	type V2AnketaEditorBindings,
	type V2AnketaModalKind,
} from "@smart-anketa/api-contract";

export type AnketaModalKind = V2AnketaModalKind;

/** Dot-путь объекта с модалкой (из схемы). */
export type AnketaModalObjectPath = string;

/** Dot-путь массива с компактной таблицей (из схемы). */
export type AnketaCompactArrayTablePath = string;

export type AnketaFormModalBindingSets = {
	hiddenRootKeys: string[];
	modalArrayPathSet: ReadonlySet<string>;
	readonlyArrayTablePathSet: ReadonlySet<string>;
	compactArrayTablePathSet: ReadonlySet<string>;
	modalObjectPathSet: ReadonlySet<string>;
	bindings: V2AnketaEditorBindings;
};

export function resolveAnketaFormModalBindingSets(
	jsonSchema: Record<string, unknown>,
	uiSchema: Record<string, unknown>,
): AnketaFormModalBindingSets {
	const bindings = resolveV2AnketaEditorBindings(jsonSchema, uiSchema);
	return {
		hiddenRootKeys: bindings.hiddenRootKeys,
		modalArrayPathSet: new Set(bindings.modalArrayPaths),
		readonlyArrayTablePathSet: new Set(bindings.readonlyArrayTablePaths),
		compactArrayTablePathSet: new Set([
			...bindings.modalArrayPaths,
			...bindings.readonlyArrayTablePaths,
		]),
		modalObjectPathSet: new Set(bindings.modalObjectPaths),
		bindings,
	};
}

export function modalKindForPath(
	path: string,
	bindings: V2AnketaEditorBindings,
): AnketaModalKind | null {
	return modalKindForPathFromBindings(path, bindings);
}

export function isReadonlyArrayTablePath(
	path: string,
	readonlySet: ReadonlySet<string>,
): boolean {
	return readonlySet.has(path);
}
