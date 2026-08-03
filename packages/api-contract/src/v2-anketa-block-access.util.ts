import {
	resolveStreamBlockRolesForTypicalWorkOutputPath,
	resolveStreamExecutorForTypicalWorkOutputPath,
	resolveV2AnketaArchComponent,
	resolveV2AnketaStreamBlockOptions,
	collectRequiredWorkflowTargets,
} from "./v2-anketa-section-ui.util";
import {
	normalizeV2AnketaWorkflow,
	type V2AnketaRequiredWorkflowTarget,
} from "./v2-anketa-workflow.util";
import type {
	V2AnketaMainSectionId,
	V2AnketaSectionStatus,
	V2AnketaWorkflowDto,
} from "./v2-anketa-workflow.types";
import {
	normalizeStreamBlockExecutor,
	type V2StreamBlockExecutor,
} from "./v2-stream-block-executor.util";
import {
	isV2StreamBlockRoleCode,
	normalizeStreamBlockRole,
	type V2StreamBlockRoleCode,
} from "./v2-stream-block-role.util";
import type { V2ImplementationStreamCode } from "./v2-implementation-streams.util";
import {
	normalizeV2UserGroups,
	resolveV2UserImplementationStreamsFromGroups,
	resolveV2UserScopedStreamsFromGroups,
} from "./v2-user-stream-mapping.util";

export const V2_ANKETA_LEAD_ROLE_CODES = [
	"ds_lead",
	"de_lead",
	"modelops_lead",
] as const;

export type V2AnketaLeadRoleCode = (typeof V2_ANKETA_LEAD_ROLE_CODES)[number];

/**
 * Уровень B (§2): в чужих стримах скрывать оценки типовых/нетиповых работ.
 * Лиды + архитектор / аналитики / sarep.
 */
export const V2_ANKETA_MASK_FOREIGN_ESTIMATES_ROLE_CODES = [
	...V2_ANKETA_LEAD_ROLE_CODES,
	"architect",
	"mntranlst",
	"da",
	"sarep",
] as const;

/** Валидатор / руководитель валидации — без оценок работ вообще. */
export const V2_ANKETA_MASK_ALL_ESTIMATES_ROLE_CODES = [
	"validator",
	"validator_lead",
] as const;

/**
 * Уровень A (§2): жёсткий фильтр **реестра** (анкеты своего стрима).
 * Вкладки в карточке не режутся — «полная детализация» (§2).
 * DS, DE, ModelOps, бизнес-партнёр стрима, аналитик качества данных стрима.
 */
export const V2_ANKETA_OWN_STREAM_BLOCK_FILTER_ROLE_CODES = [
	"ds",
	"de",
	"modelops",
	"da_stream",
	"mipm_stream",
	"data_expert",
] as const;

/**
 * Уровни B+C (§2): все стрим-вкладки видны (как у лида).
 * B — с маскировкой чужих оценок; C — полная детализация.
 */
export const V2_ANKETA_SEE_ALL_STREAM_BLOCKS_ROLE_CODES = [
	...V2_ANKETA_MASK_FOREIGN_ESTIMATES_ROLE_CODES,
	...V2_ANKETA_MASK_ALL_ESTIMATES_ROLE_CODES,
	"mipm",
	"appadmin",
	"auditor",
	"auditor_lead",
	"auditorib",
	"saprg",
	"sacfg",
] as const;

/** Роли доменных групп Keycloak, учитываемые в viewerAccess (кроме Permission). */
export const V2_ANKETA_VIEWER_ROLE_CODES = [
	...V2_ANKETA_MASK_FOREIGN_ESTIMATES_ROLE_CODES,
	...V2_ANKETA_MASK_ALL_ESTIMATES_ROLE_CODES,
	"ds",
	"de",
	"modelops",
	"mipm",
	"mipm_stream",
	"da_stream",
	"data_expert",
	"saprg",
	"sacfg",
	"appadmin",
	"admin_it",
	"admin_it_lead",
	"business_customer",
	"auditor",
	"auditor_lead",
	"auditorib",
	"prjtoffice",
	"project_office",
] as const;

