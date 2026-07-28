import type { V2AnketaGlobalStatus } from "./v2-anketa-workflow.types";
import type { V2QuestionnaireStatus } from "./v2-questionnaire.types";
import {
	normalizeV2UserGroups,
	resolveV2UserScopedStreamsFromGroups,
} from "./v2-user-stream-mapping.util";
import {
	V2_IMPLEMENTATION_STREAM_LABELS,
	type V2ImplementationStreamCode,
} from "./v2-implementation-streams.util";

/**
 * Роли, которым доступно удаление/деактивация анкеты (карточка + реестр).
 * По живому SUMD: ds_lead / modelops_lead / sacfg / sarep.
 * DE / modelops (executor) — без удаления.
 */
export const V2_QUESTIONNAIRE_DELETE_ROLE_CODES = [
	"ds_lead",
	"modelops_lead",
	"sacfg",
	"sarep",
] as const;

export type V2QuestionnaireDeleteAction = "hard_delete" | "deactivate";

export type V2QuestionnaireDeleteDenyReason =
	| "forbidden"
	| "wrong_stream"
	| "already_inactive";

function readImplementationStream(formData: unknown): string | undefined {
	if (!formData || typeof formData !== "object") return undefined;
	const generalInfo = (formData as Record<string, unknown>).generalInfo;
	if (!generalInfo || typeof generalInfo !== "object") return undefined;
	const raw = (generalInfo as Record<string, unknown>).implementationStream;
	if (typeof raw === "string" && raw.trim()) return raw.trim();
	return undefined;
}

function streamMatchesScope(
	stream: string,
	scope: readonly V2ImplementationStreamCode[],
): boolean {
	const needle = stream.trim().toLowerCase();
	for (const code of scope) {
		if (code.toLowerCase() === needle) return true;
		if (V2_IMPLEMENTATION_STREAM_LABELS[code].toLowerCase() === needle) {
			return true;
		}
	}
	return false;
}

export function userHasV2QuestionnaireDeleteRole(
	userGroups: readonly string[],
): boolean {
	const normalized = normalizeV2UserGroups(userGroups);
	return V2_QUESTIONNAIRE_DELETE_ROLE_CODES.some((role) =>
		normalized.includes(role),
	);
}

/**
 * Можно ли пользователю удалить/деактивировать анкету (роль + стрим).
 * sacfg — все стримы; ds_lead / modelops_lead / sarep — свой стрим
 * (если стримы из groups не извлечены — разрешаем, как у lead без AD-суффикса).
 */
export function canUserDeleteV2Questionnaire(
	userGroups: readonly string[],
	formData: unknown,
): { ok: true } | { ok: false; reason: V2QuestionnaireDeleteDenyReason } {
	const normalized = normalizeV2UserGroups(userGroups);
	if (!userHasV2QuestionnaireDeleteRole(userGroups)) {
		return { ok: false, reason: "forbidden" };
	}
	if (normalized.includes("sacfg")) {
		return { ok: true };
	}

	const scope = resolveV2UserScopedStreamsFromGroups(userGroups);
	if (scope.length === 0) {
		return { ok: true };
	}
	const stream = readImplementationStream(formData);
	/**
	 * Черновик/анкета без стрима: лид с известным scope всё равно может удалить
	 * (иначе UI показывает кнопку, а API отвечает wrong_stream).
	 */
	if (!stream) {
		return { ok: true };
	}
	if (!streamMatchesScope(stream, scope)) {
		return { ok: false, reason: "wrong_stream" };
	}
	return { ok: true };
}

/** Черновик → полное удаление; Заполнено/Утверждена → неактивная запись. */
export function resolveV2QuestionnaireDeleteAction(
	workflowGlobalStatus: V2AnketaGlobalStatus | string | null | undefined,
	entityStatus: V2QuestionnaireStatus,
):
	| { action: V2QuestionnaireDeleteAction }
	| { action: "deny"; reason: V2QuestionnaireDeleteDenyReason } {
	if (entityStatus === "inactive" || entityStatus === "archived") {
		return { action: "deny", reason: "already_inactive" };
	}
	if (
		workflowGlobalStatus == null ||
		workflowGlobalStatus === "" ||
		workflowGlobalStatus === "Черновик"
	) {
		return { action: "hard_delete" };
	}
	return { action: "deactivate" };
}
