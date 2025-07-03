import "./theme/global.css";
import "@fontsource/inter";
import "ag-grid-community/styles/ag-theme-quartz.css";

import { CircularProgress, StyledEngineProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { unstable_ClassNameGenerator as ClassNameGenerator } from "@mui/material/className";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ErrorBoundary } from "@react-client/common/errors/ErrorBoundary";
import { ErrorPage } from "@react-client/common/errors/pages/ErrorPage";
import { useEffectOnce } from "@react-client/common/hooks/useEffectOnce";
import { MainLayout } from "@react-client/common/layouts/MainLayout";
import { Toaster } from "@react-client/common/muiCustom/toasts";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
			retry: false,
			staleTime: 1000 * 20, // 20 seoncds
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
	console.log("🚀 ~ MF props form shell:", props);

	const { setUser, setConfigMap } = useGlobalSettingsStore();

	useEffectOnce(() => {
		setUser(user);
	}, !isEmpty(user));

	useEffectOnce(() => {
		setConfigMap(urlConfig);
	}, !isEmpty(urlConfig));

	return (
		<BrowserRouter basename={bridged ? "/smartAnketa" : "/"}>
			<AppTheme themeComponents={xThemeComponents}>
				<ErrorBoundary ErrorPage={ErrorPage}>
					<StyledEngineProvider injectFirst>
						<QueryClientProvider client={queryClient}>
							<CssBaseline enableColorScheme />
							<Toaster />
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