export type V2AnketaViewerAccessContext = {
	roles: readonly string[];
	streams: readonly V2StreamBlockExecutor[];
};

export type V2AnketaBlockAccessRestrictions = {
	streamExecutors: V2StreamBlockExecutor[];
	streamBlockRoles: V2StreamBlockRoleCode[];
};

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function readUiBranchAtDotPath(
	uiSchema: unknown,
	outputPath: string,
): Record<string, unknown> | undefined {
	const segments = outputPath.split(".").filter(Boolean);
	let current: unknown = uiSchema;
	for (const segment of segments) {
		const obj = readRecord(current);
		if (!obj) return undefined;
		current = obj[segment];
	}
	return readRecord(current);
}

export function blockHasV2AnketaAccessRestrictions(
	restrictions: V2AnketaBlockAccessRestrictions,
): boolean {
	return (
		restrictions.streamExecutors.length > 0 ||
		restrictions.streamBlockRoles.length > 0
	);
}

export function userHasV2AnketaStreamBlockFilteredRole(
	roles: readonly string[],
): boolean {
	return roles.some((role) => {
		const code = normalizeStreamBlockRole(role);
		return code != null && isV2StreamBlockRoleCode(code);
	});
}

export function userIsV2AnketaLead(roles: readonly string[]): boolean {
	return roles.some((role) =>
		(V2_ANKETA_LEAD_ROLE_CODES as readonly string[]).includes(role.trim()),
	);
}

/** Уровни B/C / лиды: все стрим-блоки карточки, без жёсткого фильтра вкладок. */
export function userSeesAllAnketaStreamBlocks(
	roles: readonly string[],
): boolean {
	return roles.some((role) =>
		(
			V2_ANKETA_SEE_ALL_STREAM_BLOCKS_ROLE_CODES as readonly string[]
		).includes(role.trim()),
	);
}

/** Уровень A: фильтровать вкладки по своему стриму/роли (и нет роли B/C). */
export function userIsRestrictedToOwnStreamBlocks(
	roles: readonly string[],
): boolean {
	if (userSeesAllAnketaStreamBlocks(roles)) return false;
	return roles.some((role) =>
		(
			V2_ANKETA_OWN_STREAM_BLOCK_FILTER_ROLE_CODES as readonly string[]
		).includes(role.trim()),
	);
}

export function userMasksAllWorkEstimates(roles: readonly string[]): boolean {
	return roles.some((role) =>
		(V2_ANKETA_MASK_ALL_ESTIMATES_ROLE_CODES as readonly string[]).includes(
			role.trim(),
		),
	);
}

export function userMasksForeignWorkEstimates(
	roles: readonly string[],
): boolean {
	return roles.some((role) =>
		(V2_ANKETA_MASK_FOREIGN_ESTIMATES_ROLE_CODES as readonly string[]).includes(
			role.trim(),
		),
	);
}

export function rolesIntersectViewerAndBlock(
	viewerRoles: readonly string[],
	blockRoles: readonly V2StreamBlockRoleCode[],
): boolean {
	if (blockRoles.length === 0) return false;
	const viewerCodes = new Set(
		viewerRoles
			.map((role) => normalizeStreamBlockRole(role))
			.filter((code): code is V2StreamBlockRoleCode => code != null),
	);
	return blockRoles.some((code) => viewerCodes.has(code));
}

export function streamsIntersectViewerAndBlock(
	viewerStreams: readonly string[],
	blockStreams: readonly V2StreamBlockExecutor[],
): boolean {
	if (blockStreams.length === 0) return false;
	const viewerCodes = new Set(
		viewerStreams
			.map((stream) => normalizeStreamBlockExecutor(stream))
			.filter((code): code is V2StreamBlockExecutor => code != null),
	);
	return blockStreams.some((code) => viewerCodes.has(code));
}

