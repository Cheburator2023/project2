import "./theme/global.css";
import "@fontsource/inter";
import "ag-grid-community/styles/ag-theme-quartz.css";

import type React from "react";
import { useEffect } from "react";

import { CircularProgress, StyledEngineProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type Keycloak from "keycloak-js";
import { Suspense } from "react";
import { BrowserRouter } from "react-router";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { MainLayout } from "@react-client/common/layouts/MainLayout";
import { Routing } from "./routing";
import { AppTheme } from "./theme/AppTheme";
import {
	chartsCustomizations,
	dataGridCustomizations,
	datePickersCustomizations,
	treeViewCustomizations,
} from "./theme/customizations";

import { ErrorBoundary } from "@react-client/common/errors/ErrorBoundary";
import { ErrorPage } from "@react-client/common/errors/pages/ErrorPage";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { isEmpty } from "lodash-es";
import { reportWebVitals } from "./reportWebVitals";

reportWebVitals(console.log);

const xThemeComponents: any = {
	...chartsCustomizations,
	...dataGridCustomizations,
	...datePickersCustomizations,
	...treeViewCustomizations,
};

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: false,
			staleTime: 1000 * 20, // 20 seoncds
			gcTime: 1000 * 60 * 5, //  5 minutes
		},
	},
});

interface LayoutProps {
	children?: React.ReactNode;
	user?: Keycloak.KeycloakTokenParsed & {
		family_name: string;
		given_name: string;
		realm_access: {
			roles: string[];
		};
		roles: string[];
	};
	protectedFetch?: <T, N>(
		routeUrl: string,
		params?: Record<string, string>,
		body?: N,
		method?: string,
	) => Promise<T>;
	goToSum?: () => void;
	onLogout?: () => void;
	bridged?: boolean;
	urlConfig?: any;
}

const App: React.FC<LayoutProps> = ({
	bridged,
	urlConfig,
	children,
	user,
	protectedFetch,
	onLogout,
}) => {
	console.log("User:", user);

	console.log("🚀 ~ bridged:", bridged);

	const { setUser } = useGlobalSettingsStore();

	useEffect(() => {
		if (!isEmpty(user)) {
		} else {
			setUser(user);
		}
	}, [user]);

	return (
		<BrowserRouter basename={bridged ? "/smartAnketa" : "/"}>
			<AppTheme themeComponents={xThemeComponents}>
				<ErrorBoundary ErrorPage={ErrorPage}>
					<StyledEngineProvider injectFirst>
						<QueryClientProvider client={queryClient}>
							<CssBaseline enableColorScheme />
							<Suspense fallback={<CircularProgress />}>
								<LocalizationProvider dateAdapter={AdapterDateFns}>
									<MainLayout onLogout={onLogout}>
										<Routing />
									</MainLayout>
								</LocalizationProvider>
							</Suspense>
						</QueryClientProvider>
					</StyledEngineProvider>
				</ErrorBoundary>
			</AppTheme>
		</BrowserRouter>
	);
};

export default App;
