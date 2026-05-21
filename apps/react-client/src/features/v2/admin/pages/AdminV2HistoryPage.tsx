import { commonRoutes as routes } from "@react-client/routing/common/routes";
import { Navigate } from "react-router";

/** Глобальная история перенесена в контекст шаблона и списка схем. */
export function AdminV2HistoryPage() {
	return <Navigate to={routes.adminV2Schemas.rootPath} replace />;
}
