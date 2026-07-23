import {
	resolveStreamBlockRolesForTypicalWorkOutputPath,
	resolveStreamExecutorForTypicalWorkOutputPath,
	resolveV2AnketaArchComponent,
	resolveV2AnketaStreamBlockOptions,
	collectRequiredWorkflowTargets,
} from "./v2-anketa-section-ui.util";
import type { V2AnketaRequiredWorkflowTarget } from "./v2-anketa-workflow.util";
import {
	normalizeStreamBlockExecutor,
	type V2StreamBlockExecutor,
} from "./v2-stream-block-executor.util";
import {
	isV2StreamBlockRoleCode,
	normalizeStreamBlockRole,
	type V2StreamBlockRoleCode,
} from "./v2-stream-block-role.util";

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
 * Уровень A (§2): жёсткий фильтр вкладок — только блоки своего стрима / роли.
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

export function isBlockVisibleForUser(
	viewer: V2AnketaViewerAccessContext,
	restrictions: V2AnketaBlockAccessRestrictions,
): boolean {
	if (!blockHasV2AnketaAccessRestrictions(restrictions)) return true;
	/** B/C / лиды: все вкладки (маскировка оценок — отдельно). */
	if (userSeesAllAnketaStreamBlocks(viewer.roles)) return true;
	/** Без роли уровня A — не режем вкладки (нет stream-block контекста). */
	if (!userIsRestrictedToOwnStreamBlocks(viewer.roles)) return true;
	return (
		rolesIntersectViewerAndBlock(viewer.roles, restrictions.streamBlockRoles) ||
		streamsIntersectViewerAndBlock(viewer.streams, restrictions.streamExecutors)
	);
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
		return isV2AnketaBlockVisibleForViewer(viewer, uiSchema, path, options);
	});
}

/**
 * Маскировать оценки в блоке типовых/нетиповых работ (уровень B / валидатор).
 * Свой стрим — видно; чужой — скрыто. Без своего стрима все блоки со streamExecutor — «чужие».
 */
export function shouldMaskWorkEstimatesForUser(
	viewer: V2AnketaViewerAccessContext,
	blockStreamExecutors: readonly V2StreamBlockExecutor[],
): boolean {
	if (userMasksAllWorkEstimates(viewer.roles)) return true;
	if (!userMasksForeignWorkEstimates(viewer.roles)) return false;
	if (blockStreamExecutors.length === 0) return false;
	if (viewer.streams.length === 0) return true;
	return !blockStreamExecutors.every((code) =>
		streamsIntersectViewerAndBlock(viewer.streams, [code]),
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
