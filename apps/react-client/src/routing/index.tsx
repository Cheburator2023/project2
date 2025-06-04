import { Route, Routes } from "react-router";
import { routes } from "./routes";

import { HomePage } from "@react-client/features/home/HomePage";
import { PlaygroundPage } from "@react-client/features/playground/PlaygroundPage";
import { Page404 } from "./Page404";

export const Routing = () => (
	<Routes>
		<Route index element={<HomePage />} />
		<Route path={routes.playground.rootPath} element={<PlaygroundPage />} />
		<Route path="*" element={<Page404 />} />
	</Routes>
);
