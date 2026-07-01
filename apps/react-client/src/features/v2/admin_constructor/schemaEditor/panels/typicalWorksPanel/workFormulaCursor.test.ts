import { describe, expect, it } from "vitest";
import { cursorAfterTokenDelete } from "./workFormulaCursor";

describe("cursorAfterTokenDelete", () => {
	it("keeps cursor after deleting the previous token on backspace", () => {
		expect(cursorAfterTokenDelete(0, 1)).toBe(0);
		expect(cursorAfterTokenDelete(1, 2)).toBe(1);
		expect(cursorAfterTokenDelete(1, 3)).toBe(2);
	});

	it("keeps cursor when deleting the token under the caret (Delete)", () => {
		expect(cursorAfterTokenDelete(1, 1)).toBe(1);
		expect(cursorAfterTokenDelete(2, 2)).toBe(2);
	});
});
