import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { useLogoutOverlayOpen } from "@react-client/common/auth/logoutOverlayState";
import { createPortal } from "react-dom";

const OVERLAY_Z_INDEX = 2_147_483_640;

/** Глобальный оверлей выхода — portal в body, поверх nav/drawer/loaders. */
export function LogoutOverlay() {
	const open = useLogoutOverlayOpen();
	if (typeof document === "undefined") return null;

	return createPortal(
		<Backdrop
			open={open}
			transitionDuration={0}
			appear={false}
			sx={{
				position: "fixed",
				inset: 0,
				zIndex: OVERLAY_Z_INDEX,
				color: "common.white",
				flexDirection: "column",
				gap: 2,
				backgroundColor: "rgba(15, 18, 24, 0.55)",
				backdropFilter: "blur(10px)",
				WebkitBackdropFilter: "blur(10px)",
			}}
			data-test-id="logout-overlay"
		>
			<CircularProgress color="inherit" size={40} />
			<Typography variant="body1">Выход из системы…</Typography>
		</Backdrop>,
		document.body,
	);
}
