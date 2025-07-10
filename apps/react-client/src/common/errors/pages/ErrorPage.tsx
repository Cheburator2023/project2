import { Alert, Button, Typography } from "@mui/material";
import { ILL_BUG } from "@react-client/common/illustrations/ILL_BUG";
import { MainLayout } from "@react-client/common/layouts/MainLayout";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { Header } from "@react-client/features/navigation/organisms/Header";
import { routes } from "@react-client/routing/routes";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { ErrorWrapper } from "../organisms/ErrorWrapper";

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

	const stack = (props?.errorStack as string)?.split(" at ") || [];

	return (
		<MainLayout>
			<div>
				<Header title="Ошибка" />
				<ErrorWrapper
					heading=""
					text=""
					content={
						<>
							<ILL_BUG data-test-id="error-page--ILL_BUG-0" />
							<Spacer data-test-id="error-page--Spacer-0" />
							<Flex sx={{ height: 300, overflow: "auto", display: "block" }}>
								<Alert severity="error" data-test-id="error-page--Alert-0">
									<Typography
										variant="body1"
										data-test-id="error-page--Typography-0"
									>
										{props?.error}
									</Typography>
									<Spacer data-test-id="error-page--Spacer-1" />
									<Typography
										variant="body2"
										data-test-id="error-page--Typography-1"
									>
										{stack.map((str, idx) => {
											return (
												<span key={idx} data-test-id="error-page--span-0">
													{"->"} {str}
												</span>
											);
										})}
									</Typography>
								</Alert>
							</Flex>

							<Spacer data-test-id="error-page--Spacer-2" />

							<Flex
								width="100%"
								alignItems="center"
								gap={8}
								data-test-id="error-page--Flex-0"
							>
								<Button
									variant="contained"
									onClick={() => {
										navigate(routes.home.rootPath);
									}}
									fullWidth
									data-test-id="error-page--Button-0"
								>
									Домой
								</Button>
								<Button
									variant="contained"
									onClick={() => {
										window.location.reload();
									}}
									fullWidth
									data-test-id="error-page--Button-0"
								>
									Перезагрузить страницу
								</Button>
							</Flex>
						</>
					}
					data-test-id="error-page--ErrorWrapper-0"
				/>
			</div>
		</MainLayout>
	);
};
