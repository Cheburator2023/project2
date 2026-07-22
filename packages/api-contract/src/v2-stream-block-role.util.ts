/** Роли Keycloak для стрим-блоков анкеты и редактора логики типовых работ (все `Role`). */
export const V2_STREAM_BLOCK_ROLE = {
	ADMIN_IT: "admin_it",
	ADMIN_IT_LEAD: "admin_it_lead",
	VALIDATOR_LEAD: "validator_lead",
	VALIDATOR: "validator",
	BUSINESS_CUSTOMER: "business_customer",
	BI_CUSTOMER_BROKER: "bi_business_customer_broker",
	DS: "ds",
	DE: "de",
	DS_LEAD: "ds_lead",
	DE_LEAD: "de_lead",
	MODEL_OPS: "modelops",
	MODEL_OPS_LEAD: "modelops_lead",
	MIPM: "mipm",
	SAPRG: "saprg",
	SACFG: "sacfg",
	SAREP: "sarep",
} as const;

export type V2StreamBlockRoleCode =
	(typeof V2_STREAM_BLOCK_ROLE)[keyof typeof V2_STREAM_BLOCK_ROLE];

export const V2_STREAM_BLOCK_ROLE_CODES: readonly V2StreamBlockRoleCode[] =
	Object.values(V2_STREAM_BLOCK_ROLE);

export const V2_STREAM_BLOCK_ROLE_LABELS: Record<
	V2StreamBlockRoleCode,
	string
> = {
	[V2_STREAM_BLOCK_ROLE.ADMIN_IT]: "Администратор ИТ",
	[V2_STREAM_BLOCK_ROLE.ADMIN_IT_LEAD]: "Руководитель администраторов ИТ",
	[V2_STREAM_BLOCK_ROLE.VALIDATOR_LEAD]: "Руководитель валидаторов",
	[V2_STREAM_BLOCK_ROLE.VALIDATOR]: "Валидатор",
	[V2_STREAM_BLOCK_ROLE.BUSINESS_CUSTOMER]: "Заказчик бизнеса",
	[V2_STREAM_BLOCK_ROLE.BI_CUSTOMER_BROKER]: "Брокер заказчика BI",
	[V2_STREAM_BLOCK_ROLE.DS]: "Специалист DS",
	[V2_STREAM_BLOCK_ROLE.DE]: "Специалист DE",
	[V2_STREAM_BLOCK_ROLE.DS_LEAD]: "Руководитель DS",
	[V2_STREAM_BLOCK_ROLE.DE_LEAD]: "Руководитель DE",
	[V2_STREAM_BLOCK_ROLE.MODEL_OPS]: "ModelOps",
	[V2_STREAM_BLOCK_ROLE.MODEL_OPS_LEAD]: "Руководитель ModelOps",
	[V2_STREAM_BLOCK_ROLE.MIPM]: "МИПМ",
	[V2_STREAM_BLOCK_ROLE.SAPRG]: "Руководитель программ ДАДМ",
	[V2_STREAM_BLOCK_ROLE.SACFG]: "Конфигуратор Смарт-Анкеты",
	[V2_STREAM_BLOCK_ROLE.SAREP]: "Представитель стрима-не участника ЖЦМ",
};

export type V2StreamBlockRoleValue =
	| V2StreamBlockRoleCode
	| V2StreamBlockRoleCode[];

export function isV2StreamBlockRoleCode(
	value: string,
): value is V2StreamBlockRoleCode {
	return (V2_STREAM_BLOCK_ROLE_CODES as readonly string[]).includes(value);
}

export function normalizeStreamBlockRole(
	value: string,
): V2StreamBlockRoleCode | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (isV2StreamBlockRoleCode(trimmed)) return trimmed;
	for (const code of V2_STREAM_BLOCK_ROLE_CODES) {
		if (V2_STREAM_BLOCK_ROLE_LABELS[code] === trimmed) return code;
	}
	return null;
}

export function normalizeStreamBlockRoles(
	value: unknown,
): V2StreamBlockRoleCode[] {
	if (typeof value === "string") {
		const code = normalizeStreamBlockRole(value);
		return code ? [code] : [];
	}
	if (!Array.isArray(value)) return [];
	const result: V2StreamBlockRoleCode[] = [];
	for (const item of value) {
		if (typeof item !== "string") continue;
		const code = normalizeStreamBlockRole(item);
		if (code && !result.includes(code)) result.push(code);
	}
	return result;
}

export function serializeStreamBlockRoles(
	roles: readonly V2StreamBlockRoleCode[],
): V2StreamBlockRoleValue | undefined {
	if (roles.length === 0) return undefined;
	if (roles.length === 1) return roles[0];
	return [...roles];
}

export function resolveStreamBlockRolesLabel(
	value: string | readonly string[] | undefined | null,
): string {
	const codes = normalizeStreamBlockRoles(value);
	if (codes.length === 0) return "";
	return codes.map((code) => V2_STREAM_BLOCK_ROLE_LABELS[code]).join(", ");
}
