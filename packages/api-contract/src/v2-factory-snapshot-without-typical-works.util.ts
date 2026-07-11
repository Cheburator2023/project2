import type { V2LogicGraphDto, V2LogicRuleDto } from "./v2-template.types";
import { isTypicalWorksCatalogLogicRule } from "./v2-default-typical-works-logic.util";
import {
	collectGeneratedTypicalWorkArrayPaths,
	disableTypicalWorkCatalogBindingsInUiSchema,
} from "./v2-typical-work-output-paths.util";

export type V2TemplateSnapshotLike = {
	jsonSchema: unknown;
	uiSchema: unknown;
	logic: V2LogicGraphDto;
	dictionariesSnapshot?: unknown;
	releaseNotes?: string | null;
};

function slashPath(dotPath: string): string {
	return `/${dotPath.replace(/\./g, "/")}`;
}

function isTypicalWorksStoredLogicRule(
	rule: V2LogicRuleDto,
	typicalWorkOutputPaths: ReadonlySet<string>,
): boolean {
	if (isTypicalWorksCatalogLogicRule(rule)) return true;
	if (rule.id === "unified-typical-total") return true;

	const payload = rule.payload as Record<string, unknown> | undefined;
	if (payload?.role === "typical_total") return true;
	if (payload?.worksCatalog === true) return true;

	const slashPaths = new Set(
		[...typicalWorkOutputPaths].map((path) => slashPath(path)),
	);
	if (rule.targetPath && slashPaths.has(rule.targetPath)) return true;

	const arrayPath = payload?.arrayPath;
	if (typeof arrayPath === "string" && typicalWorkOutputPaths.has(arrayPath)) {
		return true;
	}

	const outputArrayPath = payload?.outputArrayPath;
	if (
		typeof outputArrayPath === "string" &&
		typicalWorkOutputPaths.has(outputArrayPath)
	) {
		return true;
	}

	return false;
}

/** Убирает сохранённые правила типовых работ из logic-графа шаблона. */
export function stripTypicalWorksLogicRules(
	logic: V2LogicGraphDto,
	uiSchema: unknown,
): V2LogicGraphDto {
	const typicalWorkOutputPaths = new Set(
		collectGeneratedTypicalWorkArrayPaths(uiSchema),
	);
	return {
		...logic,
		rules: (logic?.rules ?? []).filter(
			(rule) => !isTypicalWorksStoredLogicRule(rule, typicalWorkOutputPaths),
		),
	};
}

/**
 * Заводской снимок без типовых работ: структура анкеты сохраняется,
 * каталог работ не сидится, автогенерация типовых работ отключена.
 */
export function prepareFactorySnapshotWithoutTypicalWorks<
	T extends V2TemplateSnapshotLike,
>(snapshot: T): T {
	const uiSchema = disableTypicalWorkCatalogBindingsInUiSchema(
		structuredClone(snapshot.uiSchema as Record<string, unknown>),
	);
	const logic = stripTypicalWorksLogicRules(snapshot.logic, uiSchema);

	return {
		...snapshot,
		uiSchema,
		logic,
		releaseNotes:
			snapshot.releaseNotes?.trim() ||
			"Заводская схема без типовых работ (чистый черновик)",
	};
}
