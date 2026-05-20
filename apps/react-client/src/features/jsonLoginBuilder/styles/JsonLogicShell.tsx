import Box from "@mui/material/Box";
import { alpha, styled } from "@mui/material/styles";

/**
 * Оболочка jsonLoginBuilder (data-rjl-*). Следует палитре MUI: светлая и тёмная тема.
 */
export const JsonLogicShell = styled(Box)(({ theme }) => {
	const isDark = theme.palette.mode === "dark";
	const surface = theme.palette.background.paper;
	const surfaceMuted = isDark
		? alpha(theme.palette.common.white, 0.06)
		: alpha(theme.palette.common.black, 0.04);
	const border = theme.palette.divider;
	const borderHover = theme.palette.text.secondary;
	const accent = theme.palette.primary.main;
	const fg = theme.palette.text.primary;
	const fgMuted = theme.palette.text.secondary;
	const fgSubtle = theme.palette.text.disabled;

	return {
		"--font-mono":
			'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
		"--rjl-surface": surface,
		"--rjl-surface-muted": surfaceMuted,
		"--rjl-border": border,
		"--rjl-border-hover": borderHover,
		"--rjl-fg": fg,
		"--rjl-fg-muted": fgMuted,
		"--rjl-fg-subtle": fgSubtle,
		"--rjl-accent": accent,
		"--radius-xs": theme.shape.borderRadius,
		"--ease-snappy": "cubic-bezier(0.22, 1, 0.36, 1)",
		"--duration-fast": "160ms",

		boxSizing: "border-box",
		border: `1px solid ${border}`,
		background: isDark ? alpha(surface, 0.55) : surfaceMuted,
		padding: theme.spacing(2),
		borderRadius: "var(--radius-xs)",
		overflowX: "auto",
		color: "var(--rjl-fg)",
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
			gap: theme.spacing(1),
			fontSize: "13px",
		},

		"& [data-rjl-any]": {
			display: "inline-flex",
			alignItems: "center",
			flexWrap: "wrap",
			gap: theme.spacing(0.75),
		},

		"& [data-rjl-children]": {
			display: "inline-flex",
			flexWrap: "wrap",
			alignItems: "center",
			gap: theme.spacing(0.75),
			marginLeft: theme.spacing(0.75),
			paddingLeft: theme.spacing(1),
			borderLeft: `1px solid ${border}`,
		},

		"& [data-rjl-field]": {
			display: "inline-flex",
			alignItems: "center",
			gap: theme.spacing(0.75),
		},

		"& [data-rjl-operator-trigger], & [data-rjl-input-type-trigger]": {
			display: "inline-flex",
			alignItems: "center",
			gap: "4px",
			height: "26px",
			padding: "0 8px",
			background: "var(--rjl-surface)",
			color: "var(--rjl-fg)",
			border: `1px solid ${border}`,
			borderRadius: "var(--radius-xs)",
			font: "inherit",
			fontSize: "12px",
			cursor: "pointer",
			transition:
				"border-color var(--duration-fast) var(--ease-snappy), background-color var(--duration-fast) var(--ease-snappy)",
		},

		"& [data-rjl-operator-trigger]:hover, & [data-rjl-input-type-trigger]:hover": {
			borderColor: "var(--rjl-border-hover)",
			background: "var(--rjl-surface-muted)",
		},

		"& .MuiInputBase-root": {
			fontFamily: "var(--font-mono)",
			fontSize: "12px",
		},

		"& .MuiOutlinedInput-notchedOutline": {
			borderColor: `${border} !important`,
		},

		"& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline": {
			borderColor: `${borderHover} !important`,
		},

		"& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
			borderColor: `${accent} !important`,
		},

		"& .MuiSelect-select, & .MuiInputBase-input": {
			color: "var(--rjl-fg)",
			padding: "4px 8px !important",
			minHeight: "26px !important",
			boxSizing: "border-box",
		},

		"& [data-rjl-operator-popup], & [data-rjl-input-type-popup], & [data-rjl-accessor-popup]":
			{
				background: "var(--rjl-surface)",
				color: "var(--rjl-fg)",
				border: `1px solid ${border}`,
				borderRadius: "var(--radius-xs)",
				padding: "4px",
				minWidth: "8rem",
				font: `12px / 1.4 var(--font-mono)`,
			},

		"& [data-rjl-operator-popup] .MuiMenuItem-root, & [data-rjl-input-type-popup] .MuiMenuItem-root, & [data-rjl-accessor-popup] .MuiMenuItem-root":
			{
				padding: "4px 8px",
				borderRadius: "var(--radius-xs)",
				cursor: "pointer",
				color: "var(--rjl-fg)",
				font: "inherit",
				fontSize: "12px",
			},

		"& [data-rjl-operator-popup] .MuiMenuItem-root.Mui-selected, & [data-rjl-input-type-popup] .MuiMenuItem-root.Mui-selected, & [data-rjl-accessor-popup] .MuiMenuItem-root.Mui-selected, & [data-rjl-operator-popup] .MuiMenuItem-root.Mui-focusVisible, & [data-rjl-input-type-popup] .MuiMenuItem-root.Mui-focusVisible, & [data-rjl-accessor-popup] .MuiMenuItem-root.Mui-focusVisible":
			{
				background: "var(--rjl-surface-muted)",
				color: "var(--rjl-accent)",
			},

		"& [data-rjl-input-value], & [data-rjl-accessor-input]": {
			font: "inherit",
			fontSize: "12px",
			height: "26px",
			padding: "0 8px",
			background: "var(--rjl-surface)",
			color: "var(--rjl-fg)",
			border: `1px solid ${border}`,
			borderRadius: "var(--radius-xs)",
			outline: "none",
			transition: "border-color var(--duration-fast) var(--ease-snappy)",
		},

		"& [data-rjl-input-value]:focus, & [data-rjl-accessor-input]:focus": {
			borderColor: "var(--rjl-border-hover)",
		},

		"& [data-rjl-add], & [data-rjl-remove]": {
			position: "relative",
			zIndex: 1,
			flexShrink: 0,
			width: "22px",
			height: "22px",
			padding: 0,
			font: "inherit",
			fontSize: "14px",
			lineHeight: 1,
			background: "var(--rjl-surface)",
			color: "var(--rjl-fg-muted)",
			border: `1px dashed ${border}`,
			borderRadius: "var(--radius-xs)",
			cursor: "pointer",
			transition:
				"border-color var(--duration-fast) var(--ease-snappy), color var(--duration-fast) var(--ease-snappy), background-color var(--duration-fast) var(--ease-snappy)",
		},

		"& [data-rjl-add]:hover, & [data-rjl-remove]:hover": {
			borderColor: "var(--rjl-border-hover)",
			color: "var(--rjl-fg)",
			background: "var(--rjl-surface-muted)",
		},

		"& [data-rjl-higher-order]": {
			display: "inline-flex",
			alignItems: "center",
			gap: theme.spacing(0.75),
		},

		"& [data-rjl-higher-order-arrow]": {
			color: "var(--rjl-fg-subtle)",
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
	};
});