/** Ограничения доступа для стрим-блока / typicalWork / atypicalWork по dot-пути. */
export function resolveV2AnketaBlockAccessRestrictionsForOutputPath(
	uiSchema: unknown,
	outputPath: string,
): V2AnketaBlockAccessRestrictions {
	const trimmed = outputPath.trim();
	if (!trimmed) {
		return { streamExecutors: [], streamBlockRoles: [] };
	}

	const leaf = readUiBranchAtDotPath(uiSchema, trimmed);
	const arch = resolveV2AnketaArchComponent(leaf);
	if (arch === "typicalWork" || arch === "atypicalWork") {
		return {
			streamExecutors: resolveStreamExecutorForTypicalWorkOutputPath(
				uiSchema,
				trimmed,
			),
			streamBlockRoles: resolveStreamBlockRolesForTypicalWorkOutputPath(
				uiSchema,
				trimmed,
			),
		};
	}

	const rootKey = trimmed.split(".")[0]?.trim() ?? "";
	const streamOptions = resolveV2AnketaStreamBlockOptions(leaf, rootKey);
	return {
		streamExecutors: streamOptions.streamExecutors,
		streamBlockRoles: streamOptions.streamBlockRoles,
	};
}

/** Нужно ли проверять доступ на этом пути (корневой streamBlock или arch work). */
export function shouldApplyV2AnketaBlockAccessAtPath(
	uiSchema: unknown,
	outputPath: string,
): boolean {
	const trimmed = outputPath.trim();
	if (!trimmed) return false;

	const leaf = readUiBranchAtDotPath(uiSchema, trimmed);
	const arch = resolveV2AnketaArchComponent(leaf);
	if (arch === "typicalWork" || arch === "atypicalWork") return true;

	const rootKey = trimmed.split(".")[0]?.trim() ?? "";
	const segments = trimmed.split(".").filter(Boolean);
	if (segments.length !== 1) return false;

	return resolveV2AnketaStreamBlockOptions(leaf, rootKey).streamBlock;
}

/**
 * Блок «свой» для Level A (реестр / complete / правка секции).
 * Пересечение роли или стрима с ограничениями блока.
 */
export function isBlockInViewerOwnStreamScope(
	viewer: V2AnketaViewerAccessContext,
	restrictions: V2AnketaBlockAccessRestrictions,
): boolean {
	if (!blockHasV2AnketaAccessRestrictions(restrictions)) return true;
	if (userSeesAllAnketaStreamBlocks(viewer.roles)) return true;
	if (!userIsRestrictedToOwnStreamBlocks(viewer.roles)) return true;
	return (
		rolesIntersectViewerAndBlock(viewer.roles, restrictions.streamBlockRoles) ||
		streamsIntersectViewerAndBlock(viewer.streams, restrictions.streamExecutors)
	);
}

/**
 * Видимость вкладки в карточке.
 * F-05 §2: Level A — жёсткий фильтр на **реестр/чужие анкеты**, а в доступной
 * карточке — «полная детализация» (все стрим-блоки видны). Маскировка оценок
 * для Level B — отдельно (`shouldMaskWorkEstimatesForUser`).
 */
export function isBlockVisibleForUser(
	viewer: V2AnketaViewerAccessContext,
	restrictions: V2AnketaBlockAccessRestrictions,
): boolean {
	if (!blockHasV2AnketaAccessRestrictions(restrictions)) return true;
	if (userSeesAllAnketaStreamBlocks(viewer.roles)) return true;
	/** Level A: вкладки не режем — только реестр фильтрует анкеты. */
	if (userIsRestrictedToOwnStreamBlocks(viewer.roles)) return true;
	return isBlockInViewerOwnStreamScope(viewer, restrictions);
}

export function isV2AnketaBlockVisibleForViewer(
	viewer: V2AnketaViewerAccessContext | undefined,
	uiSchema: unknown,
	outputPath: string,
	options?: { applyAccessRules?: boolean },
): boolean {
	if (options?.applyAccessRules === false || !viewer) return true;
	if (!shouldApplyV2AnketaBlockAccessAtPath(uiSchema, outputPath)) return true;
	const restrictions = resolveV2AnketaBlockAccessRestrictionsForOutputPath(
		uiSchema,
		outputPath,
	);
	return isBlockVisibleForUser(viewer, restrictions);
}

/**
 * Представитель стрима-не участника ЖЦМ (§F-05): чужие стрим-блоки видит, но
 * редактирует и подтверждает только свой стрим; анкету целиком не завершает.
 */
