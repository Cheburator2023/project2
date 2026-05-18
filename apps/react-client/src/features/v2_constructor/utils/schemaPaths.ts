/** Нормализует пользовательский путь к виду `/a/b`. Для корня возвращает `/`. */
export function normalizeJsonPointer(raw: string): string {
	const t = raw.trim();
	if (!t || t === "/") return "/";
	return t.startsWith("/") ? t : `/${t}`;
}

/** JSON-pointer-like path: `/person/name` или `/`. */
export function pointerSegments(pointer: string): string[] {
	if (!pointer || pointer === "/") return [];
	return pointer.replace(/^\//, "").split("/").filter(Boolean);
}

export function pointerLabel(pointer: string): string {
	const s = pointerSegments(pointer);
	return s.length > 0 ? s[s.length - 1]! : "корень";
}

export function joinPointer(parent: string | null, key: string): string {
	if (!parent || parent === "/") return `/${key}`;
	return `${parent.replace(/\/$/, "")}/${key}`;
}

export type ParentPointer = {
	parentSegments: string[];
	key: string;
};

export function parentOfPointer(pointer: string): ParentPointer | null {
	const s = pointerSegments(pointer);
	if (s.length === 0) return null;
	const key = s[s.length - 1]!;
	return { parentSegments: s.slice(0, -1), key };
}

/**
 * Путь в объекте formData для JsonLogic `{"var": "a.b.c"}` (точечная нотация).
 * JSON Pointer `/a/b` → `a.b`. Для `/` или пустого — пустая строка.
 */
export function jsonPointerToFormDataVarPath(pointer: string): string {
	return pointerSegments(pointer).join(".");
}
