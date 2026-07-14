import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { PanelResizeHandleStyled } from "@react-client/features/v1/anketaCRUD/atoms/PanelResizeHandleStyled";
import type { ReactNode } from "react";
import { Panel, PanelGroup } from "react-resizable-panels";

const ANKETA_HEADER_HEIGHT_PX = 66;
const ANKETA_COLUMN_VIEWPORT_HEIGHT = `calc(100vh - ${ANKETA_HEADER_HEIGHT_PX}px)`;

export { ANKETA_COLUMN_VIEWPORT_HEIGHT };

export function AnketaFormPageLayout({
	headerActions,
	main,
	sidebar,
	footer,
	loading = false,
	"data-test-id": dataTestId = "anketa-form-page",
}: {
	headerActions?: ReactNode;
	main: ReactNode;
	sidebar: ReactNode;
	footer?: ReactNode;
	loading?: boolean;
	"data-test-id"?: string;
}) {
	const theme = useTheme();
	const isLargeScreen = useMediaQuery(theme.breakpoints.up("lg"));

	return (
		<Box
			data-test-id={`${dataTestId}--root`}
			sx={{
				width: "100%",
				maxWidth: "100%",
				minWidth: 0,
				height: "100vh",
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
					minHeight: 0,
					minWidth: 0,
					width: "100%",
					maxWidth: "100%",
					overflowY: "auto",
					overflowX: "hidden",
					boxSizing: "border-box",
				}}
			>
				{loading ? (
					<Box
						data-test-id={`${dataTestId}--loading`}
						sx={{
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							minHeight: ANKETA_COLUMN_VIEWPORT_HEIGHT,
							py: 6,
						}}
					>
						<CircularProgress color="info" />
					</Box>
				) : (
					<>
						<Box
							data-test-id={`${dataTestId}--viewport`}
							sx={{
								minHeight: ANKETA_COLUMN_VIEWPORT_HEIGHT,
								height: ANKETA_COLUMN_VIEWPORT_HEIGHT,
								flexShrink: 0,
								minWidth: 0,
								display: "flex",
								flexDirection: "column",
							}}
						>
							{isLargeScreen ? (
								<PanelGroup
									direction="horizontal"
									autoSaveId="v2_anketa_form_page_layout"
									style={{
										flex: 1,
										minHeight: 0,
										height: "100%",
										width: "100%",
									}}
									data-test-id={`${dataTestId}--panel-group`}
								>
									<Panel
										defaultSize={65}
										minSize={35}
										data-test-id={`${dataTestId}--panel-main`}
									>
										<Box
											sx={{
												minWidth: 0,
												minHeight: 0,
												height: "100%",
												overflow: "auto",
											}}
										>
											{main}
										</Box>
									</Panel>
									<PanelResizeHandleStyled
										data-test-id={`${dataTestId}--panel-resize-handle`}
									>
										<DragIndicatorIcon fontSize="small" />
									</PanelResizeHandleStyled>
									<Panel
										defaultSize={35}
										minSize={25}
										maxSize={45}
										data-test-id={`${dataTestId}--panel-sidebar`}
									>
										<Box
											sx={{
												minWidth: 0,
												height: "100%",
												overflow: "auto",
												borderRadius: "8px",
											}}
										>
											{sidebar}
										</Box>
									</Panel>
								</PanelGroup>
							) : (
								<Box
									sx={{
										display: "flex",
										flexDirection: "column",
										minHeight: 0,
										height: "100%",
										gap: 2,
									}}
								>
									<Box
										sx={{
											flex: 1,
											minWidth: 0,
											minHeight: 0,
											overflow: "auto",
										}}
									>
										{main}
									</Box>
									<Box
										sx={{
											flex: 1,
											minWidth: 0,
											minHeight: 0,
											overflow: "auto",
											borderRadius: "8px",
										}}
									>
										{sidebar}
									</Box>
								</Box>
							)}
						</Box>
						{footer ? (
							<Box
								data-test-id={`${dataTestId}--footer`}
								sx={{ flexShrink: 0, minWidth: 0 }}
							>
								{footer}
							</Box>
						) : null}
					</>
				)}
			</Box>
		</Box>
	);
}
