import { CircularProgress, Typography } from "@mui/material";
import { FullscreenWrapper } from "@react-client/common/muiCustom/FullscreenWrapper";

interface FullScreenLoaderProps {
	text?: string;
}

export const FullScreenLoader = (props: FullScreenLoaderProps) => {
	return (
		<FullscreenWrapper>
			<CircularProgress color="secondary" />
			<Typography>{props.text}</Typography>
		</FullscreenWrapper>
	);
};
