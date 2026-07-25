/**
 * Тестовые пользователи Keycloak по матрице F-05
 * (llm/feature_roles_fresh/тестовые_пользователи_sumd.md).
 *
 * Пароль для новых = username. Статусы из md не используются.
 *
 * Иерархия: `/de` — папка, внутри `/de/de_lead` и AD-листы `/de/{stand}sum_de_*`.
 * AD с standPrefix: `/de/dev_sum_de_kmbkcb`, `/sacfg/dev_sum_sacfg`, `/admin_it/dev_sum_appadmin`.
 * Логины `test_*`. Департаменты (`/departament/…`) без префикса.
 */
import {
	V2_AD_NEST_PARENT_BY_TARGET,
	V2_AD_SAREP_STREAM_SUFFIXES,
	V2_KEYCLOAK_PATH_TO_AD_GROUPS,
	normalizeV2AdStandPrefix,
} from "@smart-anketa/api-contract";
import { DEPARTMENTS } from "../../../shared/constants/departments.constant";

export type V2KeycloakTestUserDef = {
	username: string;
	label: string;
	/** Канон path → AD-группы с standPrefix (или сам канон при canonOnly). */
	rolePaths: readonly string[];
	/** Доп. группы без AD-префикса (обычно /departament/…). */
	extraGroups?: readonly string[];
	/** Фильтр AD-имён для rolePaths (например только sum_de_kmbkcb). */
	adFilter?: (adName: string) => boolean;
	/**
	 * Только канон path (без AD-alias).
	 * Для папок `/de`, `/de/de_lead`, umbrella `/sarep`, `/business_customer`.
	 */
	canonOnly?: boolean;
};

const ALL_MODEL_DEPARTMENTS = Object.values(DEPARTMENTS).map(
	(name) => `/departament/${name}`,
);

const DEPT_KIB = `/departament/${DEPARTMENTS.KIB_SMB}`;
const DEPT_RB = `/departament/${DEPARTMENTS.RB}`;
const DEPT_FIN = `/departament/${DEPARTMENTS.PROCESS_FINANCIAL}`;

/** Канонический KK path → path(ы) AD-группы с префиксом стенда. */
export function resolveAdGroupPathsForCanon(
	canonPath: string,
	standPrefixRaw: string,
	options?: {
		adFilter?: (adName: string) => boolean;
		canonOnly?: boolean;
	},
): string[] {
	const canon = canonPath.startsWith("/") ? canonPath : `/${canonPath}`;
	if (options?.canonOnly) return [canon];

	const standPrefix = normalizeV2AdStandPrefix(standPrefixRaw);
	const adNames = V2_KEYCLOAK_PATH_TO_AD_GROUPS[canon];
	if (!adNames?.length) return [canon];

	const filtered = options?.adFilter
		? adNames.filter(options.adFilter)
		: [...adNames];
	if (!filtered.length) return [canon];

	const nestParents = V2_AD_NEST_PARENT_BY_TARGET[canon];
	const out: string[] = [];
	for (const ad of filtered) {
		const leaf = `${standPrefix}${ad}`;
		if (nestParents?.length) {
			for (const parent of nestParents) {
				out.push(`${parent}/${leaf}`);
			}
		} else {
			/** Top-level AD-alias (если нет nest-parent): `/{stand}sum_*`. */
			out.push(`/${leaf}`);
		}
	}
	return [...new Set(out)];
}

/**
 * Полный набор + варианты DE с разными департаментами (демо stream-filter).
 */
