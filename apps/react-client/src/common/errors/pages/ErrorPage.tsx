import { Alert, Button, Typography } from "@mui/material";

import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { routes } from "@react-client/routing/routes";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { ErrorWrapper } from "../organisms/ErrorWrapper";

const IS_DEV = process.env.NODE_ENV === "development";

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
		<ErrorWrapper
			heading="Произошла ошибка"
			text={""}
			content={
				<>
					{IS_DEV && (
						<Alert severity="error">
							<Typography variant="body1">{props?.error}</Typography>
							<Spacer />
							<Typography variant="body2">
								{stack.map((str, idx) => {
									return (
										<span key={idx}>
											{"->"} {str}
										</span>
									);
								})}
							</Typography>
						</Alert>
					)}

					<Spacer />

					<Flex width="100%" alignItems="center">
						<Button
							variant="contained"
							onClick={() => {
								navigate(routes.home.rootPath);
							}}
							fullWidth
						>
							Домой
						</Button>
					</Flex>
				</>
			}
		/>
	);
};
