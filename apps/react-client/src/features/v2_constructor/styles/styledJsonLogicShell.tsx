import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";

/**
 * Изолированная тёмная «моно»-оболочка для react-json-logic (data-rjl-*).
 * Переменные и селекторы по канону библиотеки; не зависят от темы приложения.
 */
export const StyledJsonLogicShell = styled(Box)({
	"--font-mono":
		'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
	"--neutral-950": "rgb(10, 10, 10)",
	"--neutral-925": "rgb(16, 16, 16)",
	"--neutral-900": "rgb(23, 23, 23)",
	"--neutral-850": "rgb(32, 32, 32)",
	"--neutral-800": "rgb(38, 38, 38)",
	"--neutral-700": "rgb(64, 64, 64)",
	"--neutral-600": "rgb(82, 82, 82)",
	"--neutral-500": "rgb(115, 115, 115)",
	"--neutral-400": "rgb(163, 163, 163)",
	"--neutral-300": "rgb(212, 212, 212)",
	"--neutral-200": "rgb(229, 229, 229)",
	"--neutral-100": "rgb(245, 245, 245)",
	"--bg": "var(--neutral-950)",
	"--fg": "var(--neutral-200)",
	"--fg-strong": "var(--neutral-100)",
	"--fg-muted": "var(--neutral-400)",
	"--fg-subtle": "var(--neutral-600)",
	"--border": "var(--neutral-800)",
	"--border-hover": "var(--neutral-500)",
	"--slime-cyan": "#3fffe6",
	"--slime-green": "#6bffb0",
	"--error": "#ff5c7c",
	"--radius-xs": "2px",
	"--ease-snappy": "cubic-bezier(0.22, 1, 0.36, 1)",
	"--duration-fast": "160ms",

	boxSizing: "border-box",
	border: "1px solid var(--border)",
	background: "rgba(10, 10, 10, 0.4)",
	padding: "16px",
	borderRadius: "var(--radius-xs)",
	overflowX: "auto",
	color: "var(--fg)",
	fontSize: "13px",
	lineHeight: 1.55,
	fontFamily: "var(--font-mono)",
	WebkitFontSmoothing: "antialiased",

	"& *, & *::before, & *::after": {
		boxSizing: "border-box",
	},

	"& [data-rjl-builder]": {
		display: "flex",
		flexDirection: "column",
		gap: "8px",
		fontSize: "13px",
	},

	"& [data-rjl-any]": {
		display: "inline-flex",
		alignItems: "center",
		flexWrap: "wrap",
		gap: "6px",
	},

	"& [data-rjl-children]": {
		display: "inline-flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: "6px",
		marginLeft: "6px",
		paddingLeft: "8px",
		borderLeft: "1px solid var(--border)",
	},

	"& [data-rjl-field]": {
		display: "inline-flex",
		alignItems: "center",
		gap: "6px",
	},

	"& [data-rjl-operator-trigger], & [data-rjl-input-type-trigger]": {
		display: "inline-flex",
		alignItems: "center",
		gap: "4px",
		height: "26px",
		padding: "0 8px",
		background: "var(--neutral-900)",
		color: "var(--fg-strong)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-xs)",
		font: "inherit",
		fontSize: "12px",
		cursor: "pointer",
		transition:
			"border-color var(--duration-fast) var(--ease-snappy), background-color var(--duration-fast) var(--ease-snappy)",
	},

	"& [data-rjl-operator-trigger]:hover, & [data-rjl-input-type-trigger]:hover": {
		borderColor: "var(--border-hover)",
		background: "var(--neutral-850)",
	},

	"& [data-rjl-operator-popup], & [data-rjl-input-type-popup], & [data-rjl-accessor-popup]":
		{
			background: "var(--neutral-925)",
			color: "var(--fg)",
			border: "1px solid var(--border)",
			borderRadius: "var(--radius-xs)",
			padding: "4px",
			minWidth: "8rem",
			font: "12px / 1.4 var(--font-mono)",
		},

	"& [data-rjl-operator-popup] [role='option'], & [data-rjl-input-type-popup] [role='option'], & [data-rjl-accessor-popup] [role='option']":
		{
			padding: "4px 8px",
			borderRadius: "var(--radius-xs)",
			cursor: "pointer",
			color: "var(--fg)",
		},

	"& [data-rjl-operator-popup] [role='option'][data-highlighted], & [data-rjl-input-type-popup] [role='option'][data-highlighted], & [data-rjl-accessor-popup] [role='option'][data-highlighted]":
		{
			background: "var(--neutral-850)",
			color: "var(--slime-cyan)",
		},

	"& [data-rjl-input-value], & [data-rjl-accessor-input]": {
		font: "inherit",
		fontSize: "12px",
		height: "26px",
		padding: "0 8px",
		background: "var(--neutral-900)",
		color: "var(--fg-strong)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-xs)",
		outline: "none",
		transition: "border-color var(--duration-fast) var(--ease-snappy)",
	},

	"& [data-rjl-input-value]:focus, & [data-rjl-accessor-input]:focus": {
		borderColor: "var(--border-hover)",
	},

	"& [data-rjl-add], & [data-rjl-remove]": {
		width: "22px",
		height: "22px",
		padding: 0,
		font: "inherit",
		fontSize: "12px",
		lineHeight: 1,
		background: "transparent",
		color: "var(--fg-muted)",
		border: "1px dashed var(--border)",
		borderRadius: "var(--radius-xs)",
		cursor: "pointer",
		transition:
			"border-color var(--duration-fast) var(--ease-snappy), color var(--duration-fast) var(--ease-snappy)",
	},

	"& [data-rjl-add]:hover, & [data-rjl-remove]:hover": {
		borderColor: "var(--border-hover)",
		color: "var(--fg-strong)",
	},

	"& [data-rjl-higher-order]": {
		display: "inline-flex",
		alignItems: "center",
		gap: "6px",
	},

	"& [data-rjl-higher-order-arrow]": {
		color: "var(--fg-subtle)",
		fontWeight: 400,
	},

	"& [data-rjl-accessor]": {
		display: "inline-flex",
		alignItems: "center",
		gap: "4px",
	},

	"& [data-rjl-accessor-level]": {
		display: "inline-flex",
		alignItems: "center",
	},
});