export const V2_ANKETA_EDIT_ONLY_OWN_STREAM_ROLE_CODES = ["sarep"] as const;

/**
 * Общие разделы: правит любая роль, но подтверждает только ответственный за анкету.
 * `detailInfo` помечен стрим-блоком модельных стримов, поэтому нужен явный список.
 */
export const V2_ANKETA_SHARED_SECTION_KEYS = [
	"generalInfo",
	"detailInfo",
] as const;

export function userEditsOnlyOwnStreamBlocks(
	roles: readonly string[],
): boolean {
	return roles.some((role) =>
		(V2_ANKETA_EDIT_ONLY_OWN_STREAM_ROLE_CODES as readonly string[]).includes(
			role.trim(),
		),
	);
}

/**
 * Стримы зрителя для правил доступа к блокам.
 *
 * `resolveV2UserImplementationStreamsFromGroups` отвечает на вопрос «резать ли
 * реестр по стриму» и для лидов / `sarep` возвращает пусто — реестр им не
 * режется. Для правил блоков (маскирование чужих оценок, edit own stream)
 * нужен сам стрим из AD (`sum_Lds_<stream>` / `sum_sarep_<stream>`): без него
 * `viewer.streams=[]` и Level B прячет все оценки, включая свои.
 */
export function resolveV2AnketaViewerStreamsFromGroups(
	groups: readonly string[],
): V2ImplementationStreamCode[] {
	const filtered = resolveV2UserImplementationStreamsFromGroups(groups);
	if (filtered.length > 0) return filtered;
	const roles = normalizeV2UserGroups(groups).map(
		(group) => normalizeStreamBlockRole(group) ?? group.trim(),
	);
	if (
		!userEditsOnlyOwnStreamBlocks(roles) &&
		!userMasksForeignWorkEstimates(roles)
	) {
		return filtered;
	}
	return resolveV2UserScopedStreamsFromGroups(groups);
}

export function isSharedAnketaSectionPath(formPath: string): boolean {
	const root = formPath.trim().split(".")[0]?.trim() ?? "";
	return (V2_ANKETA_SHARED_SECTION_KEYS as readonly string[]).includes(root);
}

/** Ограничения корневого стрим-блока, которому принадлежит путь формы. */
function resolveRootStreamBlockRestrictions(
	uiSchema: unknown,
	formPath: string,
): V2AnketaBlockAccessRestrictions | null {
	const root = formPath.trim().split(".")[0]?.trim() ?? "";
	if (!root) return null;
	if (!shouldApplyV2AnketaBlockAccessAtPath(uiSchema, root)) return null;
	return resolveV2AnketaBlockAccessRestrictionsForOutputPath(uiSchema, root);
}

/**
 * Можно ли редактировать путь формы. Ограничение действует только для ролей
 * «редактирую свой стрим»; блок без привязки к стриму считается общим.
 */
export function isV2AnketaPathEditableForViewer(
	viewer: V2AnketaViewerAccessContext | undefined,
	uiSchema: unknown,
	formPath: string,
	options?: { applyAccessRules?: boolean },
): boolean {
	if (options?.applyAccessRules === false || !viewer) return true;
	if (!userEditsOnlyOwnStreamBlocks(viewer.roles)) return true;
	if (isSharedAnketaSectionPath(formPath)) return true;

	const restrictions = resolveRootStreamBlockRestrictions(uiSchema, formPath);
	if (!restrictions || restrictions.streamExecutors.length === 0) return true;
	return streamsIntersectViewerAndBlock(
		viewer.streams,
		restrictions.streamExecutors,
	);
}

/**
 * Можно ли нажать «Завершить заполнение …» на разделе.
 * Для представителя стрима — только раздел своего стрима: общие разделы и
 * разделы без привязки к стриму подтверждает ответственный за анкету.
 */
