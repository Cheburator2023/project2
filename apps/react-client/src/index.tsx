import App from "@react-client/App";
import { AuthProvider } from "@react-client/common/providers/AuthProvider";
import { clearDynamicImportReloadFlag } from "@react-client/routing/dynamicImportRecovery";
import { globalStyles } from "@react-client/theme/GlobalStyle";
import React from "react";
import ReactDOM from "react-dom/client";

if (typeof window !== "undefined") {
	window.addEventListener("vite:preloadError", (event) => {
		event.preventDefault();
		if (!sessionStorage.getItem("vite:preload-reload")) {
			sessionStorage.setItem("vite:preload-reload", "1");
			window.location.reload();
		}
	});
	window.addEventListener("load", () => {
		sessionStorage.removeItem("vite:preload-reload");
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
