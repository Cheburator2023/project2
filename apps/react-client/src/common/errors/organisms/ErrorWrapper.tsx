import { Typography, useTheme } from "@mui/material";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import type React from "react";

type Props = {
	heading?: string;
	icon?: React.ReactNode;
	content?: React.ReactNode;
	text?: React.ReactNode;
	withEmailCopy?: boolean;
	children?: React.ReactNode;
};

export const ErrorWrapper: React.FC<Props> = ({
	children,
	heading,
	icon,
	content,
	text,
	withEmailCopy,
}) => {
	const theme = useTheme();

	return (
		<Flex
			width="100%"
			justifyContent="center"
			alignItems="center"
			flexDirection="column"
			height="100%"
			data-test-id="error-wrapper--Flex-0"
		>
			<Spacer
				space={100}
				mobSpace={20}
				data-test-id="error-wrapper--Spacer-0"
			/>
			<Flex style={{ maxWidth: "720px" }} data-test-id="error-wrapper--Flex-1">
				<Flex
					flexDirection="column"
					alignItems="center"
					justifyContent="center"
					sx={{
						padding: "64px",
						borderRadius: "82px",
						backgroundColor: theme.palette.background.paper,
					}}
					data-test-id="error-wrapper--Flex-2"
				>
					{children || (
						<>
							{icon}

							<Spacer height={24} data-test-id="error-wrapper--Spacer-1" />

							<Typography
								variant="h3"
								align="center"
								data-test-id="error-wrapper--Typography-0"
							>
								<b data-test-id="error-wrapper--b-0">{heading}</b>
							</Typography>

							<Typography
								variant="h6"
								align="center"
								sx={{ fontWeight: "400" }}
								data-test-id="error-wrapper--Typography-1"
							>
								{text}
							</Typography>

							<Spacer height={22} data-test-id="error-wrapper--Spacer-2" />
							{content}
						</>
					)}
				</Flex>
			</Flex>
		</Flex>
	);
};
