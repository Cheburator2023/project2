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
