import { commonRoutes } from "./routes";

export function resolve404HomePath(pathname: string): string {
	if (pathname.startsWith("/v1")) return "/v1";
	if (pathname.startsWith("/v2")) return "/v2";
	if (pathname.startsWith("/tracker")) return commonRoutes.trackerTasks.rootPath;
	if (pathname.startsWith("/admin")) return commonRoutes.admin.rootPath;
	if (pathname.startsWith("/settings")) return commonRoutes.settings.rootPath;
	if (pathname.startsWith("/playground")) return commonRoutes.playground.rootPath;
	return "/v2";
}

export function resolve404HomeLabel(pathname: string): string {
	if (pathname.startsWith("/tracker")) return "К задачам";
	if (pathname.startsWith("/admin")) return "В админку";
	return "На главную";
}
