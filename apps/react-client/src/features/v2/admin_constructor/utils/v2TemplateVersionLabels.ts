import type { V2TemplateStatus } from "@smart-anketa/api-contract";

export const V2_TEMPLATE_VERSION_STATUS_RU: Record<V2TemplateStatus, string> = {
	draft: "Черновик",
	published: "Опубликована",
	archived: "В архиве",
};

export function v2TemplateVersionChipLabel(
	versionNumber: number,
	status: V2TemplateStatus,
	isSystemCurrent: boolean,
): string {
	const statusRu = V2_TEMPLATE_VERSION_STATUS_RU[status] ?? status;
	const base = `v${versionNumber} · ${statusRu}`;
	return isSystemCurrent ? `${base} · актуальная` : base;
}
