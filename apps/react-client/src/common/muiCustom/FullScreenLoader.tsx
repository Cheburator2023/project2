import { CircularProgress } from "@mui/material";
import { FullscreenWrapper } from "@react-client/common/muiCustom/FullscreenWrapper";

export const FullScreenLoader = ({
	height = "inherit",
}: {
	height?: string;
}) => {
	return (
		<FullscreenWrapper height={height}>
			<CircularProgress color="info" />
		</FullscreenWrapper>
	);
};
