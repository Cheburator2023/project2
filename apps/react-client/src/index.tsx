import App from "@react-client/App";
import { AuthProvider } from "@react-client/common/providers/AuthProvider";
import { clearDynamicImportReloadFlag } from "@react-client/routing/dynamicImportRecovery";
import { globalStyles } from "@react-client/theme/GlobalStyle";
import React from "react";
import ReactDOM from "react-dom/client";

const IS_DEV = process.env.NODE_ENV === "development";
const VITE_PRELOAD_RELOAD_AT = "vite:preload-reload-at";
const VITE_PRELOAD_COOLDOWN_MS = 120_000;

if (typeof window !== "undefined") {
	window.addEventListener("vite:preloadError", (event) => {
		event.preventDefault();
		// В dev full reload от Vite deps 404 даёт бесконечный loop — только log.
		if (IS_DEV) {
			console.warn(
				"[vite:preloadError] skipped reload in development",
				event,
			);
			return;
		}
		const lastAt = Number(sessionStorage.getItem(VITE_PRELOAD_RELOAD_AT) || 0);
		if (Date.now() - lastAt < VITE_PRELOAD_COOLDOWN_MS) return;
		sessionStorage.setItem(VITE_PRELOAD_RELOAD_AT, String(Date.now()));
		window.location.reload();
	});
	window.addEventListener("load", () => {
		clearDynamicImportReloadFlag();
	});
}

const root = ReactDOM.createRoot(
	document.getElementById("root") as HTMLElement,
);

root.render(
	<React.StrictMode>
		{globalStyles}
		<AuthProvider>
			<App data-test-id="index--App-0" />
		</AuthProvider>
	</React.StrictMode>,
);