export const V2_KEYCLOAK_TEST_USER_DEFS: readonly V2KeycloakTestUserDef[] = [
	{
		username: "test_ds",
		label: "DS",
		rolePaths: ["/ds"],
		canonOnly: true,
		extraGroups: ALL_MODEL_DEPARTMENTS,
	},
	{
		username: "test_ds_lead",
		label: "Руководитель DS",
		rolePaths: ["/ds", "/ds/ds_lead"],
		canonOnly: true,
	},
	{
		username: "test_de",
		label: "DE (все модельные департаменты)",
		rolePaths: ["/de"],
		canonOnly: true,
		extraGroups: ALL_MODEL_DEPARTMENTS,
	},
	{
		username: "test_de_kib",
		label: "DE · только КИБ и СМБ",
		rolePaths: ["/de"],
		adFilter: (ad) => ad === "sum_de_kmbkcb",
		extraGroups: [DEPT_KIB],
	},
	{
		username: "test_de_rb",
		label: "DE · только РБ",
		rolePaths: ["/de"],
		adFilter: (ad) => ad === "sum_de_rb",
		extraGroups: [DEPT_RB],
	},
	{
		username: "test_de_fin",
		label: "DE · только процессные/финансовые",
		rolePaths: ["/de"],
		adFilter: (ad) => ad === "sum_de_finmdl",
		extraGroups: [DEPT_FIN],
	},
	{
		username: "test_de_lead",
		label: "Руководитель DE",
		/** Папка `/de` + вложенная `/de/de_lead` (не top-level AD). */
		rolePaths: ["/de", "/de/de_lead"],
		canonOnly: true,
	},
	{
		username: "test_modelops",
		label: "ModelOps",
		rolePaths: ["/modelops"],
		canonOnly: true,
		extraGroups: ALL_MODEL_DEPARTMENTS,
	},
	{
		username: "test_modelops_lead",
		label: "Руководитель ModelOps",
		rolePaths: ["/modelops", "/modelops/modelops_lead"],
		canonOnly: true,
	},
	{
		username: "test_mipm",
		label: "Бизнес-партнёр",
		rolePaths: ["/mipm"],
		adFilter: (ad) => ad === "sum_mipm",
	},
	{
		username: "test_mipm_sa",
		label: "Бизнес-партнёр стрима",
		rolePaths: ["/mipm"],
		adFilter: (ad) => ad === "sum_mipm_kmbkcb",
		extraGroups: [DEPT_KIB],
	},
	{
		username: "test_validator",
		label: "Валидатор",
		rolePaths: ["/validator"],
		canonOnly: true,
	},
	{
		username: "test_validator_lead",
		label: "Руководитель валидации",
		rolePaths: ["/validator", "/validator/validator_lead"],
		canonOnly: true,
	},
	{
		username: "test_architect",
		label: "Архитектор данных ML",
		rolePaths: ["/architect"],
	},
	{
		username: "test_sum_mntranlst",
		label: "Аналитик качества работы моделей ДАДМ",
		rolePaths: ["/mntranlst"],
	},
	{
		username: "test_sum_da",
		label: "Аналитик качества модельных данных",
		rolePaths: ["/da"],
	},
	{
		username: "test_sum_da_stream",
		label: "Аналитик качества модельных данных стрима",
		rolePaths: ["/da_stream"],
		adFilter: (ad) => ad === "sum_da_kmbkcb",
		extraGroups: [DEPT_KIB],
	},
	{
		username: "test_sum_appadmin",
		label: "Прикладной администратор",
		rolePaths: ["/appadmin"],
	},
	{
		username: "test_sum_auditorib",
		label: "Аудитор ИБ",
		rolePaths: ["/auditorib"],
	},
	{
		username: "test_auditor",
		label: "Аудитор",
		rolePaths: ["/auditor"],
	},
	{
		username: "test_sum_saprg",
		label: "Руководитель программ ДАДМ",
		rolePaths: ["/saprg"],
	},
	{
		username: "test_sum_sacfg",
		label: "Конфигуратор Смарт-Анкеты",
		rolePaths: ["/sacfg"],
	},
	{
		username: "test_sum_sarep",
		label: "Представитель стрима — не участника ЖЦМ",
		rolePaths: ["/sarep"],
		canonOnly: true,
	},
	{
		username: "test_business_customer",
		label: "Бизнес-заказчик",
		rolePaths: ["/business_customer"],
		canonOnly: true,
	},
	{
		username: "test_prjtoffice",
		label: "Сотрудник проектного офиса",
		rolePaths: ["/prjtoffice"],
	},
	...V2_AD_SAREP_STREAM_SUFFIXES.map(
		(suffix): V2KeycloakTestUserDef => ({
			username: `test_sum_sarep_${suffix}`,
			label: `Представитель стрима (${suffix})`,
			rolePaths: ["/sarep"],
			adFilter: (ad) => ad === `sum_sarep_${suffix}`,
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
	return V2_KEYCLOAK_TEST_USER_DEFS.map((def) => {
		const roleGroups = def.rolePaths.flatMap((path) =>
			resolveAdGroupPathsForCanon(path, standPrefix, {
				adFilter: def.adFilter,
				canonOnly: def.canonOnly,
			}),
		);
		const groups = [...new Set([...roleGroups, ...(def.extraGroups ?? [])])];
		return {
			username: def.username,
			label: def.label,
			groups,
		};
	});
}
