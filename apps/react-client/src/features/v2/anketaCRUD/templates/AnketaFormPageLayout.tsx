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
			<Header data-test-id={`${dataTestId}--Header`}>{headerActions}</Header>

			<Box
				component="main"
				data-test-id={`${dataTestId}--main`}
				sx={{
					flex: 1,
					minHeight: 0,
					minWidth: 0,
					width: "100%",
					maxWidth: "100%",
					overflowY: "auto",
					overflowX: "hidden",
					boxSizing: "border-box",
				}}
			>
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: {
							xs: "1fr",
							lg: "minmax(0, 1.65fr) minmax(0, 1fr)",
						},
						gap: 2,
						alignItems: "start",
						width: "100%",
						maxWidth: "100%",
						minWidth: 0,
						boxSizing: "border-box",
					}}
				>
					<Box
						sx={{
							minWidth: 0,
							maxWidth: "100%",
							display: "flex",
							flexDirection: "column",
							gap: 2,
						}}
					>
						{main}
					</Box>
					<Box sx={{ minWidth: 0, maxWidth: "100%" }}>{sidebar}</Box>
				</Box>
			</Box>
		</Box>
	);
}
