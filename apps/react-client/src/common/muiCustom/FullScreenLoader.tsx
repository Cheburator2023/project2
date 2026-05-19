import { CircularProgress } from "@mui/material";
import { FullscreenWrapper } from "@react-client/common/muiCustom/FullscreenWrapper";

export const FullScreenLoader = () => {
	return (
		<FullscreenWrapper>
			<CircularProgress color="info" />
		</FullscreenWrapper>
	);
};
