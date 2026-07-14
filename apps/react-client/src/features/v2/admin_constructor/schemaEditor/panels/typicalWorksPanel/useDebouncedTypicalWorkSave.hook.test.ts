// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDebouncedTypicalWorkSave } from "./useDebouncedTypicalWorkSave";

const mocks = vi.hoisted(() => ({
	mutateAsync: vi.fn(),
}));

vi.mock("@react-client/common/api/queries/v2-works", () => ({
	usePatchV2TypicalWork: () => ({
		mutateAsync: mocks.mutateAsync,
	}),
}));

vi.mock("./typicalWorkSaveBuffer", () => ({
	clearBufferedTypicalWorkPatch: vi.fn().mockResolvedValue(undefined),
	readBufferedTypicalWorkPatch: vi.fn().mockResolvedValue(undefined),
	saveBufferedTypicalWorkPatch: vi.fn().mockResolvedValue(undefined),
}));

describe("useDebouncedTypicalWorkSave", () => {
	afterEach(() => {
		vi.useRealTimers();
		mocks.mutateAsync.mockReset();
	});

	it("calls onSaved once after a successful patch", async () => {
		vi.useFakeTimers();
		mocks.mutateAsync.mockResolvedValue({});
		const onSaved = vi.fn();
		const { result } = renderHook(() =>
			useDebouncedTypicalWorkSave("work-1", "version-1", { onSaved }),
		);

		act(() => {
			result.current.scheduleSave({
				templateVersionId: "version-1",
				streamExecutor: "Источник",
				name: "Работа",
			});
		});
		await act(async () => {
			await vi.advanceTimersByTimeAsync(600);
		});

		expect(mocks.mutateAsync).toHaveBeenCalledTimes(1);
		expect(onSaved).toHaveBeenCalledTimes(1);
	});

	it("does not call onSaved after a failed patch", async () => {
		vi.useFakeTimers();
		mocks.mutateAsync.mockRejectedValue(new Error("failed"));
		const onSaved = vi.fn();
		const { result } = renderHook(() =>
			useDebouncedTypicalWorkSave("work-1", "version-1", { onSaved }),
		);

		act(() => {
			result.current.scheduleSave({
				templateVersionId: "version-1",
				streamExecutor: "Источник",
				name: "Работа",
			});
		});
		await act(async () => {
			await vi.advanceTimersByTimeAsync(600);
		});

		expect(onSaved).not.toHaveBeenCalled();
	});
});
