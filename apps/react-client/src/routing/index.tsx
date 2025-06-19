import { Route, Routes } from "react-router";

import { AnketaCreatePage } from "@react-client/features/anketa/AnketaCreatePage";
import { HomePage } from "@react-client/features/home/HomePage";
import { PlaygroundPage } from "@react-client/features/playground/PlaygroundPage";

import { AdminPage } from "@react-client/features/admin/AdminPage";
import { AnketaPreviewPage } from "@react-client/features/anketa/AnketaPreviewPage";
import { CompareReportsPage } from "@react-client/features/compare/CompareReportsPage";
import { Page404 } from "./Page404";
import { routes } from "./routes";

export const Routing = () => (
	<Routes>
		<Route index element={<HomePage />} />
		<Route path={routes.anketaCreate.rootPath} element={<AnketaCreatePage />} />
		<Route
			path={routes.anketaPreview.rootPath}
			element={<AnketaPreviewPage />}
		/>
		<Route
			path={routes.anketaCompare.rootPath}
			element={<CompareReportsPage />}
		/>
		<Route path={routes.admin.rootPath} element={<AdminPage />} />
		<Route path={routes.playground.rootPath} element={<PlaygroundPage />} />
		<Route path="*" element={<Page404 />} />
	</Routes>
);
