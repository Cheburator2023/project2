import GlobalStyles from "@mui/material/GlobalStyles";

export const globalStyles = (
	<GlobalStyles
		styles={`
body {
	margin: 0;
	min-height: 100vh;
}
#root {
	min-height: 100vh;
	height: 100vh;
	// background-color: initial !important;
    font-family: Inter, sans-serif;
}

* {
	scrollbar-color: #8d8d8d94 #bada5500;
	scrollbar-width: thin;
        font-family: Inter, sans-serif;
}

.ag-watermark,
.ag-watermark-text,
.ag-watermark.ag-opacity-zero,
div.ag-watermark.ag-opacity-zero,
div.ag-watermark,
div.ag-watermark-text {
	display: none !important;
	opacity: 0 !important;
	visibility: hidden !important;
}

.ag-filter-apply-panel {
	gap: 8px;
}

.ag-ltr .ag-filter-apply-panel-button {
	margin-left: 0;
	width: 100%;
}
.ag-row-is-odd {
	background-color: rgba(61, 62, 150, 0.075);
}

& .ag-custom-cell-value {
	position: relative;
}
& .ag-custom-cell-value-changed .ag-custom-cell-value:before {
	content: "";
	width: 4px;
	height: 4px;
	border-radius: 50%;
	background: #00bb2f;
	margin: 18px -10px;
	position: absolute;
}
& .ag-custom-cell-value-changed {
	background-color: #15bf3b14;
}

.custom-row-class {
	cursor: pointer;
}

[data-mui-color-scheme="dark"] .ag-row,
[data-mui-color-scheme="dark"] .ag-root-wrapper {
	background-color: transparent;
}
[data-mui-color-scheme="dark"] .ag-row-odd {
	background-color: rgba(121, 121, 121, 0.05);
}

#root[data-color-scheme="light"] {
	background-color: #e6e8ef !important;
}
    #root[data-color-scheme="dark"] {
	background-color: #0f141c !important;
}


`}
	/>
);
