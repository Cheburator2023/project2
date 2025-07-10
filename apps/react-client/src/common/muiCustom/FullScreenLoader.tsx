import { CircularProgress } from "@mui/material";
import { FullscreenWrapper } from "@react-client/common/muiCustom/FullscreenWrapper";

interface FullScreenLoaderProps {
	text?: string;
}

export const FullScreenLoader = (_props: FullScreenLoaderProps) => {
	return (
		<FullscreenWrapper>
			<CircularProgress color="info" />
		</FullscreenWrapper>
	);
};
