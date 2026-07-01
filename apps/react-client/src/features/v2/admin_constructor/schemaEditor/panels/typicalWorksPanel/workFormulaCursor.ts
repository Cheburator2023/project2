/** Позиция каретки в ленте после удаления токена с индексом deletedIndex. */
export function cursorAfterTokenDelete(
	deletedIndex: number,
	cursorBefore: number,
): number {
	if (cursorBefore <= deletedIndex) return cursorBefore;
	return cursorBefore - 1;
}
