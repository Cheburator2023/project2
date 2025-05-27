import { CircularProgress, StyledEngineProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

const xThemeComponents = {
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

export function App() {
	return (
		<StyledEngineProvider injectFirst>
			<QueryClientProvider client={queryClient}>
				<BrowserRouter>
					<AppTheme themeComponents={xThemeComponents}>
						<CssBaseline enableColorScheme />
						<Suspense fallback={<CircularProgress />}>
							<LocalizationProvider dateAdapter={AdapterDateFns}>
								<MainLayout>
									<Routing />
								</MainLayout>
							</LocalizationProvider>
						</Suspense>
					</AppTheme>
				</BrowserRouter>
			</QueryClientProvider>
		</StyledEngineProvider>
	);
}
