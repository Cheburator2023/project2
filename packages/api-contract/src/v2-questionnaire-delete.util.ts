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
 * 1-я итерация: ds_lead / modelops_lead / sacfg.
 * `sarep` (представитель стрима вне ЖЦМ) — без удаления.
 * DE / modelops (executor) — без удаления.
 */
export const V2_QUESTIONNAIRE_DELETE_ROLE_CODES = [
	"ds_lead",
	"modelops_lead",
	"sacfg",
] as const;

/**
 * Роли, которым доступно создание анкеты (реестр + API).
 * 1-я итерация: без `sarep` — только смотрит/правит свой стрим.
 */
export const V2_QUESTIONNAIRE_CREATE_ROLE_CODES = [
	"ds_lead",
	"modelops_lead",
	"sacfg",
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

export function userHasV2QuestionnaireCreateRole(
	userGroups: readonly string[],
): boolean {
	const normalized = normalizeV2UserGroups(userGroups);
	return V2_QUESTIONNAIRE_CREATE_ROLE_CODES.some((role) =>
		normalized.includes(role),
	);
}

/**
 * Создание анкеты: KK-permission + allow-list доменных ролей
 * (`ds_lead` / `modelops_lead` / `sacfg`), как у удаления.
 * `sarep` (digagt / mdlctl / strdat / idsrc / …) и прочие роли — запрет,
 * даже если в Keycloak ошибочно выдана create-permission.
 * Пустые groups (god / NO_ROLES без AD) — не блокируем, решает permission.
 */
export function userCanCreateV2Questionnaire(
	userGroups: readonly string[],
	hasCreatePermission: boolean,
): boolean {
	if (!hasCreatePermission) return false;
	const normalized = normalizeV2UserGroups(userGroups);
	if (normalized.length === 0) return true;
	return userHasV2QuestionnaireCreateRole(userGroups);
}

/**
 * Можно ли пользователю удалить/деактивировать анкету (роль + стрим).
 * sacfg — все стримы; ds_lead / modelops_lead — свой стрим
 * (если стримы из groups не извлечены — разрешаем, как у lead без AD-суффикса).
 * Пустые groups (god / NO_ROLES без AD) — как у create: не блокируем по роли.
 */
export function canUserDeleteV2Questionnaire(
	userGroups: readonly string[],
	formData: unknown,
): { ok: true } | { ok: false; reason: V2QuestionnaireDeleteDenyReason } {
	const normalized = normalizeV2UserGroups(userGroups);
	if (normalized.length === 0) {
		return { ok: true };
	}
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

/**
 * Неутверждённые (Черновик / Заполнено / …) → полное удаление.
 * Утверждённые → деактивация (срез сохраняется).
 */
export function resolveV2QuestionnaireDeleteAction(
	workflowGlobalStatus: V2AnketaGlobalStatus | string | null | undefined,
	entityStatus: V2QuestionnaireStatus,
):
	| { action: V2QuestionnaireDeleteAction }
	| { action: "deny"; reason: V2QuestionnaireDeleteDenyReason } {
	if (entityStatus === "inactive" || entityStatus === "archived") {
		return { action: "deny", reason: "already_inactive" };
	}
	if (workflowGlobalStatus === "Утверждена") {
		return { action: "deactivate" };
	}
	return { action: "hard_delete" };
}

export type V2QuestionnaireDeleteSelectionKind =
	| "hard_delete"
	| "deactivate"
	| "mixed"
	| "none";

export type V2QuestionnaireDeleteSelectionSummary = {
	kind: V2QuestionnaireDeleteSelectionKind;
	hardDeleteCount: number;
	deactivateCount: number;
};

export type V2QuestionnaireDeleteSelectionRow = {
	workflowGlobalStatus?: string | null;
	status?: string | null;
};

/** Разбивка выбранных анкет: удалить / деактивировать (ДАДМ). */
export function summarizeV2QuestionnaireDeleteSelection(
	rows: readonly V2QuestionnaireDeleteSelectionRow[],
	dadmEnabled: boolean,
): V2QuestionnaireDeleteSelectionSummary {
	let hardDeleteCount = 0;
	let deactivateCount = 0;
	for (const row of rows) {
		const resolved = resolveV2QuestionnaireDeleteAction(
			row.workflowGlobalStatus,
			(row.status as V2QuestionnaireStatus) ?? "active",
		);
		if (resolved.action === "deny") continue;
		if (!dadmEnabled || resolved.action === "hard_delete") {
			hardDeleteCount += 1;
		} else {
			deactivateCount += 1;
		}
	}
	const kind: V2QuestionnaireDeleteSelectionKind =
		hardDeleteCount === 0 && deactivateCount === 0
			? "none"
			: hardDeleteCount > 0 && deactivateCount > 0
				? "mixed"
				: deactivateCount > 0
					? "deactivate"
					: "hard_delete";
	return { kind, hardDeleteCount, deactivateCount };
}

export type V2QuestionnaireDeleteUiCopy = {
	button: string;
	menu: string;
	dialogTitle: string;
	dialogBody: string;
	confirm: string;
	tooltip: string;
};

export function v2QuestionnaireDeleteUiCopy(
	summary: V2QuestionnaireDeleteSelectionSummary,
): V2QuestionnaireDeleteUiCopy {
	const n = summary.hardDeleteCount + summary.deactivateCount;
	if (summary.kind === "deactivate") {
		return {
			button:
				n === 1 ? "Сделать неактивной" : `Сделать неактивными (${n})`,
			menu: n === 1 ? "Сделать неактивной" : `Сделать неактивными (${n})`,
			dialogTitle:
				n === 1
					? "Сделать анкету неактивной?"
					: "Сделать выбранные анкеты неактивными?",
			dialogBody:
				"Утверждённая анкета не удаляется. Запись перейдёт в статус «Неактивная», срез сохранится.",
			confirm: n === 1 ? "Сделать неактивной" : "Сделать неактивными",
			tooltip:
				"Утверждённые анкеты переводятся в «Неактивная», срез сохраняется",
		};
	}
	if (summary.kind === "mixed") {
		return {
			button: `Удалить / сделать неактивными (${n})`,
			menu: `Удалить / сделать неактивными (${n})`,
			dialogTitle: "Удалить черновики и деактивировать утверждённые?",
			dialogBody: `Черновики (${summary.hardDeleteCount}) будут удалены безвозвратно. Утверждённые (${summary.deactivateCount}) перейдут в статус «Неактивная», срез сохранится.`,
			confirm: "Подтвердить",
			tooltip:
				"Черновики удаляются, утверждённые становятся неактивными",
		};
	}
	return {
		button: n <= 1 ? "Удалить" : `Удалить выбранные (${n})`,
		menu: n <= 1 ? "Удалить анкету" : `Удалить выбранные (${n})`,
		dialogTitle: n <= 1 ? "Удалить анкету?" : "Удалить выбранные анкеты?",
		dialogBody:
			"Анкета будет удалена из реестра безвозвратно. Действие применяется только к анкетам, доступным вашей роли и стриму.",
		confirm: "Удалить",
		tooltip: "Неутверждённые анкеты удаляются безвозвратно",
	};
}
