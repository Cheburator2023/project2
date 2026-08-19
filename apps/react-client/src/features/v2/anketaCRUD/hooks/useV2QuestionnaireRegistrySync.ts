import { invalidateV2QuestionnaireRegistry } from "@react-client/common/api/queries/v2-questionnaire-registry-cache";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { subscribeV2QuestionnaireRegistrySync } from "../utils/v2EditLockSocket";

/**
 * Чужой create/copy/delete не попадает в interceptor этого браузера.
 * Без WS список остаётся свежим 5 минут.
 */
export function useV2QuestionnaireRegistrySync() {
	const queryClient = useQueryClient();
	useEffect(() => {
		return subscribeV2QuestionnaireRegistrySync(() => {
			invalidateV2QuestionnaireRegistry(queryClient, {
				includeConfig: false,
			});
		});
	}, [queryClient]);
}
