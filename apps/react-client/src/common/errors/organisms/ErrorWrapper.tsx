import { Typography, useTheme } from "@mui/material";
import { Card } from "@react-client/common/muiCustom/Card";
import { Flex } from "@react-client/common/primitives/Flex";
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
	const _theme = useTheme();

	return (
		<Flex
			width="100%"
			justifyContent="center"
			alignItems="center"
			flexDirection="column"
			height="100%"
			data-test-id="error-wrapper--Flex-0"
		>
			<Flex style={{ maxWidth: "820px" }} data-test-id="error-wrapper--Flex-1">
				<Card padding="20px" data-test-id="error-wrapper--Flex-2">
					<Flex
						flexDirection="column"
						justifyContent="center"
						alignItems="center"
					>
						{children || (
							<>
								{icon}
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

								{content}
							</>
						)}
					</Flex>
				</Card>
			</Flex>
		</Flex>
	);
};
