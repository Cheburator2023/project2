import {
	V2_ANKETA_MAIN_SECTION_IDS,
	type V2AnketaMainSectionId,
} from "./v2-anketa-workflow.types";

export const V2_ANKETA_SECTION_ROLE_VALUES = [
	"main",
	"subsection",
	"panel",
	"flat",
] as const;

export type V2AnketaSectionRole = (typeof V2_ANKETA_SECTION_ROLE_VALUES)[number];

export type V2AnketaSectionTitleVariant = "h5" | "h6";

export type V2AnketaSectionUiOptions = {
	/** Роль секции в layout анкеты (конструктор / uiSchema). */
	sectionRole?: V2AnketaSectionRole;
	/** Accordion: развёрнута по умолчанию. */
	defaultExpanded?: boolean;
	/** Привязка к workflow.sections для главных секций. */
	workflowSectionId?: V2AnketaMainSectionId;
	/** Подсекция: счётчик заполненных элементов в заголовке. */
	showFilledCount?: boolean;
	titleVariant?: V2AnketaSectionTitleVariant;
	hidden?: boolean;
};

const STREAM_SECTION_IDS = V2_ANKETA_MAIN_SECTION_IDS.filter((id) =>
	id.startsWith("stream"),
) as V2AnketaMainSectionId[];

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

export function readV2AnketaSectionUiOptions(
	uiNode: unknown,
): V2AnketaSectionUiOptions {
	const node = readRecord(uiNode);
	const opts = readRecord(node?.["ui:options"]);
	if (!opts) return {};
	return {
		sectionRole: isSectionRole(opts.sectionRole)
			? opts.sectionRole
			: undefined,
		defaultExpanded:
			typeof opts.defaultExpanded === "boolean"
				? opts.defaultExpanded
				: undefined,
		workflowSectionId: isMainSectionId(opts.workflowSectionId)
			? opts.workflowSectionId
			: undefined,
		showFilledCount:
			typeof opts.showFilledCount === "boolean"
				? opts.showFilledCount
				: undefined,
		titleVariant:
			opts.titleVariant === "h5" || opts.titleVariant === "h6"
				? opts.titleVariant
				: undefined,
		hidden: opts.hidden === true ? true : undefined,
	};
}

function isSectionRole(value: unknown): value is V2AnketaSectionRole {
	return (
		typeof value === "string" &&
		(V2_ANKETA_SECTION_ROLE_VALUES as readonly string[]).includes(value)
	);
}

export function isV2AnketaMainSectionId(
	value: string,
): value is V2AnketaMainSectionId {
	return (V2_ANKETA_MAIN_SECTION_IDS as readonly string[]).includes(value);
}

function isMainSectionId(value: unknown): value is V2AnketaMainSectionId {
	return typeof value === "string" && isV2AnketaMainSectionId(value);
}

export function isV2AnketaStreamSectionId(
	value: string,
): value is V2AnketaMainSectionId {
	return (STREAM_SECTION_IDS as readonly string[]).includes(
		value as V2AnketaMainSectionId,
	);
}

/** Роль секции: явно из ui:options или эвристика для старых схем без layout. */
export function resolveV2AnketaSectionRole(
	uiNode: unknown,
	path: string[],
): V2AnketaSectionRole {
	const opts = readV2AnketaSectionUiOptions(uiNode);
	if (opts.sectionRole) return opts.sectionRole;

	const root = path[0] ?? "";
	if (path.length === 1 && isV2AnketaMainSectionId(root)) return "main";
	if (
		path.length === 2 &&
		isV2AnketaStreamSectionId(root)
	) {
		return "subsection";
	}
	if (path.length === 1) return "panel";
	return "flat";
}

export function resolveV2AnketaDefaultExpanded(
	uiNode: unknown,
	path: string[],
	role: V2AnketaSectionRole,
): boolean {
	const opts = readV2AnketaSectionUiOptions(uiNode);
	if (typeof opts.defaultExpanded === "boolean") return opts.defaultExpanded;
	if (role === "main") {
		return path[0] === V2_ANKETA_MAIN_SECTION_IDS[0];
	}
	if (role === "panel") return true;
	return true;
}

export function resolveV2AnketaWorkflowSectionId(
	uiNode: unknown,
	path: string[],
): V2AnketaMainSectionId | null {
	const opts = readV2AnketaSectionUiOptions(uiNode);
	if (opts.workflowSectionId) return opts.workflowSectionId;
	const root = path[0] ?? "";
	return path.length === 1 && isV2AnketaMainSectionId(root) ? root : null;
}

export function resolveV2AnketaSectionTitleVariant(
	uiNode: unknown,
	fallback: V2AnketaSectionTitleVariant = "h6",
): V2AnketaSectionTitleVariant {
	const opts = readV2AnketaSectionUiOptions(uiNode);
	return opts.titleVariant ?? fallback;
}

export { STREAM_SECTION_IDS as V2_ANKETA_STREAM_SECTION_IDS };
