// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { V2_QUESTIONNAIRES_LIST_KEY } from "@react-client/common/api/queries/v2-questionnaire-registry-cache";
import type { V2QuestionnaireRegistrySyncPayload } from "@smart-anketa/api-contract";
import { useV2QuestionnaireRegistrySync } from "./useV2QuestionnaireRegistrySync";

const registryListeners = new Set<
	(payload: V2QuestionnaireRegistrySyncPayload) => void
>();

vi.mock("../utils/v2EditLockSocket", () => ({
	subscribeV2QuestionnaireRegistrySync: (
		listener: (payload: V2QuestionnaireRegistrySyncPayload) => void,
	) => {
		registryListeners.add(listener);
		return () => {
			registryListeners.delete(listener);
		};
	},
}));

describe("useV2QuestionnaireRegistrySync", () => {
	it("refetches the registry list when another user creates a questionnaire", () => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		const invalidate = vi.spyOn(queryClient, "invalidateQueries");
		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);

		renderHook(() => useV2QuestionnaireRegistrySync(), { wrapper });
		for (const listener of registryListeners) {
			listener({ at: Date.now() });
		}

		expect(invalidate).toHaveBeenCalledWith({
			queryKey: V2_QUESTIONNAIRES_LIST_KEY,
		});
	});
});
