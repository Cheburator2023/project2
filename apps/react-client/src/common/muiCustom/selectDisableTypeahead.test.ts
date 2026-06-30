import { describe, expect, it, vi } from "vitest";
import { selectDisableTypeaheadMenuProps } from "./selectDisableTypeahead";

describe("selectDisableTypeaheadMenuProps", () => {
	it("blocks printable key propagation in menu list", () => {
		const props = selectDisableTypeaheadMenuProps();
		const stop = vi.fn();
		const event = {
			key: "с",
			ctrlKey: false,
			metaKey: false,
			altKey: false,
			stopPropagation: stop,
		} as unknown as React.KeyboardEvent;
		props.MenuListProps?.onKeyDown?.(event);
		expect(stop).toHaveBeenCalled();
	});

	it("allows arrow keys", () => {
		const props = selectDisableTypeaheadMenuProps();
		const stop = vi.fn();
		const event = {
			key: "ArrowDown",
			ctrlKey: false,
			metaKey: false,
			altKey: false,
			stopPropagation: stop,
		} as unknown as React.KeyboardEvent;
		props.MenuListProps?.onKeyDown?.(event);
		expect(stop).not.toHaveBeenCalled();
	});
});
