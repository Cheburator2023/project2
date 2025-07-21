import { themeQuartz, iconOverrides } from "ag-grid-community";

const svgIcons = iconOverrides({
	type: "image",
	mask: false,
	icons: {
		filter: {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="12" height="2" fill="currentColor"/>
        <rect x="4" y="7" width="8" height="2" fill="currentColor"/>
        <rect x="6" y="11" width="4" height="2" fill="currentColor"/>
      </svg>`,
		},
		"menu-alt": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="3" r="1" fill="currentColor"/>
        <circle cx="8" cy="8" r="1" fill="currentColor"/>
        <circle cx="8" cy="13" r="1" fill="currentColor"/>
      </svg>`,
		},
		menu: {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="3" r="1" fill="currentColor"/>
        <circle cx="8" cy="8" r="1" fill="currentColor"/>
        <circle cx="8" cy="13" r="1" fill="currentColor"/>
      </svg>`,
		},
		columns: {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="3" height="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <rect x="6" y="3" width="3" height="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <rect x="10" y="3" width="3" height="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>`,
		},
		"tree-open": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
		},
		"tree-closed": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
		},
		group: {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="4" width="12" height="8" stroke="currentColor" stroke-width="1.5" fill="none" rx="1"/>
        <path d="M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1" stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>`,
		},
		aggregation: {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,
		},
		asc: {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 3l3 3H5l3-3zM8 13V3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
		},
		desc: {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 13l-3-3h6l-3 3zM8 3v10" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
		},
		"small-left": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 4l-4 4 4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
		},
		"small-right": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
		},
		"small-up": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 10l4-4 4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
		},
		"small-down": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
		},
		pin: {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M9.5 2.5L13.5 6.5L10 10L8 8L6 14L2 10L8 8L6 6L9.5 2.5z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
      </svg>`,
		},
		"pin-left": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 3v10M6 8H2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,
		},
		"pin-right": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 3v10M10 8h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,
		},
		"row-drag": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="5" cy="4" r="1" fill="currentColor"/>
        <circle cx="11" cy="4" r="1" fill="currentColor"/>
        <circle cx="5" cy="8" r="1" fill="currentColor"/>
        <circle cx="11" cy="8" r="1" fill="currentColor"/>
        <circle cx="5" cy="12" r="1" fill="currentColor"/>
        <circle cx="11" cy="12" r="1" fill="currentColor"/>
      </svg>`,
		},
		"column-move-group": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h4v8H2zM10 4h4v8h-4z" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <path d="M8 6v4M6 8h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,
		},
		"column-move-hide": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12v8H2z" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <path d="M6 8h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,
		},
		"column-move-left": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 4l-4 4 4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
		},
		"column-move-right": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
		},
		"column-move-pin-left": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 3v10M6 8H2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M10 6l-2 2 2 2" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
		},
		"column-move-pin-right": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 3v10M10 8h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M6 6l2 2-2 2" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
		},
		"column-select-closed": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="3" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>`,
		},
		"column-select-open": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="3" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <path d="M6 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
		},
		"column-select-indeterminate": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="3" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <path d="M6 8h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,
		},
		"row-select-closed": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="3" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>`,
		},
		"row-select-open": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="3" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <path d="M6 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
		},
		"row-select-indeterminate": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="3" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <path d="M6 8h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,
		},
		"checkbox-checked": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" stroke="currentColor" stroke-width="1.5" fill="none" rx="2"/>
        <path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
		},
		"checkbox-unchecked": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" stroke="currentColor" stroke-width="1.5" fill="none" rx="2"/>
      </svg>`,
		},
		"checkbox-indeterminate": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" stroke="currentColor" stroke-width="1.5" fill="none" rx="2"/>
        <path d="M5 8h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,
		},
		"radio-button-on": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <circle cx="8" cy="8" r="3" fill="currentColor"/>
      </svg>`,
		},
		"radio-button-off": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>`,
		},
		expanded: {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
		},
		contracted: {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
		},
		pivot: {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>`,
		},
		"eye-slash": {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 2l12 12M9.5 9.5A2 2 0 016.5 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6.5 3.5C7 3.3 7.5 3.2 8 3.2c3.5 0 6.5 2.8 6.5 4.8 0 .5-.3 1.2-.8 1.8M3.5 5.8C2.8 6.5 2.5 7.2 2.5 8c0 2 3 4.8 6.5 4.8.5 0 1-.1 1.5-.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
		},
		eye: {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>`,
		},
		copy: {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="4" y="4" width="8" height="8" stroke="currentColor" stroke-width="1.5" fill="none" rx="1"/>
        <path d="M2 6V4a2 2 0 012-2h2" stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>`,
		},
		cut: {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="4" cy="4" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <circle cx="4" cy="12" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <path d="M6 6l6 6M6 10l6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,
		},
		paste: {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="4" y="4" width="8" height="10" stroke="currentColor" stroke-width="1.5" fill="none" rx="1"/>
        <path d="M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1" stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>`,
		},
	},
});

export const agGridCustomQuartzTheme = themeQuartz
	.withPart(svgIcons)
	.withParams({
		iconSize: 16,
		spacing: 8,
		borderRadius: 4,
		headerHeight: 40,
		rowHeight: 36,
		cellHorizontalPadding: 12,
		headerFontWeight: 600,
		fontSize: 14,
		fontFamily:
			'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
	});
