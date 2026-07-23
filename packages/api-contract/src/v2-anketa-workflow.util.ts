import {
	V2_ANKETA_GLOBAL_STATUS_VALUES,
	V2_ANKETA_MAIN_SECTION_IDS,
	V2_ANKETA_SECTION_STATUS_VALUES,
	type V2AnketaGlobalStatus,
	type V2AnketaMainSectionId,
	type V2AnketaSectionStatus,
	type V2AnketaWorkflowDto,
} from "./v2-anketa-workflow.types";

export function createDefaultV2AnketaWorkflow(): V2AnketaWorkflowDto {
	const sections = Object.fromEntries(
		V2_ANKETA_MAIN_SECTION_IDS.map((id) => [id, "Создано" as const]),
	) as Record<V2AnketaMainSectionId, V2AnketaSectionStatus>;
	return { globalStatus: "Черновик", sections };
}

export function normalizeV2AnketaWorkflow(raw: unknown): V2AnketaWorkflowDto {
	const defaults = createDefaultV2AnketaWorkflow();
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
	const input = raw as Record<string, unknown>;
	const globalStatus = V2_ANKETA_GLOBAL_STATUS_VALUES.includes(
		input.globalStatus as V2AnketaGlobalStatus,
	)
		? (input.globalStatus as V2AnketaGlobalStatus)
		: defaults.globalStatus;

	const sectionsRaw =
		input.sections && typeof input.sections === "object"
			? (input.sections as Record<string, unknown>)
			: {};
	const sections = { ...defaults.sections };
	for (const id of V2_ANKETA_MAIN_SECTION_IDS) {
		const value = sectionsRaw[id];
		if (
			typeof value === "string" &&
			(V2_ANKETA_SECTION_STATUS_VALUES as readonly string[]).includes(value)
		) {
			sections[id] = value as V2AnketaSectionStatus;
		}
	}

	const panelSectionsRaw =
		input.panelSections && typeof input.panelSections === "object"
			? (input.panelSections as Record<string, unknown>)
			: {};
	const panelSections: Record<string, V2AnketaSectionStatus> = {};
	for (const [pathKey, value] of Object.entries(panelSectionsRaw)) {
		if (
			typeof pathKey === "string" &&
			pathKey.trim() &&
			typeof value === "string" &&
			(V2_ANKETA_SECTION_STATUS_VALUES as readonly string[]).includes(value)
		) {
			panelSections[pathKey] = value as V2AnketaSectionStatus;
		}
	}

	return {
		globalStatus,
		sections,
		...(Object.keys(panelSections).length > 0 ? { panelSections } : {}),
	};
}

/** Цель workflow, которую нужно завершить до глобального «Заполнено». */
export type V2AnketaRequiredWorkflowTarget =
	| { kind: "main"; sectionId: V2AnketaMainSectionId }
	| { kind: "panel"; pathKey: string };

export function isWorkflowTargetCompleted(
	workflow: V2AnketaWorkflowDto,
	target: V2AnketaRequiredWorkflowTarget,
): boolean {
	if (target.kind === "main") {
		return workflow.sections[target.sectionId] === "Заполнено";
	}
	return readPanelSectionStatus(workflow, target.pathKey) === "Заполнено";
}

/**
 * Все обязательные разделы подтверждены.
 * Без `requiredTargets` — legacy: все `V2_ANKETA_MAIN_SECTION_IDS`.
 * С `requiredTargets` (из uiSchema) — только реально присутствующие/активные секции,
 * включая кастомные stream-блоки в `panelSections`.
 */
export function allRequiredSectionsCompleted(
	workflow: V2AnketaWorkflowDto,
	requiredTargets?: readonly V2AnketaRequiredWorkflowTarget[],
): boolean {
	if (requiredTargets) {
		if (requiredTargets.length === 0) return false;
		return requiredTargets.every((target) =>
			isWorkflowTargetCompleted(workflow, target),
		);
	}
	return V2_ANKETA_MAIN_SECTION_IDS.every(
		(id) => workflow.sections[id] === "Заполнено",
	);
}

/** Анкета заблокирована для правок (заполнена или зафиксирован срез). */
export function isAnketaGloballyLocked(
	workflow: Pick<V2AnketaWorkflowDto, "globalStatus">,
): boolean {
	return (
		workflow.globalStatus === "Заполнено" ||
		workflow.globalStatus === "Утверждена"
	);
}

export function markSectionInProgress(
	workflow: V2AnketaWorkflowDto,
	sectionId: V2AnketaMainSectionId,
): V2AnketaWorkflowDto {
	if (isAnketaGloballyLocked(workflow)) return workflow;
	const status = workflow.sections[sectionId];
	if (status !== "Создано") return workflow;
	return {
		...workflow,
		sections: { ...workflow.sections, [sectionId]: "В работе" },
	};
}

