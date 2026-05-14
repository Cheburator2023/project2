import Box from "@mui/material/Box";
import { Outlet } from "react-router";

export function AdminLayout() {
	return (
		<Box
			sx={{
				flex: 1,
				minWidth: 0,
				minHeight: 0,
				display: "flex",
				flexDirection: "column",
				overflow: "auto",
			}}
		>
			<Outlet />
		</Box>
	);
}
