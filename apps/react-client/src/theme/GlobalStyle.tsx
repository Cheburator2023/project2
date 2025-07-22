import GlobalStyles from "@mui/material/GlobalStyles";

export const globalStyles = (
	<GlobalStyles
		styles={`
body {
	margin: 0;
	min-height: 100vh;
	height: 100vh;
	overflow: auto;

}
		"&::placeholder": {
					opacity: 0.7!important,
					color: gray[500],
				},
	html {
	    overflow: hidden;
		}
#root {

	// background-color: initial !important;
    font-family: Inter, sans-serif;
}

* {
	scrollbar-color: #8d8d8d94 #bada5500;
	scrollbar-width: thin;
        font-family: Inter, sans-serif;
}

*, *::before, *::after {
    box-sizing: border-box;
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

:where(.ag-theme-params-2) {
--ag-font-size: 12px  !important;
--ag-spacing: 5px  !important;
}

.ag-icon {
	display: inline-block !important;
	width: 16px !important;
	height: 16px !important;
	background-size: contain !important;
	background-repeat: no-repeat !important;
	background-position: center !important;
	-webkit-mask: none !important;
	mask: none !important;
	background-image: none !important;
}

.ag-icon svg {
	width: 100% !important;
	height: 100% !important;
	display: block !important;
	fill: currentColor !important;
	color: inherit !important;
}

/* Ensure SVG icons inherit color properly */
.ag-header-cell .ag-icon svg,
.ag-cell .ag-icon svg,
.ag-filter .ag-icon svg,
.ag-menu .ag-icon svg {
	fill: currentColor !important;
	color: inherit !important;
    transform: translateZ(0);

}

.ag-theme-alpine .ag-header,
.ag-theme-balham .ag-header,
.ag-theme-material .ag-header {
    transform: translateZ(0) !important;
}

.ag-header {
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
    backface-visibility: hidden;
}

.ag-header-row {
    transform: translateZ(0);
}

.ag-root-wrapper * {
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
}

.ag-popup-parent {
    transform: translateZ(0);
}

// .ag-column-drop {
//     transform: translateZ(0);
// }

// .ag-tool-panel {
//     transform: translateZ(0);
// }

:where(.ag-icon):before {
     transform: translateZ(0);
}

.ag-icon-filter::before, .ag-icon-filter::after {
    transform: translateZ(0);
}

:where(.ag-theme-checkboxStyle-3) {
    & .ag-checkbox-input-wrapper {
        &:where(.ag-checked):after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 12px;
            font-weight: bold;
			border-radius: 50px;
            line-height: 1;
            display: block;
            z-index: 1;
			background-color: white;
			mask-image: none;
        }
    }
}

<style>
:where(.ag-theme-checkboxStyle-3) {
    & .ag-checkbox-input-wrapper, & .ag-radio-button-input-wrapper {
        &:where(.ag-checked) {
            &:after {
                background-color: var(--ag-checkbox-checked-shape-color);
            }
        }
    }
}

`}
	/>
);
