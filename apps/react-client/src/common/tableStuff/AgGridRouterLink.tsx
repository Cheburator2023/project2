import Link from "@mui/material/Link";
import type { SxProps, Theme } from "@mui/material/styles";
import type { MouseEvent, ReactNode } from "react";
import { Link as RouterLink } from "react-router";

type Props = {
	to: string;
	children: ReactNode;
	title?: string;
	sx?: SxProps<Theme>;
};

/**
 * Ссылка внутри AG Grid: настоящий href (нативное «Открыть в новой вкладке»)
 * и stopPropagation на contextmenu, чтобы меню грида не перехватывало ПКМ.
 */
export function AgGridRouterLink({ to, children, title, sx }: Props) {
	const stopGrid = (e: MouseEvent) => {
		e.stopPropagation();
	};

	return (
		<Link
			component={RouterLink}
			to={to}
			underline="hover"
			title={title}
			onClick={stopGrid}
			onContextMenu={stopGrid}
			sx={{
				fontSize: "inherit",
				lineHeight: "inherit",
				fontWeight: 600,
				...(sx as Record<string, unknown>),
			}}
		>
			{children}
		</Link>
	);
}
