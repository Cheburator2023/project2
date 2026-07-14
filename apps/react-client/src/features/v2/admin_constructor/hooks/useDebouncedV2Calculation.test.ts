// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDebouncedV2Calculation } from "./useDebouncedV2Calculation";

const mutateAsync = vi.fn().mockResolvedValue({ formData: {} });

vi.mock("@react-client/common/api/queries/v2-templates", () => ({
	useCalculateV2Template: () => ({
		mutateAsync,
		isPending: false,
	}),
}));

describe("useDebouncedV2Calculation", () => {
	afterEach(() => {
		vi.useRealTimers();
		mutateAsync.mockClear();
	});

	it("recalculates when revision changes with unchanged formData", async () => {
		vi.useFakeTimers();
		const formData = { field: "value" };
		const { rerender } = renderHook(
			({ revision }) =>
				useDebouncedV2Calculation({
					templateId: "template-1",
					versionId: "version-1",
					formData,
					revision,
					debounceMs: 10,
				}),
			{ initialProps: { revision: 0 } },
		);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(10);
		});
		expect(mutateAsync).toHaveBeenCalledTimes(1);

		rerender({ revision: 1 });
		await act(async () => {
			await vi.advanceTimersByTimeAsync(10);
		});
		expect(mutateAsync).toHaveBeenCalledTimes(2);
		expect(mutateAsync.mock.calls[1]?.[0].dto.formData).toBe(formData);
	});
});
