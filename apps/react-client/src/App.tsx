import "@fontsource/inter";
import "./theme/dockview.css";

import { CircularProgress, StyledEngineProvider } from "@mui/material";
import { unstable_ClassNameGenerator as ClassNameGenerator } from "@mui/material/className";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ErrorBoundary } from "@react-client/common/errors/ErrorBoundary";
import { ErrorPage } from "@react-client/common/errors/pages/ErrorPage";
import { performMfeLogout } from "@react-client/common/auth/syncMfeAuth";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { Toaster } from "@react-client/common/toasts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setDefaultOptions } from "date-fns/esm";
import { ru } from "date-fns/esm/locale";
import { isEmpty } from "lodash-es";
import type React from "react";
import { Suspense, useEffect } from "react";
import { BrowserRouter } from "react-router";
import type { T_CONFIG_MAP, T_KEYCLOAK_USER } from "types";
import { reportWebVitals } from "./reportWebVitals";
import { AppTheme } from "./theme/AppTheme";
import {
	chartsCustomizations,
	dataGridCustomizations,
	datePickersCustomizations,
	treeViewCustomizations,
} from "./theme/customizations";
import AppRoutes from "@react-client/common/routing";
import { getRouterBasename } from "@react-client/routing/basename";

const GIT_REVISION = process.env.GIT_REVISION;
const NODE_ENV = process.env.NODE_ENV;

console.log("GIT_REVISION: ", GIT_REVISION);
console.log("NODE_ENV: ", NODE_ENV);

setDefaultOptions({ locale: ru });

reportWebVitals(console.log);

const APP_NAME = process.env.APP_NAME;

ClassNameGenerator.configure((componentName) => `${APP_NAME}_${componentName}`);
ClassNameGenerator.reset();

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
			retry: 2,
			gcTime: 1000 * 60 * 5, //  5 minutes
		},
	},
});

interface LayoutProps {
	children?: React.ReactNode;
	urlConfig?: T_CONFIG_MAP;
	token?: string;
	user?: T_KEYCLOAK_USER;
	userPermissions?: string[];
	navigate?: (to: string) => void;
	protectedFetch?: any;
	bridged?: boolean;
	onLogout?: () => void;
	keycloak?: any;
}

const App: React.FC<LayoutProps> = (props) => {
	const { user, onLogout, bridged, urlConfig, keycloak } = props;

	const { setUser, setConfigMap } = useGlobalSettingsStore();

	const onLogoutHandler = () => {
		performMfeLogout({ keycloak, onLogout });
	};

	useEffect(() => {
		setUser(isEmpty(user) ? undefined : user);
	}, [user, setUser]);

	useEffect(() => {
		if (!isEmpty(urlConfig)) {
			setConfigMap(urlConfig);
		}
	}, [urlConfig, setConfigMap]);

	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter basename={getRouterBasename(bridged)}>
				<AppTheme themeComponents={xThemeComponents}>
					<ErrorBoundary ErrorPage={ErrorPage}>
						<StyledEngineProvider injectFirst>
							<Toaster />
							<Suspense fallback={<CircularProgress />}>
								<LocalizationProvider dateAdapter={AdapterDateFns}>
									<AppRoutes onLogout={onLogoutHandler} />
								</LocalizationProvider>
							</Suspense>
						</StyledEngineProvider>
					</ErrorBoundary>
				</AppTheme>
			</BrowserRouter>
		</QueryClientProvider>
	);
};

export default App;
