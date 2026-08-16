import type { QueryClient } from "@tanstack/react-query";

export const V2_QUESTIONNAIRES_ROOT_KEY = ["v2-questionnaires"] as const;
export const V2_QUESTIONNAIRES_LIST_KEY = [
	...V2_QUESTIONNAIRES_ROOT_KEY,
	"list",
] as const;
export const V2_QUESTIONNAIRES_REGISTRY_CONFIG_KEY = [
	...V2_QUESTIONNAIRES_ROOT_KEY,
	"registry-config",
] as const;

/** Список + колонки реестра: не трогаем form-package / comments / export-lock. */
export function invalidateV2QuestionnaireRegistry(
	qc: QueryClient,
	options?: { includeConfig?: boolean },
) {
	void qc.invalidateQueries({ queryKey: V2_QUESTIONNAIRES_LIST_KEY });
	if (options?.includeConfig !== false) {
		void qc.invalidateQueries({
			queryKey: V2_QUESTIONNAIRES_REGISTRY_CONFIG_KEY,
		});
	}
}

/**
 * Мутации состава реестра (создание / копия / версия / удаление / импорт / hold).
 * PATCH одной анкеты — автосейв, список не сбрасываем.
 */
export function shouldInvalidateV2QuestionnaireRegistry(
	url?: string,
	method?: string,
): boolean {
	if (!url || !method) return false;
	const verb = method.toLowerCase();
	if (verb === "get" || verb === "head" || verb === "options") return false;
	if (!url.includes("/v2/questionnaires")) return false;
	if (
		url.includes("/comments") ||
		url.includes("/edit-lock") ||
		url.includes("/export") ||
		url.includes("/form-package") ||
		url.includes("/calculate")
	) {
		return false;
	}
	if (verb === "patch") return false;
	if (
		url.includes("/import-master-registry") &&
		!/[?&]dryRun=(false|0)(?:&|$)/.test(url)
	) {
		return false;
	}
	return true;
}
