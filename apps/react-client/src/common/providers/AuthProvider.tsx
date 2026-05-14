import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";

interface AuthProviderProps {
	children: React.ReactNode;
	godMode?: boolean;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
	children,
	godMode: propGodMode,
}) => {
	const setAccessToken = useAuthStore((state) => state.setAccessToken);
	const GOD_MODE = process?.env?.NO_ROLES === "true" || propGodMode;

	useEffect(() => {
		if (GOD_MODE) {
			setAccessToken("god-mode-token");
		}
	}, [GOD_MODE, setAccessToken]);

	if (GOD_MODE) return <>{children}</>;
	return children;
};
