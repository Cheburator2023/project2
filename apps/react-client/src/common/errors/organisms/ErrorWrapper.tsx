import { Typography, useTheme } from "@mui/material";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import React from "react";

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
		>
			<Spacer space={100} mobSpace={20} />
			<Flex style={{ maxWidth: "720px" }}>
				<Flex
					flexDirection="column"
					alignItems="center"
					justifyContent="center"
					sx={{
						padding: "64px",
						borderRadius: "82px",
						backgroundColor: theme.palette.background.paper,
					}}
				>
					{children || (
						<>
							{icon}

							<Spacer height={24} />

							<Typography variant="h3" align="center">
								<b>{heading}</b>
							</Typography>

							<Typography
								variant="h6"
								align="center"
								sx={{ fontWeight: "400" }}
							>
								{text}
							</Typography>

							<Spacer height={22} />
							{content}
						</>
					)}
				</Flex>
			</Flex>
		</Flex>
	);
};
