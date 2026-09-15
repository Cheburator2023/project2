/**
 * PRJ-COMMON-66: уведомления («колокольчик») скрыты до проработки требований.
 * Включить обратно: ENABLE_SERVER_NOTICES=true при сборке.
 */
export function isServerNoticesEnabled(): boolean {
	return process.env.ENABLE_SERVER_NOTICES === "true";
}
