import "@fontsource/inter";
import "./theme/dockview.css";

import { StyledEngineProvider } from "@mui/material";
import { unstable_ClassNameGenerator as ClassNameGenerator } from "@mui/material/className";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ErrorBoundary } from "@react-client/common/errors/ErrorBoundary";
import { ErrorPage } from "@react-client/common/errors/pages/ErrorPage";
import { performMfeLogout } from "@react-client/common/auth/syncMfeAuth";
import { queryClient } from "@react-client/common/api/queryClient";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import { Toaster } from "@react-client/common/toasts";
import { QueryClientProvider } from "@tanstack/react-query";
import { setDefaultOptions } from "date-fns/esm";

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
import { registerAppCrossTabHandlers } from "@react-client/common/crossTab/registerAppCrossTabHandlers";
import { getRouterBasename } from "@react-client/routing/basename";
import { registerDynamicImportRecoveryHandlers } from "@react-client/routing/dynamicImportRecovery";
import { FullScreenLoader } from "@react-client/common/muiCustom/FullScreenLoader";
import { ru } from "date-fns/esm/locale";

registerDynamicImportRecoveryHandlers();
registerAppCrossTabHandlers();

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
							<Suspense fallback={<FullScreenLoader height="100vh" />}>
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
