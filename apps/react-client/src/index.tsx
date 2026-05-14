import App from "@react-client/App";
import { AuthProvider } from "@react-client/common/providers/AuthProvider";
import { globalStyles } from "@react-client/theme/GlobalStyle";
import React from "react";
import ReactDOM from "react-dom/client";

const root = ReactDOM.createRoot(
	document.getElementById("root") as HTMLElement,
);

root.render(
	<React.StrictMode>
		{globalStyles}
		<AuthProvider godMode>
			<App data-test-id="index--App-0" />
		</AuthProvider>
	</React.StrictMode>,
);
