import {
	clearMfeAuthState,
} from "@react-client/common/auth/clearMfeAuthState";
import {
	ensureKeycloakSession,
	redirectToKeycloakLogin,
} from "@react-client/common/auth/syncMfeAuth";
import { queryClient } from "@react-client/common/api/queryClient";
import {
	subscribeAppSync,
	type AppQueryScope,
} from "./appBroadcast";

let registered = false;

function invalidateScope(scope: AppQueryScope, entityId?: string): void {
	switch (scope) {
		case "v2-templates":
			void queryClient.invalidateQueries({ queryKey: ["v2-templates"] });
			void queryClient.invalidateQueries({ queryKey: ["v2-works"] });
			break;
		case "v2-dictionaries":
			void queryClient.invalidateQueries({ queryKey: ["v2-dictionaries"] });
			break;
		case "v2-questionnaires":
			void queryClient.invalidateQueries({ queryKey: ["v2-questionnaires"] });
			break;
		case "tracker-lock":
			void queryClient.invalidateQueries({
				queryKey: entityId
					? ["kanbanBoardTaskLock", entityId]
					: ["kanbanBoardTaskLock"],
			});
			break;
		case "tracker":
			void queryClient.invalidateQueries({
				predicate: ({ queryKey }) =>
					typeof queryKey[0] === "string" &&
					queryKey[0].startsWith("kanbanBoard"),
			});
			break;
		case "v2-all":
			void queryClient.invalidateQueries({
				predicate: ({ queryKey }) =>
					typeof queryKey[0] === "string" &&
					(queryKey[0].startsWith("v2-") ||
						queryKey[0].startsWith("kanbanBoard")),
			});
			break;
	}
}

export function registerAppCrossTabHandlers(): void {
	if (registered || typeof window === "undefined") return;
	registered = true;

	subscribeAppSync((event) => {
		switch (event.type) {
			case "auth:logout":
				clearMfeAuthState();
				queryClient.clear();
				globalThis.setTimeout(() => {
					if (
						event.reason === "session-expired" ||
						event.reason === "refresh-failed"
					) {
						redirectToKeycloakLogin();
						return;
					}
					ensureKeycloakSession();
				}, 0);
				break;
			case "auth:session-changed":
				// Host/Keycloak владеет user и permissions: полная гидратация надёжнее
				// копирования security-sensitive данных через BroadcastChannel.
				globalThis.location.reload();
				break;
			case "query:invalidate":
				invalidateScope(event.scope, event.entityId);
				break;
			case "tracker:lock-changed":
				invalidateScope("tracker-lock", event.taskId);
				break;
			case "schema:server-version-changed":
				invalidateScope("v2-templates", event.templateId);
				break;
			case "settings:theme":
				// Применяется внутри MUI ThemeProvider в ColorModeIconDropdown.
				break;
		}
	});
}