export function canViewerCompleteAnketaSection(
	viewer: V2AnketaViewerAccessContext | undefined,
	uiSchema: unknown,
	sectionPath: string,
	options?: { applyAccessRules?: boolean },
): boolean {
	if (options?.applyAccessRules === false || !viewer) return true;
	if (!userEditsOnlyOwnStreamBlocks(viewer.roles)) return true;
	if (isSharedAnketaSectionPath(sectionPath)) return false;

	const restrictions = resolveRootStreamBlockRestrictions(
		uiSchema,
		sectionPath,
	);
	if (!restrictions || restrictions.streamExecutors.length === 0) return false;
	return streamsIntersectViewerAndBlock(
		viewer.streams,
		restrictions.streamExecutors,
	);
}

/** Глобальное «Завершить заполнение анкеты» недоступно представителю стрима (§4). */
export function canViewerCompleteWholeAnketa(
	roles: readonly string[],
): boolean {
	return !userEditsOnlyOwnStreamBlocks(roles);
}

export type V2AnketaForbiddenChange = {
	/** Путь в formData вида `workflow.<раздел>`. */
	path: string;
	reason: "foreign_stream" | "foreign_section_complete" | "global_complete";
};

function readSectionStatus(
	workflow: V2AnketaWorkflowDto,
	path: string,
): V2AnketaSectionStatus {
	return (
		workflow.sections[path as V2AnketaMainSectionId] ??
		workflow.panelSections?.[path] ??
		"Создано"
	);
}

/**
 * Переходы workflow, недопустимые для зрителя (§1–§4). Пустой список — нарушений нет.
 * Действует только для ролей «редактирую свой стрим»; остальным ничего не запрещает.
 */
export function collectForbiddenV2AnketaWorkflowChanges(
	viewer: V2AnketaViewerAccessContext | undefined,
	uiSchema: unknown,
	previous: unknown,
	next: unknown,
): V2AnketaForbiddenChange[] {
	if (!viewer || !userEditsOnlyOwnStreamBlocks(viewer.roles)) return [];

	const before = normalizeV2AnketaWorkflow(previous);
	const after = normalizeV2AnketaWorkflow(next);
	const changes: V2AnketaForbiddenChange[] = [];

	if (
		before.globalStatus !== after.globalStatus &&
		!canViewerCompleteWholeAnketa(viewer.roles)
	) {
		changes.push({ path: "workflow.globalStatus", reason: "global_complete" });
	}

	const sectionPaths = new Set([
		...Object.keys(before.sections),
		...Object.keys(after.sections),
		...Object.keys(before.panelSections ?? {}),
		...Object.keys(after.panelSections ?? {}),
	]);
	for (const path of sectionPaths) {
		const nextStatus = readSectionStatus(after, path);
		if (readSectionStatus(before, path) === nextStatus) continue;
		// «В работе» ставится автоматически при первой правке — сверяем с правом на правку.
		const allowed =
			nextStatus === "Заполнено"
				? canViewerCompleteAnketaSection(viewer, uiSchema, path, {
						applyAccessRules: true,
					})
				: isV2AnketaPathEditableForViewer(viewer, uiSchema, path, {
						applyAccessRules: true,
					});
		if (allowed) continue;
		changes.push({
			path: `workflow.${path}`,
			reason:
				nextStatus === "Заполнено"
					? "foreign_section_complete"
					: "foreign_stream",
		});
	}

	return changes;
}

/**
 * Обязательные цели для «Завершить заполнение анкеты» с учётом ролевой видимости:
 * скрытые стрим-блоки не блокируют кнопку.
 */
export function collectRequiredWorkflowTargetsForViewer(
	uiSchema: unknown,
	formData: Record<string, unknown> | null | undefined,
	viewer: V2AnketaViewerAccessContext | undefined,
	options?: { applyAccessRules?: boolean },
): V2AnketaRequiredWorkflowTarget[] {
	const targets = collectRequiredWorkflowTargets(uiSchema, formData);
	if (options?.applyAccessRules === false || !viewer) return targets;
	return targets.filter((target) => {
		const path = target.kind === "main" ? target.sectionId : target.pathKey;
		if (options?.applyAccessRules === false) return true;
		if (!shouldApplyV2AnketaBlockAccessAtPath(uiSchema, path)) return true;
		const restrictions = resolveV2AnketaBlockAccessRestrictionsForOutputPath(
			uiSchema,
			path,
		);
		/** Complete: Level A обязан только по «своим» блокам, даже если вкладки видны. */
		return isBlockInViewerOwnStreamScope(viewer, restrictions);
	});
}

