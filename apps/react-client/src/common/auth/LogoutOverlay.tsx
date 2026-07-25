import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { useLogoutOverlayOpen } from "@react-client/common/auth/logoutOverlayState";

/** Глобальный оверлей выхода (blur) — живёт в App, не зависит от меню. */
export function LogoutOverlay() {
	const open = useLogoutOverlayOpen();
	return (
		<Backdrop
			open={open}
			sx={{
				zIndex: (theme) => theme.zIndex.modal + 100,
				color: "common.white",
				flexDirection: "column",
				gap: 2,
				backgroundColor: "rgba(15, 18, 24, 0.45)",
				backdropFilter: "blur(10px)",
				WebkitBackdropFilter: "blur(10px)",
			}}
			data-test-id="logout-overlay"
		>
			<CircularProgress color="inherit" size={40} />
			<Typography variant="body1">Выход из системы…</Typography>
		</Backdrop>
	);
}
