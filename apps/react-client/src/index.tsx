import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const root = ReactDOM.createRoot(
	document.getElementById("root") as HTMLElement,
);
root.render(
	<React.StrictMode data-test-id="index--React.StrictMode-0">
		<App data-test-id="index--App-0" />
	</React.StrictMode>,
);
