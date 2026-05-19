import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import {
	V2FinalEvaluationPanel,
	type V2SummaryFormSlice,
} from "./V2FinalEvaluationPanel";

type Props = {
	children: ReactNode;
	summary?: V2SummaryFormSlice | null;
	calculationLoading?: boolean;
	sideMinWidth?: number;
};

/**
 * Двухколоночный layout: форма слева, sticky «Итоговая оценка» справа (как v1).
 */
export function V2FormWithEvaluationLayout({
	children,
	summary,
	calculationLoading,
	sideMinWidth = 360,
}: Props) {
	return (
		<Box
			sx={{
				display: "grid",
				gridTemplateColumns: {
					xs: "1fr",
					lg: `minmax(0, 1fr) minmax(${sideMinWidth}px, 640px)`,
				},
				gap: 1,
				alignItems: "start",
			}}
		>
			<Box sx={{ minWidth: 0 }}>{children}</Box>
			<Box
				sx={{
					position: { lg: "sticky" },
					overflow: { lg: "auto" },
				}}
			>
				<V2FinalEvaluationPanel
					summary={summary}
					isLoading={calculationLoading}
					compact
				/>
			</Box>
		</Box>
	);
}
