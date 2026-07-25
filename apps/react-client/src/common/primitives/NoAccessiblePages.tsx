import BlockIcon from "@mui/icons-material/Block";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { performMfeLogout } from "@react-client/common/auth/syncMfeAuth";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { useGlobalSettingsStore } from "@react-client/common/store/globalSettingsStore";
import type { MainLayoutOutletContext } from "@react-client/common/layouts/mainLayoutOutletContext";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";

type NoAccessiblePagesProps = {
	onLogout?: () => void;
};

/** Заглушка, когда у пользователя нет ни одной доступной страницы (матрица F-05). */
export const NoAccessiblePages = ({ onLogout }: NoAccessiblePagesProps = {}) => {
	const outlet = useOutletContext<MainLayoutOutletContext | undefined>();
	const setSideMenuVisible = useGlobalSettingsStore(
		(s) => s.setSideMenuVisible,
	);
	const [loggingOut, setLoggingOut] = useState(false);

	useEffect(() => {
		/** Сайдменю могло остаться закрытым в localStorage — открываем, чтобы был доступ к профилю. */
		setSideMenuVisible(true);
	}, [setSideMenuVisible]);

	const handleLogout = () => {
		if (loggingOut) return;
		setLoggingOut(true);
		const logout = onLogout ?? outlet?.onLogout;
		if (logout) {
			logout();
			return;
		}
		performMfeLogout();
	};

	return (
		<div>
			<Header title="Нет доступа" />
			<Flex
				flexDirection="column"
				alignItems="center"
				justifyContent="center"
				minHeight="70vh"
				gap={8}
			>
				<BlockIcon color="disabled" sx={{ fontSize: 64 }} />
				<Spacer space={8} />
				<Typography variant="h6" color="text.secondary" gutterBottom>
					Для вас нет доступных страниц в приложении
				</Typography>
				<Typography
					variant="body2"
					color="text.secondary"
					sx={{ mb: 2, textAlign: "center", maxWidth: 420 }}
				>
					Обратитесь к администратору для получения доступа. Чтобы сменить
					учётную запись — выйдите из системы.
				</Typography>
				<Button
					variant="contained"
					color="primary"
					startIcon={
						loggingOut ? (
							<CircularProgress size={18} color="inherit" />
						) : (
							<LogoutRoundedIcon />
						)
					}
					disabled={loggingOut}
					onClick={handleLogout}
					data-test-id="no-accessible-pages--logout"
				>
					{loggingOut ? "Выход…" : "Выйти"}
				</Button>
			</Flex>
		</div>
	);
};
