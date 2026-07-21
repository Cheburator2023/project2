import { Alert, Button, Typography } from "@mui/material";
import { ILL_BUG } from "@react-client/common/illustrations/ILL_BUG";
import { MainLayout } from "@react-client/common/layouts/MainLayout";
import { Card } from "@react-client/common/muiCustom/Card";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { routes } from "@react-client/routing/version/v1/routes";
import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router";

const errorTextSx = {
	whiteSpace: "pre-wrap",
	overflowWrap: "anywhere",
	wordBreak: "break-word",
} as const;

export const ErrorPage = (props: {
	error: string;
	errorStack: string;
	resetErrorBoundary: () => void;
}) => {
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const originalPathname = useRef(pathname);

	useEffect(() => {
		if (pathname !== originalPathname.current) {
			props.resetErrorBoundary();
		}
	}, [pathname, props.resetErrorBoundary]);

	const stackFrames = useMemo(() => {
		const raw = props.errorStack?.trim() ?? "";
		if (!raw) return [];
		return raw
			.split(/\n?\s+at\s+/)
			.map((frame) => frame.trim())
			.filter(Boolean);
	}, [props.errorStack]);

	return (
		<MainLayout>
			<Flex
				flexDirection="column"
				flexGrow={1}
				minHeight="0"
				height="100%"
				data-test-id="error-page--root"
			>
				<Header title="Ошибка" />
				<Flex
					flexDirection="column"
					alignItems="center"
					justifyContent="center"
					flexGrow={1}
					minHeight="0"
					pad="16px 16px 48px"
					width="100%"
					data-test-id="error-page--content"
				>
					<Flex
						flexDirection="column"
						width="100%"
						maxWidth="720px"
						minWidth="0"
						data-test-id="error-page--card-wrap"
					>
						<Card padding="24px" data-test-id="error-page--card">
							<Flex
								flexDirection="column"
								alignItems="center"
								width="100%"
								minWidth="0"
								gap={16}
							>
								<ILL_BUG data-test-id="error-page--ILL_BUG-0" />

								<Typography
									variant="h6"
									textAlign="center"
									fontWeight={600}
									data-test-id="error-page--title"
								>
									Что-то пошло не так
								</Typography>

								<Typography
									variant="body2"
									color="text.secondary"
									textAlign="center"
									data-test-id="error-page--subtitle"
								>
									Произошла ошибка при отображении страницы. Можно вернуться на
									главную или перезагрузить страницу.
								</Typography>

								<Alert
									severity="error"
									sx={{
										width: "100%",
										minWidth: 0,
										alignItems: "flex-start",
										"& .MuiAlert-message": {
											width: "100%",
											minWidth: 0,
											overflow: "hidden",
										},
									}}
									data-test-id="error-page--Alert-0"
								>
									<Typography
										variant="body1"
										fontWeight={600}
										sx={errorTextSx}
										data-test-id="error-page--Typography-0"
									>
										{props.error || "Неизвестная ошибка"}
									</Typography>

									{stackFrames.length > 0 ? (
										<>
											<Spacer space={12} />
											<Flex
												flexDirection="column"
												gap={6}
												width="100%"
												minWidth="0"
												maxHeight="240px"
												style={{
													overflowY: "auto",
													overflowX: "hidden",
												}}
												data-test-id="error-page--stack"
											>
												{stackFrames.map((frame, idx) => (
													<Typography
														key={`${idx}-${frame.slice(0, 24)}`}
														variant="caption"
														component="div"
														color="text.secondary"
														sx={{
															...errorTextSx,
															fontFamily:
																"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
															lineHeight: 1.45,
														}}
														data-test-id="error-page--stack-frame"
													>
														{idx === 0 ? frame : `→ ${frame}`}
													</Typography>
												))}
											</Flex>
										</>
									) : null}
								</Alert>

								<Flex
									width="100%"
									minWidth="0"
									alignItems="stretch"
									justifyContent="center"
									gap={8}
									wrap="wrap"
									data-test-id="error-page--Flex-0"
								>
									<Button
										variant="contained"
										onClick={() => {
											navigate(routes.home.rootPath);
										}}
										sx={{ flex: "1 1 160px", minWidth: 0 }}
										data-test-id="error-page--Button-home"
									>
										Домой
									</Button>
									<Button
										variant="outlined"
										onClick={() => {
											window.location.reload();
										}}
										sx={{ flex: "1 1 160px", minWidth: 0 }}
										data-test-id="error-page--Button-reload"
									>
										Перезагрузить страницу
									</Button>
								</Flex>
							</Flex>
						</Card>
					</Flex>
				</Flex>
			</Flex>
		</MainLayout>
	);
};
