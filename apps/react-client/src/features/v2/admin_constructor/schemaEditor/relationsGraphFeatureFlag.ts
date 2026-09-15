/**
 * PRJ-COMMON-69: вкладка «Граф связей» в Конфигураторе схем скрыта по умолчанию.
 * Включить обратно: ENABLE_RELATIONS_GRAPH=true при сборке (CI/Docker/helm env).
 *
 * Значение подставляется статически на этапе сборки (vite define / webpack DefinePlugin),
 * поэтому в рантайме браузера обращения к process.env нет. Guard на typeof process —
 * страховка от ReferenceError, если сборка прошла без подстановки: флаг просто выключен.
 */
export function isRelationsGraphEnabled(): boolean {
	return (
		typeof process !== "undefined" &&
		process.env?.ENABLE_RELATIONS_GRAPH === "true"
	);
}