/**
 * Маскировать оценки в блоке типовых/нетиповых работ (уровень B / валидатор).
 * Свой стрим — видно; чужой — скрыто. Без своего стрима все блоки со streamExecutor — «чужие».
 *
 * Для зонтика «Модельный стрим» (`streamExecutor: [rb, kmbkcb, …]`) достаточно
 * пересечения с одним своим стримом — иначе `ds_lead`/`sum_Lds_rb` не видел бы
 * оценок модельного стрима вообще.
 */
export function shouldMaskWorkEstimatesForUser(
	viewer: V2AnketaViewerAccessContext,
	blockStreamExecutors: readonly V2StreamBlockExecutor[],
): boolean {
	if (userMasksAllWorkEstimates(viewer.roles)) return true;
	if (!userMasksForeignWorkEstimates(viewer.roles)) return false;
	if (blockStreamExecutors.length === 0) return false;
	if (viewer.streams.length === 0) return true;
	return !streamsIntersectViewerAndBlock(
		viewer.streams,
		blockStreamExecutors,
	);
}

export function shouldMaskWorkEstimatesForViewerAtPath(
	viewer: V2AnketaViewerAccessContext | undefined,
	uiSchema: unknown,
	outputPath: string,
	options?: { applyAccessRules?: boolean },
): boolean {
	if (options?.applyAccessRules === false || !viewer) return false;
	const restrictions = resolveV2AnketaBlockAccessRestrictionsForOutputPath(
		uiSchema,
		outputPath,
	);
	return shouldMaskWorkEstimatesForUser(viewer, restrictions.streamExecutors);
}

const ESTIMATE_FIELD_SUFFIXES = [
	".estimateHoursPerDay",
	".coefficient",
	".total",
] as const;

export function isV2AnketaFormPathVisibleForViewer(
	viewer: V2AnketaViewerAccessContext | undefined,
	uiSchema: unknown,
	formPath: string,
	options?: { applyAccessRules?: boolean },
): boolean {
	if (options?.applyAccessRules === false || !viewer) return true;
	const dotPath = formPath.replace(/\[(\d+)\]/g, ".$1");
	const segments = dotPath.split(".").filter(Boolean);
	for (let len = segments.length; len > 0; len -= 1) {
		const candidate = segments.slice(0, len).join(".");
		if (shouldApplyV2AnketaBlockAccessAtPath(uiSchema, candidate)) {
			return isV2AnketaBlockVisibleForViewer(
				viewer,
				uiSchema,
				candidate,
				options,
			);
		}
	}
	return true;
}

/** Маскировать значение поля формы при экспорте (лиды / скрытые блоки). */
export function maskV2AnketaExportFormValue(
	formPath: string,
	raw: unknown,
	viewer: V2AnketaViewerAccessContext | undefined,
	uiSchema: unknown,
	options?: { applyAccessRules?: boolean },
): unknown {
	if (options?.applyAccessRules === false || !viewer) return raw;

	const dotPath = formPath.replace(/\[(\d+)\]/g, ".$1");
	const segments = dotPath.split(".").filter(Boolean);
	if (segments.length === 0) return raw;

	let accessPath = dotPath;
	for (let len = segments.length; len > 0; len -= 1) {
		const candidate = segments.slice(0, len).join(".");
		if (shouldApplyV2AnketaBlockAccessAtPath(uiSchema, candidate)) {
			accessPath = candidate;
			break;
		}
	}

	if (
		!isV2AnketaBlockVisibleForViewer(viewer, uiSchema, accessPath, options)
	) {
		return "";
	}

	const isEstimateField = ESTIMATE_FIELD_SUFFIXES.some((suffix) =>
		dotPath.endsWith(suffix),
	);
	if (
		isEstimateField &&
		shouldMaskWorkEstimatesForViewerAtPath(viewer, uiSchema, accessPath, options)
	) {
		return "";
	}

	return raw;
}
