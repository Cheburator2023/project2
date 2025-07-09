import type { Components, Theme } from "@mui/material/styles";
import { gray } from "../themePrimitives";

/* eslint-disable import/prefer-default-export */
export const feedbackCustomizations: Components<Theme> = {
	MuiAlert: {
		styleOverrides: {
			root: ({ theme }) => ({
				padding: "6px 2px",
				alignItems: "center",

				"& .MuiAlert-icon": {
					marginRight: "0px",
					padding: "0 6px",
					alignItems: "center",
				},
				"& .MuiAlert-action": {
					padding: 0,
					margin: 0,
				},
				"& .MuiAlert-message": {
					fontSize: "10px",
					padding: "2px 8px",
				},
			}),
		},
	},
	MuiDialog: {
		styleOverrides: {
			root: ({ theme }) => ({
				"& .MuiDialog-paper": {
					borderRadius: "10px",
					border: "1px solid",
					borderColor: (theme.vars || theme).palette.divider,
				},
			}),
		},
	},
	MuiLinearProgress: {
		styleOverrides: {
			root: ({ theme }) => ({
				height: 8,
				borderRadius: 8,
				backgroundColor: gray[200],
				...theme.applyStyles("dark", {
					backgroundColor: gray[800],
				}),
			}),
		},
	},
};
