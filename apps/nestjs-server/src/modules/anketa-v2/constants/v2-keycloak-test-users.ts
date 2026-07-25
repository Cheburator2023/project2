/**
 * Тестовые пользователи Keycloak по матрице F-05
 * (llm/feature_roles_fresh/тестовые_пользователи_sumd.md).
 *
 * Пароль для новых = username. Статусы из md не используются.
 *
 * SUMD shape (realm-export):
 * - executors: `/de/{stand}sum_de_*`
 * - leads: top-level `/de_lead` (+ AD `/de_lead/{stand}sum_Lde_*`)
 * - auditor: `/controller/{stand}sum_auditor`
 * - auditorib: `/auditor/{stand}sum_auditorib`
 * - mipm stream: `/mipm_stream/{stand}sum_mipm_*`
 *
 * Стрим-пользователи логинами как AD-лист: `test_sum_de_kmbkcb`, …
 * Департаменты (`/departament/…`) без префикса стенда.
 */
import {
	V2_AD_MODEL_STREAM_SUFFIXES,
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
	 * Для папок `/de`, `/de_lead`, umbrella `/sarep`, `/business_customer`.
	 */
	canonOnly?: boolean;
};

const ALL_MODEL_DEPARTMENTS = Object.values(DEPARTMENTS).map(
	(name) => `/departament/${name}`,
);

const STREAM_DEPT: Record<(typeof V2_AD_MODEL_STREAM_SUFFIXES)[number], string> =
	{
		kmbkcb: `/departament/${DEPARTMENTS.KIB_SMB}`,
		ptitpc: `/departament/${DEPARTMENTS.PARTNERSHIPS_IT}`,
		rnd: `/departament/${DEPARTMENTS.ML_ALGORITHMS}`,
		rb: `/departament/${DEPARTMENTS.RB}`,
		finmdl: `/departament/${DEPARTMENTS.PROCESS_FINANCIAL}`,
	};

const STREAM_LABEL: Record<
	(typeof V2_AD_MODEL_STREAM_SUFFIXES)[number],
	string
> = {
	kmbkcb: "КМБ и КСБ / КИБ и СМБ",
	ptitpc: "AI-модели партнерств",
	rnd: "Моделирование RnD",
	rb: "Моделирование РБ",
	finmdl: "Финансовое моделирование",
};

const SAREP_LABEL: Record<(typeof V2_AD_SAREP_STREAM_SUFFIXES)[number], string> =
	{
		idsrc: "Источники данных",
		mdlctl: "Контроль моделей",
		pirm: "Платформы и Решения для моделирования",
		strdat: "Потоковые данные",
		digagt: "Цифровые агенты",
		dadm: "ДАДМ",
	};

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

function modelStreamUsers(args: {
	rolePath: string;
	adPrefix: string;
	labelPrefix: string;
	usernamePrefix: string;
}): V2KeycloakTestUserDef[] {
	return V2_AD_MODEL_STREAM_SUFFIXES.map((suffix) => ({
		username: `${args.usernamePrefix}${suffix}`,
		label: `${args.labelPrefix} · ${STREAM_LABEL[suffix]}`,
		rolePaths: [args.rolePath],
		adFilter: (ad: string) => ad === `${args.adPrefix}${suffix}`,
		extraGroups: [STREAM_DEPT[suffix]],
	}));
}

/**
 * Полный набор + стрим-варианты логинами `test_sum_*` (как AD-лист).
 */
