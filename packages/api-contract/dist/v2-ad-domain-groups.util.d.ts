/**
 * AD → канонические коды ролей Смарт-Анкеты.
 *
 * Спека: llm/feature_roles_fresh/Доменные группы (AD).csv
 *
 * Имя AD-группы:
 * - без стенда: `sum_appadmin`
 * - со стендом: `prod_sum_appadmin` / `test_sum_appadmin` / `dev_sum_appadmin`
 *
 * При метчинге снимаем только stand-prefix (`dev_|test_|prod_`).
 * Префикс `sum_` — часть имени, его нельзя игнорировать:
 * `prod_appadmin` ≠ `prod_sum_appadmin` → не матчится.
 *
 * Примеры:
 * - sum_appadmin / test_sum_appadmin / prod_sum_appadmin → appadmin
 * - sum_ds_kmbkcb / prod_sum_ds_rb → ds
 * - sum_Lds_kmbkcb → ds_lead (+ ds)
 * - sum_mo_* → modelops (в AD «mo», в KK — modelops)
 * - sum_da → da; sum_da_kmbkcb → da_stream
 */
/** Префиксы стенда в AD/Keycloak (единственное, что игнорим при метчинге). */
export declare const V2_AD_STAND_PREFIX_RE: RegExp;
export declare const V2_AD_MODEL_STREAM_SUFFIXES: readonly ["kmbkcb", "ptitpc", "rnd", "rb", "finmdl"];
export declare const V2_AD_SAREP_STREAM_SUFFIXES: readonly ["idsrc", "mdlctl", "pirm", "strdat", "digagt", "dadm"];
/** Снять leading slash и stand-prefix (dev_|test_|prod_). `sum_` не трогаем. */
export declare function stripV2AdStandPrefix(raw: string): string;
/**
 * Лист AD/Keycloak-группы → канонические коды ролей (без path).
 *
 * - `sum_appadmin` / `prod_sum_appadmin` → appadmin
 * - `appadmin` (KK path без AD) → appadmin
 * - `prod_appadmin` (стенд без sum_) → [] — sum_ обязателен в AD-имени
 */
export declare function mapV2AdGroupLeafToRoleCodes(rawLeaf: string): string[];
/**
 * Канон KK path → AD-имена без stand-prefix (из CSV).
 * Для sync: `/appadmin` + prefix `test_` → `/test_sum_appadmin`.
 */
export declare const V2_KEYCLOAK_PATH_TO_AD_GROUPS: Record<string, readonly string[]>;
/** Нормализовать ввод UI: `test` / `test_` / `TEST_` → `test_`. */
export declare function normalizeV2AdStandPrefix(raw: string | undefined | null): string;
/**
 * Развернуть TARGET: канон + AD-alias path с stand-prefix.
 * `standPrefix="test_"` → `/test_sum_appadmin` с теми же roles что `/appadmin`.
 */
export declare function expandV2KeycloakTargetsWithAdAliases(target: Record<string, readonly string[]>, standPrefixRaw?: string | null): Record<string, readonly string[]>;
