// import "./theme/global.css";
import "@fontsource/inter";
import "ag-grid-community/styles/ag-theme-quartz.css";

import { CircularProgress, StyledEngineProvider } from "@mui/material";
import { unstable_ClassNameGenerator as ClassNameGenerator } from "@mui/material/className";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ErrorBoundary } from "@react-client/common/errors/ErrorBoundary";
import { ErrorPage } from "@react-client/common/errors/pages/ErrorPage";
import { useEffectOnce } from "@react-client/common/hooks/useEffectOnce";
import { MainLayout } from "@react-client/common/layouts/MainLayout";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { Toaster } from "@react-client/common/toasts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setDefaultOptions } from "date-fns/esm";
import { ru } from "date-fns/esm/locale";
import { isEmpty } from "lodash-es";
import type React from "react";
import { Suspense } from "react";
import { BrowserRouter } from "react-router";
import type { T_CONFIG_MAP, T_KEYCLOAK_USER } from "types";
import { reportWebVitals } from "./reportWebVitals";
import { Routing } from "./routing";
import { AppTheme } from "./theme/AppTheme";
import {
	chartsCustomizations,
	dataGridCustomizations,
	datePickersCustomizations,
	treeViewCustomizations,
} from "./theme/customizations";

const GIT_REVISION = process.env.GIT_REVISION;

console.log("GIT_REVISION: ", GIT_REVISION);

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
			staleTime: 10, // 0 seconcds
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
}

const App: React.FC<LayoutProps> = (props) => {
	const { user, onLogout, bridged, urlConfig } = props;

	const { setUser, setConfigMap } = useGlobalSettingsStore();

	useEffectOnce(() => {
		setUser(user);
	}, !isEmpty(user));

	useEffectOnce(() => {
		setConfigMap(urlConfig);
	}, !isEmpty(urlConfig));

	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter basename={bridged ? "/smartAnketa" : "/"}>
				{/* <CssBaseline enableColorScheme /> */}
				<AppTheme themeComponents={xThemeComponents}>
					<ErrorBoundary ErrorPage={ErrorPage}>
						<StyledEngineProvider injectFirst>
							<Toaster />
							<Suspense fallback={<CircularProgress />}>
								<LocalizationProvider dateAdapter={AdapterDateFns}>
									<MainLayout onLogout={onLogout}>
										<Routing />
									</MainLayout>
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