export const V2_KEYCLOAK_TEST_USER_DEFS: readonly V2KeycloakTestUserDef[] = [
	{
		username: "test_ds",
		label: "DS (все модельные стримы)",
		rolePaths: ["/ds"],
		canonOnly: true,
		extraGroups: ALL_MODEL_DEPARTMENTS,
	},
	{
		username: "test_ds_lead",
		label: "Руководитель DS",
		/** SUMD: `/ds` + top-level `/ds_lead`. */
		rolePaths: ["/ds", "/ds_lead"],
		canonOnly: true,
	},
	...modelStreamUsers({
		rolePath: "/ds",
		adPrefix: "sum_ds_",
		labelPrefix: "DS",
		usernamePrefix: "test_sum_ds_",
	}),
	{
		username: "test_de",
		label: "DE (все модельные департаменты)",
		rolePaths: ["/de"],
		canonOnly: true,
		extraGroups: ALL_MODEL_DEPARTMENTS,
	},
	{
		username: "test_de_lead",
		label: "Руководитель DE",
		rolePaths: ["/de", "/de_lead"],
		canonOnly: true,
	},
	...modelStreamUsers({
		rolePath: "/de",
		adPrefix: "sum_de_",
		labelPrefix: "DE",
		usernamePrefix: "test_sum_de_",
	}),
	/** Короткие алиасы → те же группы, что `test_sum_de_*`. */
	{
		username: "test_de_kib",
		label: "DE · только КИБ и СМБ (alias test_sum_de_kmbkcb)",
		rolePaths: ["/de"],
		adFilter: (ad) => ad === "sum_de_kmbkcb",
		extraGroups: [STREAM_DEPT.kmbkcb],
	},
	{
		username: "test_de_rb",
		label: "DE · только РБ (alias test_sum_de_rb)",
		rolePaths: ["/de"],
		adFilter: (ad) => ad === "sum_de_rb",
		extraGroups: [STREAM_DEPT.rb],
	},
	{
		username: "test_de_fin",
		label: "DE · только процессные/финансовые (alias test_sum_de_finmdl)",
		rolePaths: ["/de"],
		adFilter: (ad) => ad === "sum_de_finmdl",
		extraGroups: [STREAM_DEPT.finmdl],
	},
	{
		username: "test_modelops",
		label: "ModelOps (все модельные стримы)",
		rolePaths: ["/modelops"],
		canonOnly: true,
		extraGroups: ALL_MODEL_DEPARTMENTS,
	},
	{
		username: "test_modelops_lead",
		label: "Руководитель ModelOps",
		rolePaths: ["/modelops", "/modelops_lead"],
		canonOnly: true,
	},
	...modelStreamUsers({
		rolePath: "/modelops",
		adPrefix: "sum_mo_",
		labelPrefix: "ModelOps",
		usernamePrefix: "test_sum_mo_",
	}),
	{
		username: "test_mipm",
		label: "Бизнес-партнёр",
		rolePaths: ["/mipm"],
		adFilter: (ad) => ad === "sum_mipm",
	},
	{
		username: "test_mipm_sa",
		label: "Бизнес-партнёр стрима · КМБ и КСБ",
		rolePaths: ["/mipm_stream"],
		adFilter: (ad) => ad === "sum_mipm_kmbkcb",
		extraGroups: [STREAM_DEPT.kmbkcb],
	},
	...modelStreamUsers({
		rolePath: "/mipm_stream",
		adPrefix: "sum_mipm_",
		labelPrefix: "Бизнес-партнёр стрима",
		usernamePrefix: "test_sum_mipm_",
	}),
	{
		username: "test_validator",
		label: "Валидатор",
		rolePaths: ["/validator"],
		canonOnly: true,
	},
	{
		username: "test_validator_lead",
		label: "Руководитель валидации",
		rolePaths: ["/validator", "/validator_lead"],
		canonOnly: true,
	},
	...modelStreamUsers({
		rolePath: "/architect",
		adPrefix: "sum_arch_",
		labelPrefix: "Архитектор данных ML",
		usernamePrefix: "test_sum_arch_",
	}),
	{
		username: "test_architect",
		label: "Архитектор данных ML (все стримы)",
		rolePaths: ["/architect"],
		extraGroups: ALL_MODEL_DEPARTMENTS,
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
	...modelStreamUsers({
		rolePath: "/da_stream",
		adPrefix: "sum_da_",
		labelPrefix: "Аналитик качества модельных данных стрима",
		usernamePrefix: "test_sum_da_",
	}),
	{
		username: "test_sum_da_stream",
		label: "Аналитик качества модельных данных стрима (alias test_sum_da_kmbkcb)",
		rolePaths: ["/da_stream"],
		adFilter: (ad) => ad === "sum_da_kmbkcb",
		extraGroups: [STREAM_DEPT.kmbkcb],
	},
	{
		username: "test_sum_appadmin",
		label: "Прикладной администратор",
		/** Логический ключ → `/admin_it/{stand}sum_appadmin` (группы `/appadmin` нет). */
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
			label: `Представитель стрима · ${SAREP_LABEL[suffix]}`,
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