export function completeSection(
	workflow: V2AnketaWorkflowDto,
	sectionId: V2AnketaMainSectionId,
): V2AnketaWorkflowDto {
	if (isAnketaGloballyLocked(workflow)) return workflow;
	return {
		...workflow,
		globalStatus: workflow.globalStatus,
		sections: {
			...workflow.sections,
			[sectionId]: "Заполнено",
		},
	};
}

export function readPanelSectionStatus(
	workflow: V2AnketaWorkflowDto,
	pathKey: string,
): V2AnketaSectionStatus {
	return workflow.panelSections?.[pathKey] ?? "Создано";
}

export function completePanelSection(
	workflow: V2AnketaWorkflowDto,
	pathKey: string,
): V2AnketaWorkflowDto {
	if (isAnketaGloballyLocked(workflow)) return workflow;
	const trimmed = pathKey.trim();
	if (!trimmed) return workflow;
	return {
		...workflow,
		panelSections: {
			...workflow.panelSections,
			[trimmed]: "Заполнено",
		},
	};
}

/** Глобальное «Заполнено» — только когда все разделы подтверждены (кнопка в шапке). */
export function completeGlobalQuestionnaire(
	workflow: V2AnketaWorkflowDto,
	requiredTargets?: readonly V2AnketaRequiredWorkflowTarget[],
): V2AnketaWorkflowDto {
	if (isAnketaGloballyLocked(workflow)) return workflow;
	if (!allRequiredSectionsCompleted(workflow, requiredTargets)) return workflow;
	return { ...workflow, globalStatus: "Заполнено" };
}

/** Фиксация среза (§3.13): Заполнено → Утверждена. */
export function holdQuestionnaire(
	workflow: V2AnketaWorkflowDto,
): V2AnketaWorkflowDto {
	if (workflow.globalStatus !== "Заполнено") return workflow;
	return { ...workflow, globalStatus: "Утверждена" };
}

export function mainSectionIdForFormPath(
	path: string,
): V2AnketaMainSectionId | null {
	const root = path.split(".")[0]?.trim();
	if (!root) return null;
	return (V2_ANKETA_MAIN_SECTION_IDS as readonly string[]).includes(root)
		? (root as V2AnketaMainSectionId)
		: null;
}

/** Поле/арх-компонент недоступен для редактирования после завершения раздела или анкеты. */
export function isAnketaFormPathLocked(
	workflow: V2AnketaWorkflowDto,
	pathKey: string,
): boolean {
	if (isAnketaGloballyLocked(workflow)) return true;

	const trimmed = pathKey.trim();
	if (!trimmed) return false;

	const mainSectionId = mainSectionIdForFormPath(trimmed);
	if (
		mainSectionId &&
		workflow.sections[mainSectionId] === "Заполнено"
	) {
		return true;
	}

	const panelSections = workflow.panelSections;
	if (!panelSections) return false;

	for (const [panelPath, status] of Object.entries(panelSections)) {
		if (status !== "Заполнено") continue;
		if (trimmed === panelPath || trimmed.startsWith(`${panelPath}.`)) {
			return true;
		}
	}

	return false;
}

export const V2_ANKETA_GLOBAL_COMPLETE_LABEL =
	"Завершить заполнение анкеты";

export const V2_ANKETA_HOLD_LABEL = "Зафиксировать срез";

export const V2_ANKETA_SECTION_COMPLETE_LABELS: Record<
	V2AnketaMainSectionId,
	string
> = {
	generalInfo: "Завершить заполнение общей информации",
	detailInfo: "Завершить заполнение детальной информации",
	streamDataSources: "Завершить заполнение стрима «Источники данных»",
	streamModelControl: "Завершить заполнение стрима «Контроль моделей»",
};

export const V2_ANKETA_MAIN_SECTION_TITLES: Record<V2AnketaMainSectionId, string> =
	{
		generalInfo: "Общая информация",
		detailInfo: "Детальная информация",
		streamDataSources: "Стрим «Источники данных»",
		streamModelControl: "Стрим «Контроль моделей»",
	};

export const V2_ANKETA_SECTION_STATUS_CHIP_COLOR: Record<
	V2AnketaSectionStatus,
	"default" | "warning" | "success"
> = {
	Создано: "default",
	"В работе": "warning",
	Заполнено: "success",
};

export const V2_ANKETA_GLOBAL_STATUS_CHIP_COLOR: Record<
	V2AnketaGlobalStatus,
	"default" | "success" | "primary"
> = {
	Черновик: "default",
	Заполнено: "success",
	Утверждена: "primary",
};
