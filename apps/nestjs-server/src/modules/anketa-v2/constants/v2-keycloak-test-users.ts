/**
 * Тестовые пользователи Keycloak по матрице F-05
 * (llm/feature_roles_fresh/тестовые_пользователи_sumd.md).
 *
 * Пароль для новых = username. Статусы из md не используются.
 */
import { DEPARTMENTS } from "../../../shared/constants/departments.constant";
import { V2_AD_SAREP_STREAM_SUFFIXES } from "@smart-anketa/api-contract";

export type V2KeycloakTestUserDef = {
	username: string;
	label: string;
	/** Статические path или resolver от standPrefix (`dev_` / `test_` / …). */
	groups: readonly string[] | ((standPrefix: string) => readonly string[]);
};

const ALL_MODEL_DEPARTMENTS = Object.values(DEPARTMENTS).map(
	(name) => `/departament/${name}`,
);

const DEPT_KIB = `/departament/${DEPARTMENTS.KIB_SMB}`;
const DEPT_RB = `/departament/${DEPARTMENTS.RB}`;
const DEPT_FIN = `/departament/${DEPARTMENTS.PROCESS_FINANCIAL}`;

function nestedAdGroup(
	parentPath: string,
	standPrefix: string,
	adNameWithoutStand: string,
): string {
	const prefix = standPrefix.trim();
	return `${parentPath}/${prefix}${adNameWithoutStand}`;
}

/**
 * Полный набор + варианты DE с разными департаментами (демо stream-filter).
 */
export const V2_KEYCLOAK_TEST_USER_DEFS: readonly V2KeycloakTestUserDef[] = [
	{
		username: "test_ds",
		label: "DS",
		groups: ["/ds", ...ALL_MODEL_DEPARTMENTS],
	},
	{
		username: "test_ds_lead",
		label: "Руководитель DS",
		groups: ["/ds", "/ds/ds_lead"],
	},
	{
		username: "test_de",
		label: "DE (все модельные департаменты)",
		groups: ["/de", ...ALL_MODEL_DEPARTMENTS],
	},
	{
		username: "test_de_kib",
		label: "DE · только КИБ и СМБ",
		groups: ["/de", DEPT_KIB],
	},
	{
		username: "test_de_rb",
		label: "DE · только РБ",
		groups: ["/de", DEPT_RB],
	},
	{
		username: "test_de_fin",
		label: "DE · только процессные/финансовые",
		groups: ["/de", DEPT_FIN],
	},
	{
		username: "test_de_lead",
		label: "Руководитель DE",
		groups: ["/de", "/de/de_lead"],
	},
	{
		username: "test_modelops",
		label: "ModelOps",
		groups: ["/modelops", ...ALL_MODEL_DEPARTMENTS],
	},
	{
		username: "test_modelops_lead",
		label: "Руководитель ModelOps",
		groups: ["/modelops", "/modelops/modelops_lead"],
	},
	{
		username: "test_mipm",
		label: "Бизнес-партнёр",
		groups: ["/mipm"],
	},
	{
		username: "test_mipm_sa",
		label: "Бизнес-партнёр стрима",
		groups: ["/mipm", DEPT_KIB],
	},
	{
		username: "test_validator",
		label: "Валидатор",
		groups: ["/validator"],
	},
	{
		username: "test_validator_lead",
		label: "Руководитель валидации",
		groups: ["/validator", "/validator/validator_lead"],
	},
	{
		username: "test_architect",
		label: "Архитектор данных ML",
		groups: ["/architect"],
	},
	{
		username: "test_sum_mntranlst",
		label: "Аналитик качества работы моделей ДАДМ",
		groups: ["/mntranlst"],
	},
	{
		username: "test_sum_da",
		label: "Аналитик качества модельных данных",
		groups: ["/da"],
	},
	{
		username: "test_sum_da_stream",
		label: "Аналитик качества модельных данных стрима",
		groups: ["/da_stream", DEPT_KIB],
	},
	{
		username: "test_sum_appadmin",
		label: "Прикладной администратор",
		groups: ["/appadmin"],
	},
	{
		username: "test_sum_auditorib",
		label: "Аудитор ИБ",
		groups: ["/auditorib"],
	},
	{
		username: "test_auditor",
		label: "Аудитор",
		groups: ["/auditor"],
	},
	{
		username: "test_sum_saprg",
		label: "Руководитель программ ДАДМ",
		groups: ["/saprg"],
	},
	{
		username: "test_sum_sacfg",
		label: "Конфигуратор Смарт-Анкеты",
		groups: (standPrefix) => [
			nestedAdGroup("/sacfg", standPrefix, "sum_sacfg"),
		],
	},
	{
		username: "test_sum_sarep",
		label: "Представитель стрима — не участника ЖЦМ",
		groups: ["/sarep"],
	},
	{
		username: "test_business_customer",
		label: "Бизнес-заказчик",
		groups: ["/business_customer"],
	},
	{
		username: "test_prjtoffice",
		label: "Сотрудник проектного офиса",
		groups: ["/prjtoffice"],
	},
	...V2_AD_SAREP_STREAM_SUFFIXES.map(
		(suffix): V2KeycloakTestUserDef => ({
			username: `test_sum_sarep_${suffix}`,
			label: `Представитель стрима (${suffix})`,
			groups: (standPrefix) => [
				nestedAdGroup("/sarep", standPrefix, `sum_sarep_${suffix}`),
			],
		}),
	),
];

export type V2KeycloakResolvedTestUser = {
	username: string;
	label: string;
	groups: string[];
};

export function resolveV2KeycloakTestUsers(
	standPrefix: string,
): V2KeycloakResolvedTestUser[] {
	return V2_KEYCLOAK_TEST_USER_DEFS.map((def) => ({
		username: def.username,
		label: def.label,
		groups: [
			...(typeof def.groups === "function"
				? def.groups(standPrefix)
				: def.groups),
		],
	}));
}
