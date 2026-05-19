import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { V2_TEMPLATE_EDIT_TEST_IDS } from "../../testIds";

export function PanelChrome({
	title,
	description,
	actions,
	children,
	embedded = false,
	fillHeight = false,
	dataTestId,
}: {
	title?: string;
	description?: string;
	actions?: ReactNode;
	children: ReactNode;
	/** Без заголовка — контент на всю панель (внутри workspace с общими вкладками). */
	embedded?: boolean;
	/** В embedded-режиме: flex-колонка без скролла контейнера (для Monaco и т.п.). */
	fillHeight?: boolean;
	dataTestId?: string;
}) {
	if (embedded) {
		return (
			<Box
				data-test-id={dataTestId}
				sx={{
					display: "flex",
					flexDirection: "column",
					height: "100%",
					minHeight: 0,
					overflow: "hidden",
				}}
			>
				<Box
					sx={{
						flex: 1,
						minHeight: 0,
						overflow: fillHeight ? "hidden" : "auto",
						p: 1,
						...(fillHeight
							? { display: "flex", flexDirection: "column" }
							: {}),
					}}
				>
					{children}
				</Box>
			</Box>
		);
	}

	return (
		<Box
			data-test-id={dataTestId}
			sx={{
				display: "flex",
				flexDirection: "column",
				height: "100%",
				minHeight: 0,
				overflow: "hidden",
			}}
		>
			<Box
				data-test-id={
					dataTestId ? V2_TEMPLATE_EDIT_TEST_IDS.panelChromeHeader : undefined
				}
				sx={{
					px: 1.5,
					py: 1,
					borderBottom: 1,
					borderColor: "divider",
					flexShrink: 0,
					display: "flex",
					alignItems: "flex-start",
					gap: 1,
				}}
			>
				<Box sx={{ flex: 1, minWidth: 0 }}>
					<Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: 0.4 }}>
						{title ?? ""}
					</Typography>
					{description ? (
						<Typography variant="caption" color="text.secondary" display="block">
							{description}
						</Typography>
					) : null}
				</Box>
				{actions}
			</Box>
			<Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 1.5 }}>{children}</Box>
		</Box>
	);
}
