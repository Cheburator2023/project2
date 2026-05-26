import Box from "@mui/material/Box";
import { Header } from "@react-client/common/navigation/organisms/Header";
import type { ReactNode } from "react";

export function AnketaFormPageLayout({
	headerActions,
	main,
	sidebar,
	"data-test-id": dataTestId = "anketa-form-page",
}: {
	headerActions?: ReactNode;
	main: ReactNode;
	sidebar: ReactNode;
	"data-test-id"?: string;
}) {
	return (
		<Box
			data-test-id={`${dataTestId}--root`}
			sx={{
				width: "100%",
				maxWidth: "100%",
				minWidth: 0,
				height: "-webkit-fill-available",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				boxSizing: "border-box",
			}}
		>
			<Header fixed data-test-id={`${dataTestId}--Header`}>
				{headerActions}
			</Header>

			<Box
				component="main"
				data-test-id={`${dataTestId}--main`}
				sx={{
					flex: 1,
					display: "grid",
					gridTemplateColumns: {
						xs: "1fr",
						lg: "minmax(0, 2fr) minmax(360px, 1fr)",
					},
					gap: 2,
					alignItems: "start",
					minHeight: 0,
					minWidth: 0,
					width: "100%",
					maxWidth: "100%",
					height: "-webkit-fill-available",
					overflowY: "auto",
					overflowX: "hidden",
					boxSizing: "border-box",
					"& > *": { minWidth: 0, maxWidth: "100%" },
				}}
			>
				{main}
				{sidebar}
			</Box>
		</Box>
	);
}
