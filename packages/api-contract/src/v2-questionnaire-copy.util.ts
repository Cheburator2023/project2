import {
	isV2ModelImplementationStreamCode,
	isV2ModelStreamUmbrellaLabel,
} from "./v2-model-stream-typical-works.constants";
import {
	V2_IMPLEMENTATION_STREAM_CODES,
	V2_IMPLEMENTATION_STREAM_LABELS,
	isV2ImplementationStreamCode,
} from "./v2-implementation-streams.util";
import { normalizeV2UserGroups } from "./v2-user-stream-mapping.util";
import { userCanCreateV2Questionnaire } from "./v2-questionnaire-delete.util";

export type V2QuestionnaireCopyDenyReason =
	| "forbidden"
	| "model_anketa_for_sarep";

export type V2QuestionnaireCopyAccess =
	| { ok: true }
	| { ok: false; reason: V2QuestionnaireCopyDenyReason };

function readImplementationStreamRaw(formData: unknown): string | undefined {
	if (!formData || typeof formData !== "object") return undefined;
	const generalInfo = (formData as Record<string, unknown>).generalInfo;
	if (!generalInfo || typeof generalInfo !== "object") return undefined;
	const raw = (generalInfo as Record<string, unknown>).implementationStream;
	if (typeof raw === "string" && raw.trim()) return raw.trim();
	return undefined;
}

/** Код стрима-исполнителя из formData (код или подпись справочника). */
export function resolveV2QuestionnaireImplementationStreamCode(
	formData: unknown,
): string | null {
	const raw = readImplementationStreamRaw(formData);
	if (!raw) return null;
	if (isV2ImplementationStreamCode(raw)) return raw;
	const needle = raw.toLowerCase();
	for (const code of V2_IMPLEMENTATION_STREAM_CODES) {
		if (V2_IMPLEMENTATION_STREAM_LABELS[code].toLowerCase() === needle) {
			return code;
		}
	}
	return null;
}

/**
 * Модельная анкета: стрим-исполнитель — один из 5 модельных (ЖЦМ)
 * или зонтичный «Модельный стрим».
 * Без стрима считаем модельной (для sarep копирование запрещено).
 */
export function isV2ModelQuestionnaireFormData(formData: unknown): boolean {
	const raw = readImplementationStreamRaw(formData);
	if (!raw) return true;
	if (isV2ModelStreamUmbrellaLabel(raw)) return true;
	const code = resolveV2QuestionnaireImplementationStreamCode(formData);
	return Boolean(code && isV2ModelImplementationStreamCode(code));
}

export function userIsV2StreamRepresentative(
	userGroups: readonly string[],
): boolean {
	return normalizeV2UserGroups(userGroups).includes("sarep");
}

/**
 * Копия анкеты (похожая инициатива).
 * - Роли create-allowlist / god: любая анкета (нужен create-permission).
 * - Представитель стрима (`sarep`): только немодельные; достаточно edit
 *   (в F-05 у sarep нет create, но копия разрешена).
 */
export function canUserCopyV2Questionnaire(
	userGroups: readonly string[],
	formData: unknown,
	options: {
		hasCreatePermission: boolean;
		hasEditPermission: boolean;
	},
): V2QuestionnaireCopyAccess {
	if (userCanCreateV2Questionnaire(userGroups, options.hasCreatePermission)) {
		return { ok: true };
	}

	if (
		userIsV2StreamRepresentative(userGroups) &&
		(options.hasEditPermission || options.hasCreatePermission)
	) {
		if (isV2ModelQuestionnaireFormData(formData)) {
			return { ok: false, reason: "model_anketa_for_sarep" };
		}
		return { ok: true };
	}

	return { ok: false, reason: "forbidden" };
}
