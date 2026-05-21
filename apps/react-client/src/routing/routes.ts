/**
 * Публичный barrel маршрутов.
 * — v1/v2 user: version/v1/routes, version/v2/routes
 * — admin/playground: common/routes + common/pathHelpers
 */
export { v1Routes, routes as v1RoutesDeprecated } from "./version/v1/routes";
export { v2Routes, routes as v2RoutesDeprecated } from "./version/v2/routes";
export {
	commonRoutes,
	navbarGroups as commonNavbarGroups,
} from "./common/routes";
export * from "./common/pathHelpers";
export type { AppRouteConfig } from "./common/types";
