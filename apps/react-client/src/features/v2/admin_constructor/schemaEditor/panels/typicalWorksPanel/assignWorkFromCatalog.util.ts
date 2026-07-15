import type { V2TypicalWorkListItemDto } from "@smart-anketa/api-contract";

export type WorkAddPlan =
	| { action: "already_in_current"; work: V2TypicalWorkListItemDto }
	| { action: "bind"; work: V2TypicalWorkListItemDto }
	| {
			action: "copy";
			work: V2TypicalWorkListItemDto;
			reason: string;
	  };

export function workSchemaLinkLabel(
	work: V2TypicalWorkListItemDto,
	currentTemplateId: string,
): string {
	if (work.templateId && currentTemplateId && work.templateId === currentTemplateId) {
		const name = work.templateName?.trim();
		return name ? `${name} (текущая)` : "текущая схема";
	}
	return work.templateName?.trim() || "— глобальная";
}

export function workNeedsCopyForSchema(
	work: V2TypicalWorkListItemDto,
	templateId: string,
): boolean {
	const owner = work.templateId ?? null;
	if (owner && templateId && owner !== templateId) {
		return true;
	}
	if (work.assignmentStatus === "used_on_schemas") {
		return true;
	}
	return false;
}

export function planWorkAddition(
	work: V2TypicalWorkListItemDto,
	templateId: string,
): WorkAddPlan {
	const owner = work.templateId ?? null;
	if (owner && templateId && owner === templateId) {
		return { action: "already_in_current", work };
	}
	if (owner && templateId && owner !== templateId) {
		return {
			action: "copy",
			work,
			reason: `привязана к схеме «${work.templateName ?? "другая схема"}»`,
		};
	}
	if (work.assignmentStatus === "used_on_schemas") {
		const count = work.usedOnSchemasCount ?? 0;
		return {
			action: "copy",
			work,
			reason:
				count > 0
					? `уже используется на ${count} схемах`
					: "уже используется на других схемах",
		};
	}
	return { action: "bind", work };
}

export function buildTypicalWorkCopyName(
	work: V2TypicalWorkListItemDto,
	targetSchemaName: string,
): string {
	const schema = targetSchemaName.trim() || "текущая схема";
	return `${work.name} (копия · ${schema})`;
}
