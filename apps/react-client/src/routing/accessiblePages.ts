import { usePermissions } from "@react-client/hooks/usePermissions";

export type AccessiblePage = { path: string; name: string };

type PermissionsShape = ReturnType<typeof usePermissions>;

/**
 * «Входные» страницы приложения в порядке приоритета.
 * Используется для:
 * - редиректа с недоступной страницы на первую доступную (PermissionGuard);
 * - редиректа с корня `/`;
 * - заглушки «Для вас нет доступных страниц в приложении», когда список пуст
 *   (Бизнес-заказчик, Сотрудник Проектного офиса — view_list ❌ по матрице F-05).
 *
 * Трекер — в конце: в development `canAccessTracker` всегда true, и до гидрации
 * permissions редирект на `/` иначе уводил в `/tracker/projects` вместо реестра.
 */
export function getAccessiblePages(p: PermissionsShape): AccessiblePage[] {
	const pages: AccessiblePage[] = [];
	if (p.canViewAllCalculations) {
		pages.push({ path: "/v2", name: "Реестр анкет v2" });
		pages.push({ path: "/v1", name: "Реестр анкет v1" });
	}
	if (p.canAccessAdminPanel) {
		pages.push({ path: "/admin/schemas", name: "Администрирование" });
	}
	if (p.canAccessAudit && !p.canAccessAdminPanel) {
		pages.push({ path: "/admin/audit", name: "Журнал аудита" });
	}
	if (p.canAccessTracker) {
		pages.push({ path: "/tracker/projects", name: "Трекер" });
	}
	return pages;
}

/** Первая доступная страница или null, если доступных нет. */
export function useFirstAccessiblePagePath(): string | null {
	const permissions = usePermissions();
	return getAccessiblePages(permissions)[0]?.path ?? null;
}
